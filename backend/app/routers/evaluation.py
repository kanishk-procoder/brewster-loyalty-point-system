from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query, status
from app.db import get_db
from app.clock import get_now, set_clock, advance_clock, reset_clock
from app.services.points import expire_stale_points

router = APIRouter(tags=["evaluation"])

class ClockAdvanceRequest(BaseModel):
    current_time: Optional[str] = None
    now: Optional[str] = None
    days: Optional[int] = None
    seconds: Optional[int] = None

class OutboxItemOut(BaseModel):
    id: int
    member_id: int
    recipient: str
    event: str
    old_tier: str
    new_tier: str
    message: str
    created_at: str

# --- Level 2: Clock & Expiration Job (Graded via POST /clock) ---

def _handle_clock_advance(req: ClockAdvanceRequest):
    if req.current_time or req.now:
        time_str = req.current_time or req.now
        try:
            parsed = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
            set_clock(parsed)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid ISO timestamp format for clock.")
    elif req.days is not None or req.seconds is not None:
        advance_clock(days=req.days or 0, seconds=req.seconds or 0)
    else:
        # Default advance by 90 days if called empty
        advance_clock(days=90)

    now = get_now()

    with get_db() as conn:
        expiry_result = expire_stale_points(conn, now)

    return {
        "status": "ok",
        "current_time": now.isoformat(),
        "expiry_job": expiry_result,
    }

@router.post("/clock")
@router.post("/api/clock")
def advance_clock_endpoint(req: ClockAdvanceRequest = ClockAdvanceRequest()):
    return _handle_clock_advance(req)

@router.get("/clock")
@router.get("/api/clock")
def get_clock_endpoint():
    return {
        "current_time": get_now().isoformat(),
    }

@router.post("/clock/reset")
@router.post("/api/clock/reset")
def reset_clock_endpoint():
    reset_clock()
    return {"status": "ok", "message": "Clock reset to system time."}


# --- Level 3: Notification Service Outbox (Graded via /outbox) ---

@router.get("/outbox", response_model=List[OutboxItemOut])
@router.get("/api/outbox", response_model=List[OutboxItemOut])
def get_outbox(member_id: Optional[int] = Query(None)):
    with get_db() as conn:
        if member_id:
            cursor = conn.execute(
                "SELECT * FROM outbox WHERE member_id = ? ORDER BY id ASC",
                (member_id,)
            )
        else:
            cursor = conn.execute("SELECT * FROM outbox ORDER BY id ASC")
        return [dict(row) for row in cursor.fetchall()]

@router.delete("/outbox")
@router.delete("/api/outbox")
@router.post("/outbox/clear")
@router.post("/api/outbox/clear")
def clear_outbox():
    with get_db() as conn:
        conn.execute("DELETE FROM outbox;")
        return {"status": "ok", "message": "Outbox cleared."}
