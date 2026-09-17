import math
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status, Depends
from app.db import get_db
from app.schemas import (
    MemberCreate,
    MemberUpdate,
    MemberOut,
    MemberListResponse,
    PurchaseRequest,
    RedemptionRequest,
    ActionResponse,
    TransactionListResponse,
    TransactionOut,
    ReceiptOut,
)
from app.services.points import (
    record_purchase,
    redeem_points,
    MemberNotFoundError,
    InvalidAmountError,
    InvalidPointsError,
    InsufficientBalanceError,
)
from app.config import CAFE_NAME, CAFE_BRANCH, POINTS_PER_RUPEE_REDEMPTION

router = APIRouter(prefix="/api/members", tags=["members"])

ALLOWED_SORT_FIELDS = {
    "name": "name",
    "phone": "phone",
    "phone_number": "phone_number",
    "points_balance": "points_balance",
    "lifetime_points": "lifetime_points",
    "lifetime_spend_paise": "lifetime_spend_paise",
    "tier": "tier",
    "created_at": "created_at",
}

@router.post("", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def create_member(req: MemberCreate):
    full_phone = f"{req.country_code}{req.phone_number}"

    with get_db() as conn:
        cursor = conn.execute("SELECT id FROM members WHERE phone = ?", (full_phone,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A member with phone number '{full_phone}' already exists."
            )

        cursor = conn.execute(
            """
            INSERT INTO members
                (name, country_code, phone_number, phone, points_balance, lifetime_points, lifetime_spend_paise, tier)
            VALUES (?, ?, ?, ?, 0, 0, 0, 'REGULAR')
            """,
            (req.name.strip(), req.country_code, req.phone_number, full_phone)
        )
        member_id = cursor.lastrowid

        cursor = conn.execute("SELECT * FROM members WHERE id = ?", (member_id,))
        return dict(cursor.fetchone())


@router.get("", response_model=MemberListResponse)
def list_members(
    query: Optional[str] = Query(None, description="Search query matching phone, local number, or name"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
):
    sort_column = ALLOWED_SORT_FIELDS.get(sort, "created_at")
    sort_direction = "ASC" if order.lower() == "asc" else "DESC"

    with get_db() as conn:
        where_clauses = []
        params = []

        if query and query.strip():
            clean_q = query.strip()
            where_clauses.append("(name LIKE ? OR phone LIKE ? OR phone_number LIKE ?)")
            params.extend([f"%{clean_q}%", f"%{clean_q}%", f"%{clean_q}%"])

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        count_cursor = conn.execute(f"SELECT COUNT(*) as total FROM members {where_sql}", params)
        total = count_cursor.fetchone()["total"]

        offset = (page - 1) * limit
        sql = f"""
            SELECT * FROM members
            {where_sql}
            ORDER BY {sort_column} {sort_direction}
            LIMIT ? OFFSET ?
        """
        params.extend([limit, offset])

        cursor = conn.execute(sql, params)
        items = [dict(row) for row in cursor.fetchall()]
        total_pages = math.ceil(total / limit) if total > 0 else 1

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
        }


@router.get("/{member_id}", response_model=MemberOut)
def get_member(member_id: int):
    with get_db() as conn:
        cursor = conn.execute("SELECT * FROM members WHERE id = ?", (member_id,))
        member = cursor.fetchone()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Member with id {member_id} not found."
            )
        return dict(member)


@router.put("/{member_id}", response_model=MemberOut)
def update_member(member_id: int, req: MemberUpdate):
    with get_db() as conn:
        cursor = conn.execute("SELECT * FROM members WHERE id = ?", (member_id,))
        member = cursor.fetchone()
        if not member:
            raise HTTPException(status_code=404, detail="Member not found.")

        updates = []
        params = []
        if req.name is not None:
            updates.append("name = ?")
            params.append(req.name.strip())

        new_cc = req.country_code or member["country_code"]
        new_pn = req.phone_number or member["phone_number"]

        if req.country_code is not None or req.phone_number is not None:
            new_full = f"{new_cc}{new_pn}"
            check_cursor = conn.execute("SELECT id FROM members WHERE phone = ? AND id != ?", (new_full, member_id))
            if check_cursor.fetchone():
                raise HTTPException(status_code=400, detail="Phone number already in use by another member.")
            updates.extend(["country_code = ?", "phone_number = ?", "phone = ?"])
            params.extend([new_cc, new_pn, new_full])

        if updates:
            params.append(member_id)
            conn.execute(f"UPDATE members SET {', '.join(updates)} WHERE id = ?", params)

        cursor = conn.execute("SELECT * FROM members WHERE id = ?", (member_id,))
        return dict(cursor.fetchone())


@router.post("/{member_id}/purchases", response_model=ActionResponse)
def record_member_purchase(member_id: int, req: PurchaseRequest):
    with get_db() as conn:
        try:
            result = record_purchase(conn, member_id, req.amount_paise)
            return result
        except MemberNotFoundError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except InvalidAmountError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{member_id}/redemptions", response_model=ActionResponse)
def redeem_member_points(member_id: int, req: RedemptionRequest):
    with get_db() as conn:
        try:
            result = redeem_points(conn, member_id, req.points, req.free_item_name)
            return result
        except MemberNotFoundError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        except InvalidPointsError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except InsufficientBalanceError as e:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/{member_id}/transactions", response_model=TransactionListResponse)
def get_member_transactions(
    member_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    with get_db() as conn:
        m_cursor = conn.execute("SELECT id FROM members WHERE id = ?", (member_id,))
        if not m_cursor.fetchone():
            raise HTTPException(status_code=404, detail="Member not found.")

        count_cursor = conn.execute(
            "SELECT COUNT(*) as total FROM point_transactions WHERE member_id = ?",
            (member_id,)
        )
        total = count_cursor.fetchone()["total"]

        offset = (page - 1) * limit
        cursor = conn.execute(
            """
            SELECT * FROM point_transactions
            WHERE member_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT ? OFFSET ?
            """,
            (member_id, limit, offset)
        )
        items = [dict(row) for row in cursor.fetchall()]
        total_pages = math.ceil(total / limit) if total > 0 else 1

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
        }
