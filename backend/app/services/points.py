import math
import sqlite3
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from app.clock import get_now
from app.config import (
    BASE_PAISE_PER_POINT,
    TIERS,
    PLATINUM_RATE,
    POINTS_EXPIRY_DAYS,
    POINTS_PER_RUPEE_REDEMPTION,
    CAFE_NAME,
    CAFE_BRANCH,
)

class PointsServiceError(Exception):
    """Base exception for points service."""
    pass

class MemberNotFoundError(PointsServiceError):
    """Raised when member is not found."""
    pass

class InvalidAmountError(PointsServiceError):
    """Raised when purchase amount is zero or negative or not an integer."""
    pass

class InvalidPointsError(PointsServiceError):
    """Raised when redemption points is zero or negative or not an integer."""
    pass

class InsufficientBalanceError(PointsServiceError):
    """Raised when redemption points exceed available balance."""
    def __init__(self, message: str, current_balance: int, requested_points: int):
        super().__init__(message)
        self.current_balance = current_balance
        self.requested_points = requested_points


def round_half_up(val: float) -> int:
    """Standard rounding tie-break: .5 and above rounds upward."""
    return math.floor(val + 0.5)


def calculate_tier(lifetime_spend_paise: int, lifetime_points: int = 0, current_tier: str = "REGULAR") -> str:
    """
    Tier calculation incorporating Level 1 twist:
    - Top tier PLATINUM (lifetime >= 5000 points or >= ₹50,000 spend, earns 0.3/₹).
    - Existing members are unchanged unless they now qualify for PLATINUM.
    - Silver: >= ₹5,000 spend (or >= 500 points)
    - Gold: >= ₹15,000 spend (or >= 1,500 points)
    """
    spend_inr = lifetime_spend_paise // 100

    # Top tier PLATINUM check: lifetime >= 5000 points / ₹50,000 spend
    if lifetime_points >= 5000 or spend_inr >= 50000:
        return "PLATINUM"

    # Backward-compatible baseline tiers:
    if spend_inr >= 15000 or lifetime_points >= 1500:
        return "GOLD"
    if spend_inr >= 5000 or lifetime_points >= 500:
        return "SILVER"

    return current_tier if current_tier in ("SILVER", "GOLD", "PLATINUM") else "REGULAR"


def calculate_earned_points(amount_paise: int, tier: str) -> int:
    """
    Calculate points earned at given tier with round half-up tie rule.
    - Regular: 1.0 pt / ₹10 (0.10/₹)
    - Silver: 1.5 pts / ₹10 (0.15/₹)
    - Gold: 2.0 pts / ₹10 (0.20/₹)
    - Platinum: 3.0 pts / ₹10 (0.30/₹ -> 0.3/₹ per Level 1 twist)
    """
    if not isinstance(amount_paise, int) or amount_paise <= 0:
        raise InvalidAmountError("Purchase amount must be a positive integer in paise.")

    if tier not in TIERS:
        tier = "REGULAR"

    rate = TIERS[tier]["rate"]
    raw_points = (amount_paise / BASE_PAISE_PER_POINT) * rate
    return round_half_up(raw_points)


def generate_receipt_number(prefix: str = "RCP") -> str:
    """Generate unique receipt identifier."""
    now_str = datetime.now().strftime("%y%m%d")
    rand_seq = random.randint(1000, 9999)
    return f"{prefix}-{now_str}-{rand_seq}"


def record_purchase(
    conn: sqlite3.Connection,
    member_id: int,
    amount_paise: int
) -> Dict[str, Any]:
    """
    Atomic purchase recording using BEGIN IMMEDIATE.
    - Applies current tier rate before this purchase.
    - Evaluates tier upgrade for next purchase (including PLATINUM).
    - If tier crosses into new tier, sends notification to outbox (Level 3 twist).
    - Unredeemed points tracked for 90-day expiry (Level 2 twist).
    """
    if not isinstance(amount_paise, int) or amount_paise <= 0:
        raise InvalidAmountError("Purchase amount must be a positive integer in paise.")

    try:
        conn.execute("BEGIN IMMEDIATE;")

        cursor = conn.execute(
            """
            SELECT id, name, country_code, phone_number, phone, points_balance,
                   lifetime_points, lifetime_spend_paise, tier, created_at
            FROM members WHERE id = ?
            """,
            (member_id,)
        )
        member = cursor.fetchone()
        if not member:
            conn.execute("ROLLBACK;")
            raise MemberNotFoundError(f"Member with id {member_id} not found.")

        current_balance = member["points_balance"]
        current_lifetime_pts = member["lifetime_points"]
        current_spend = member["lifetime_spend_paise"]
        current_tier = member["tier"]

        # 1. Calculate earned points at current tier
        earned_points = calculate_earned_points(amount_paise, current_tier)

        new_balance = current_balance + earned_points
        new_lifetime_pts = current_lifetime_pts + earned_points
        new_spend = current_spend + amount_paise
        new_tier = calculate_tier(new_spend, new_lifetime_pts, current_tier)

        now_iso = get_now().strftime("%Y-%m-%d %H:%M:%S")

        conn.execute(
            """
            UPDATE members
            SET points_balance = ?, lifetime_points = ?, lifetime_spend_paise = ?, tier = ?, last_activity_at = ?
            WHERE id = ?
            """,
            (new_balance, new_lifetime_pts, new_spend, new_tier, now_iso, member_id)
        )

        receipt_no = generate_receipt_number("RCP")

        cursor = conn.execute(
            """
            INSERT INTO point_transactions
                (member_id, receipt_number, type, amount_paise, free_item_name,
                 free_item_value_paise, points_delta, unredeemed_points, balance_after, tier_at_transaction, created_at)
            VALUES (?, ?, 'EARN', ?, NULL, NULL, ?, ?, ?, ?, ?)
            """,
            (member_id, receipt_no, amount_paise, earned_points, earned_points, new_balance, current_tier, now_iso)
        )
        tx_id = cursor.lastrowid

        # Level 3 Twist: If member crossed into a new tier, notify via Outbox
        tier_upgraded = (new_tier != current_tier)
        upgrade_notification = None
        if tier_upgraded:
            msg = (
                f"Congratulations {member['name']}! You have achieved {new_tier} tier at {CAFE_NAME}. "
                f"Enjoy our top tier benefits and faster earning!"
            )
            conn.execute(
                """
                INSERT INTO outbox (member_id, recipient, event, old_tier, new_tier, message, created_at)
                VALUES (?, ?, 'TIER_UPGRADE', ?, ?, ?, ?)
                """,
                (member_id, member["phone"], current_tier, new_tier, msg, now_iso)
            )
            upgrade_notification = {
                "event": "TIER_UPGRADE",
                "member_id": member_id,
                "recipient": member["phone"],
                "member_name": member["name"],
                "old_tier": current_tier,
                "new_tier": new_tier,
                "message": msg,
            }

        updated_member = dict(conn.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone())
        created_tx = dict(conn.execute("SELECT * FROM point_transactions WHERE id = ?", (tx_id,)).fetchone())

        conn.execute("COMMIT;")

        receipt = {
            "receipt_number": receipt_no,
            "cafe_name": CAFE_NAME,
            "branch": CAFE_BRANCH,
            "date": created_tx["created_at"],
            "customer_name": member["name"],
            "phone": member["phone"],
            "amount_paid_inr": amount_paise / 100,
            "points_earned": earned_points,
            "tier_applied": current_tier,
            "new_tier": new_tier,
            "live_points_balance": new_balance,
        }

        return {
            "member": updated_member,
            "transaction": created_tx,
            "receipt": receipt,
            "tier_upgraded": tier_upgraded,
            "upgrade_notification": upgrade_notification,
        }
    except Exception:
        try:
            conn.execute("ROLLBACK;")
        except sqlite3.OperationalError:
            pass
        raise


def redeem_points(
    conn: sqlite3.Connection,
    member_id: int,
    points: int,
    free_item_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Atomic point redemption using BEGIN IMMEDIATE.
    - Deducts from points_balance and FIFO unredeemed purchase points.
    - Awards 0 points.
    - Never reduces lifetime spend or demotes tier.
    """
    if not isinstance(points, int) or points <= 0:
        raise InvalidPointsError("Points to redeem must be a positive integer.")

    try:
        conn.execute("BEGIN IMMEDIATE;")

        cursor = conn.execute(
            """
            SELECT id, name, country_code, phone_number, phone, points_balance,
                   lifetime_points, lifetime_spend_paise, tier, created_at
            FROM members WHERE id = ?
            """,
            (member_id,)
        )
        member = cursor.fetchone()
        if not member:
            conn.execute("ROLLBACK;")
            raise MemberNotFoundError(f"Member with id {member_id} not found.")

        current_balance = member["points_balance"]
        current_tier = member["tier"]

        if points > current_balance:
            conn.execute("ROLLBACK;")
            raise InsufficientBalanceError(
                f"Cannot redeem {points} points. Available balance is {current_balance}.",
                current_balance=current_balance,
                requested_points=points
            )

        new_balance = current_balance - points
        free_item_value_paise = points * (100 // POINTS_PER_RUPEE_REDEMPTION)

        now_iso = get_now().strftime("%Y-%m-%d %H:%M:%S")

        conn.execute(
            "UPDATE members SET points_balance = ?, last_activity_at = ? WHERE id = ?",
            (new_balance, now_iso, member_id)
        )

        # FIFO deduction from unredeemed points
        remaining_to_deduct = points
        unredeemed_txs = conn.execute(
            """
            SELECT id, unredeemed_points FROM point_transactions
            WHERE member_id = ? AND type = 'EARN' AND unredeemed_points > 0
            ORDER BY created_at ASC, id ASC
            """,
            (member_id,)
        ).fetchall()

        for utx in unredeemed_txs:
            if remaining_to_deduct <= 0:
                break
            can_deduct = min(utx["unredeemed_points"], remaining_to_deduct)
            conn.execute(
                "UPDATE point_transactions SET unredeemed_points = unredeemed_points - ? WHERE id = ?",
                (can_deduct, utx["id"])
            )
            remaining_to_deduct -= can_deduct

        receipt_no = generate_receipt_number("RDM")

        cursor = conn.execute(
            """
            INSERT INTO point_transactions
                (member_id, receipt_number, type, amount_paise, free_item_name,
                 free_item_value_paise, points_delta, unredeemed_points, balance_after, tier_at_transaction, created_at)
            VALUES (?, ?, 'REDEEM', NULL, ?, ?, ?, 0, ?, ?, ?)
            """,
            (member_id, receipt_no, free_item_name, free_item_value_paise, -points, new_balance, current_tier, now_iso)
        )
        tx_id = cursor.lastrowid

        updated_member = dict(conn.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone())
        created_tx = dict(conn.execute("SELECT * FROM point_transactions WHERE id = ?", (tx_id,)).fetchone())

        conn.execute("COMMIT;")

        receipt = {
            "receipt_number": receipt_no,
            "cafe_name": CAFE_NAME,
            "branch": CAFE_BRANCH,
            "date": created_tx["created_at"],
            "customer_name": member["name"],
            "phone": member["phone"],
            "free_item": free_item_name or "Custom Point Redemption",
            "points_redeemed": points,
            "free_item_value_inr": free_item_value_paise / 100,
            "points_earned_on_redemption": 0,
            "live_points_balance": new_balance,
            "tier": current_tier,
        }

        return {
            "member": updated_member,
            "transaction": created_tx,
            "receipt": receipt,
        }
    except Exception:
        try:
            conn.execute("ROLLBACK;")
        except sqlite3.OperationalError:
            pass
        raise


def expire_stale_points(conn: sqlite3.Connection, current_time: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Level 2 Twist Automation Job:
    Points expire if unused for 90 days.
    Finds EARN transactions older than 90 days with unredeemed_points > 0,
    expires those points, adjusts member points_balance, and inserts 'EXPIRE' ledger record.
    """
    now = current_time or get_now()
    cutoff_time = now - timedelta(days=POINTS_EXPIRY_DAYS)
    cutoff_iso = cutoff_time.strftime("%Y-%m-%d %H:%M:%S")
    now_iso = now.strftime("%Y-%m-%d %H:%M:%S")

    expired_records = []
    total_points_expired = 0

    try:
        conn.execute("BEGIN IMMEDIATE;")

        stale_txs = conn.execute(
            """
            SELECT pt.id, pt.member_id, pt.unredeemed_points, pt.tier_at_transaction,
                   m.points_balance, m.name
            FROM point_transactions pt
            JOIN members m ON pt.member_id = m.id
            WHERE pt.type = 'EARN'
              AND pt.unredeemed_points > 0
              AND pt.created_at <= ?
            ORDER BY pt.created_at ASC
            """,
            (cutoff_iso,)
        ).fetchall()

        for stx in stale_txs:
            curr_member = conn.execute(
                "SELECT points_balance FROM members WHERE id = ?",
                (stx["member_id"],)
            ).fetchone()
            curr_balance = curr_member["points_balance"] if curr_member else 0

            points_to_expire = min(stx["unredeemed_points"], curr_balance)
            if points_to_expire <= 0:
                conn.execute("UPDATE point_transactions SET unredeemed_points = 0 WHERE id = ?", (stx["id"],))
                continue

            new_balance = curr_balance - points_to_expire

            conn.execute(
                "UPDATE members SET points_balance = ?, last_activity_at = ? WHERE id = ?",
                (new_balance, now_iso, stx["member_id"])
            )
            conn.execute(
                "UPDATE point_transactions SET unredeemed_points = 0 WHERE id = ?",
                (stx["id"],)
            )

            exp_receipt = generate_receipt_number("EXP")
            conn.execute(
                """
                INSERT INTO point_transactions
                    (member_id, receipt_number, type, amount_paise, free_item_name,
                     free_item_value_paise, points_delta, unredeemed_points, balance_after, tier_at_transaction, created_at)
                VALUES (?, ?, 'EXPIRE', NULL, '90-Day Inactivity Expiration', NULL, ?, 0, ?, ?, ?)
                """,
                (stx["member_id"], exp_receipt, -points_to_expire, new_balance, stx["tier_at_transaction"], now_iso)
            )

            expired_records.append({
                "member_id": stx["member_id"],
                "member_name": stx["name"],
                "points_expired": points_to_expire,
                "balance_after": new_balance,
            })
            total_points_expired += points_to_expire

        conn.execute("COMMIT;")

        return {
            "status": "success",
            "evaluated_at": now_iso,
            "expired_count": len(expired_records),
            "total_points_expired": total_points_expired,
            "details": expired_records,
        }
    except Exception:
        try:
            conn.execute("ROLLBACK;")
        except sqlite3.OperationalError:
            pass
        raise
