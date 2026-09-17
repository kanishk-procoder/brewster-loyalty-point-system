from fastapi import APIRouter, HTTPException, status, Depends
from app.db import get_db
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.schemas import UserRegister, UserLogin, TokenResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegister):
    with get_db() as conn:
        cursor = conn.execute("SELECT id FROM users WHERE email = ?", (req.email.lower(),))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists."
            )

        role = req.role.upper() if req.role else "STAFF"
        if role not in ("STAFF", "CUSTOMER"):
            role = "STAFF"

        member_id = None
        # If customer registers with a phone, link or create member record
        if role == "CUSTOMER" and req.phone:
            clean_phone = req.phone.strip()
            m_cursor = conn.execute("SELECT id FROM members WHERE phone = ? OR phone_number = ?", (clean_phone, clean_phone))
            m_row = m_cursor.fetchone()
            if m_row:
                member_id = m_row["id"]
            else:
                # Auto-create member record for customer
                m_ins = conn.execute(
                    """
                    INSERT INTO members (name, country_code, phone_number, phone, points_balance, lifetime_points, lifetime_spend_paise, tier)
                    VALUES (?, '+91', ?, ?, 0, 0, 0, 'REGULAR')
                    """,
                    (req.name.strip(), clean_phone, f"+91{clean_phone}")
                )
                member_id = m_ins.lastrowid

        hashed = hash_password(req.password)
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash, role, member_id) VALUES (?, ?, ?, ?, ?)",
            (req.name.strip(), req.email.lower(), hashed, role, member_id)
        )
        user_id = cursor.lastrowid

        cursor = conn.execute("SELECT id, name, email, role, member_id, created_at FROM users WHERE id = ?", (user_id,))
        user = dict(cursor.fetchone())

        token = create_access_token({"sub": str(user_id), "email": user["email"], "role": user["role"]})
        return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/login", response_model=TokenResponse)
def login(req: UserLogin):
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT id, name, email, password_hash, role, member_id, created_at FROM users WHERE email = ?",
            (req.email.lower(),)
        )
        user = cursor.fetchone()
        if not user or not verify_password(req.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        user_dict = {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "member_id": user["member_id"],
            "created_at": user["created_at"],
        }
        token = create_access_token({"sub": str(user["id"]), "email": user["email"], "role": user["role"]})
        return {"access_token": token, "token_type": "bearer", "user": user_dict}

@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
