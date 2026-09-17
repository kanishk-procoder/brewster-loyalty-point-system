from fastapi import APIRouter, HTTPException, Depends, status
from app.db import get_db
from app.auth import get_current_user
from app.schemas import CustomerWalletOut, RedemptionRequest, ActionResponse
from app.services.points import redeem_points, InsufficientBalanceError, InvalidPointsError
from app.config import REWARD_CATALOG, POINTS_PER_RUPEE_REDEMPTION

router = APIRouter(prefix="/api/customer", tags=["customer"])

@router.get("/wallet", response_model=CustomerWalletOut)
def get_customer_wallet(current_user: dict = Depends(get_current_user)):
    member_id = current_user.get("member_id")
    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No customer loyalty profile linked to this user account."
        )

    with get_db() as conn:
        m_cursor = conn.execute("SELECT * FROM members WHERE id = ?", (member_id,))
        member = m_cursor.fetchone()
        if not member:
            raise HTTPException(status_code=404, detail="Member profile not found.")

        member_dict = dict(member)
        current_balance = member_dict["points_balance"]

        # Annotate catalog items with eligibility
        rewards_with_status = []
        for item in REWARD_CATALOG:
            rewards_with_status.append({
                **item,
                "can_redeem": current_balance >= item["points_required"],
                "points_short": max(0, item["points_required"] - current_balance),
            })

        # Recent transactions
        tx_cursor = conn.execute(
            """
            SELECT * FROM point_transactions
            WHERE member_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 10
            """,
            (member_id,)
        )
        transactions = [dict(r) for r in tx_cursor.fetchall()]

        return {
            "member": member_dict,
            "available_rewards": rewards_with_status,
            "recent_transactions": transactions,
        }

@router.post("/redeem", response_model=ActionResponse)
def customer_self_redeem(req: RedemptionRequest, current_user: dict = Depends(get_current_user)):
    member_id = current_user.get("member_id")
    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only customer accounts linked to a rewards membership can redeem from the wallet."
        )

    with get_db() as conn:
        try:
            result = redeem_points(conn, member_id, req.points, req.free_item_name)
            return result
        except InvalidPointsError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except InsufficientBalanceError as e:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@router.get("/catalog")
def get_reward_catalog():
    return {
        "conversion_rule": f"{POINTS_PER_RUPEE_REDEMPTION} points = ₹1 free item value",
        "items": REWARD_CATALOG
    }
