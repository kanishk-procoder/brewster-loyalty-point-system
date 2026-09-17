from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, field_validator
import re

# --- Auth Schemas ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field("STAFF", description="STAFF or CUSTOMER")
    phone: Optional[str] = None  # Needed for Customer registration to link member

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    member_id: Optional[int] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# --- Member Schemas ---
class MemberCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    country_code: str = Field("+91", min_length=2, max_length=6)
    phone_number: str = Field(..., min_length=5, max_length=20)

    @field_validator("country_code")
    @classmethod
    def clean_country_code(cls, v: str) -> str:
        clean = re.sub(r"[^\+\d]", "", v)
        if not clean.startswith("+"):
            clean = "+" + clean
        return clean

    @field_validator("phone_number")
    @classmethod
    def clean_phone_number(cls, v: str) -> str:
        clean = re.sub(r"[\s\-\(\)]", "", v)
        if not clean:
            raise ValueError("Invalid phone number.")
        return clean

class MemberUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    country_code: Optional[str] = None
    phone_number: Optional[str] = None

class MemberOut(BaseModel):
    id: int
    name: str
    country_code: str
    phone_number: str
    phone: str
    points_balance: int
    lifetime_points: int
    lifetime_spend_paise: int
    tier: str
    created_at: str

class MemberListResponse(BaseModel):
    items: List[MemberOut]
    total: int
    page: int
    limit: int
    total_pages: int


# --- Transaction & Receipt Schemas ---
class PurchaseRequest(BaseModel):
    amount_paise: int = Field(..., gt=0, description="Purchase amount in paise (e.g. ₹250.00 = 25000)")

class RedemptionRequest(BaseModel):
    points: int = Field(..., gt=0, description="Positive integer points to redeem")
    free_item_name: Optional[str] = Field(None, description="Name of free item being claimed")

class TransactionOut(BaseModel):
    id: int
    member_id: int
    receipt_number: str
    type: str
    amount_paise: Optional[int] = None
    free_item_name: Optional[str] = None
    free_item_value_paise: Optional[int] = None
    points_delta: int
    balance_after: int
    tier_at_transaction: str
    created_at: str

class ReceiptOut(BaseModel):
    receipt_number: str
    cafe_name: str
    branch: str
    date: str
    customer_name: str
    phone: str
    amount_paid_inr: Optional[float] = None
    points_earned: Optional[int] = None
    tier_applied: Optional[str] = None
    new_tier: Optional[str] = None
    free_item: Optional[str] = None
    points_redeemed: Optional[int] = None
    free_item_value_inr: Optional[float] = None
    points_earned_on_redemption: Optional[int] = None
    live_points_balance: int

class ActionResponse(BaseModel):
    member: MemberOut
    transaction: TransactionOut
    receipt: ReceiptOut
    tier_upgraded: bool = False
    upgrade_notification: Optional[Dict[str, Any]] = None

class TransactionListResponse(BaseModel):
    items: List[TransactionOut]
    total: int
    page: int
    limit: int
    total_pages: int


# --- Customer App Schemas ---
class CustomerWalletOut(BaseModel):
    member: MemberOut
    available_rewards: List[dict]
    recent_transactions: List[TransactionOut]


# --- Dashboard Schemas ---
class DashboardStats(BaseModel):
    total_members: int
    regular_count: int
    silver_count: int
    gold_count: int
    total_points_issued: int
    total_points_redeemed: int
    total_revenue_inr: float
    recent_transactions: List[TransactionOut]
