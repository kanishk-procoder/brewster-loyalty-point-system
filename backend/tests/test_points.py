import pytest
import sqlite3
from app.db import get_connection
from app.services.points import (
    calculate_tier,
    calculate_earned_points,
    round_half_up,
    record_purchase,
    redeem_points,
    InvalidAmountError,
    InvalidPointsError,
    InsufficientBalanceError,
    MemberNotFoundError,
)

from app.db import get_connection, init_db

@pytest.fixture
def test_db(tmp_path):
    """Create an isolated SQLite database for testing with full schema."""
    db_file = str(tmp_path / "test_points.db")
    init_db(db_file)
    conn = get_connection(db_file)
    yield conn
    conn.close()


def test_rounding_rule_half_up():
    assert round_half_up(10.0) == 10
    assert round_half_up(10.4) == 10
    assert round_half_up(10.5) == 11
    assert round_half_up(10.6) == 11
    assert round_half_up(37.5) == 38


def test_new_member_initialization(test_db):
    test_db.execute(
        "INSERT INTO members (name, country_code, phone_number, phone) VALUES (?, ?, ?, ?)",
        ("Aarav Sharma", "+91", "9876543210", "+919876543210")
    )
    cursor = test_db.execute("SELECT * FROM members WHERE phone = '+919876543210'")
    row = cursor.fetchone()
    assert row["points_balance"] == 0
    assert row["lifetime_points"] == 0
    assert row["lifetime_spend_paise"] == 0
    assert row["tier"] == "REGULAR"


def test_regular_purchase_correct_points(test_db):
    test_db.execute(
        "INSERT INTO members (name, country_code, phone_number, phone) VALUES (?, ?, ?, ?)",
        ("Priya Patel", "+91", "9876543211", "+919876543211")
    )
    member_id = 1
    # ₹500.00 purchase = 50000 paise -> at Regular (1.0x), earns 50 points
    result = record_purchase(test_db, member_id, 50000)

    assert result["member"]["points_balance"] == 50
    assert result["member"]["lifetime_points"] == 50
    assert result["member"]["lifetime_spend_paise"] == 50000
    assert result["member"]["tier"] == "REGULAR"

    tx = result["transaction"]
    assert tx["type"] == "EARN"
    assert tx["points_delta"] == 50
    assert tx["balance_after"] == 50
    assert tx["tier_at_transaction"] == "REGULAR"
    assert "receipt_number" in tx


def test_silver_spend_threshold_and_rate(test_db):
    # Member with ₹4,900 lifetime spend (490,000 paise)
    test_db.execute(
        """
        INSERT INTO members (name, country_code, phone_number, phone, points_balance, lifetime_points, lifetime_spend_paise, tier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("Vikram Roy", "+91", "9876543212", "+919876543212", 490, 490, 490000, "REGULAR")
    )
    member_id = 1

    # Purchase ₹100 (10,000 paise). Regular rate (1x) earns 10 pts.
    # Lifetime spend reaches 490,000 + 10,000 = 500,000 paise (₹5,000) -> Promotes to SILVER for next time!
    res = record_purchase(test_db, member_id, 10000)
    assert res["transaction"]["tier_at_transaction"] == "REGULAR" # Earned at current tier
    assert res["transaction"]["points_delta"] == 10
    assert res["member"]["tier"] == "SILVER" # Upgraded for next purchase
    assert res["member"]["lifetime_spend_paise"] == 500000

    # Next purchase of ₹250 (25,000 paise) at SILVER rate (1.5x):
    # 25 * 1.5 = 37.5 -> rounds .5 upward to 38 points!
    res2 = record_purchase(test_db, member_id, 25000)
    assert res2["transaction"]["tier_at_transaction"] == "SILVER"
    assert res2["transaction"]["points_delta"] == 38
    assert res2["member"]["points_balance"] == 500 + 38


def test_gold_spend_threshold_and_rate(test_db):
    # Member with ₹14,900 lifetime spend (1,490,000 paise) in SILVER
    test_db.execute(
        """
        INSERT INTO members (name, country_code, phone_number, phone, points_balance, lifetime_points, lifetime_spend_paise, tier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("Ananya Iyer", "+91", "9876543213", "+919876543213", 1500, 1500, 1490000, "SILVER")
    )
    member_id = 1

    # ₹100 purchase (10,000 paise) at Silver rate (1.5x) earns 15 pts
    # Spend reaches 1,500,000 paise (₹15,000) -> Promotes to GOLD!
    res = record_purchase(test_db, member_id, 10000)
    assert res["member"]["tier"] == "GOLD"
    assert res["member"]["lifetime_spend_paise"] == 1500000

    # Next purchase of ₹200 (20,000 paise) at GOLD rate (2x): earns 20 * 2 = 40 pts
    res_gold = record_purchase(test_db, member_id, 20000)
    assert res_gold["transaction"]["points_delta"] == 40
    assert res_gold["transaction"]["tier_at_transaction"] == "GOLD"


def test_redemption_rule_and_value(test_db):
    test_db.execute(
        """
        INSERT INTO members (name, country_code, phone_number, phone, points_balance, lifetime_points, lifetime_spend_paise, tier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("Karan Mehta", "+91", "9876543214", "+919876543214", 500, 600, 600000, "SILVER")
    )
    member_id = 1

    # Redeem 150 points for "Butter Croissant"
    # Rule: 10 points = ₹1 of free-item value -> 150 points = ₹15 value (1500 paise)
    result = redeem_points(test_db, member_id, 150, free_item_name="Butter Croissant")
    assert result["member"]["points_balance"] == 350
    assert result["member"]["lifetime_points"] == 600      # Unchanged
    assert result["member"]["lifetime_spend_paise"] == 600000 # Unchanged
    assert result["member"]["tier"] == "SILVER"            # NEVER demoted

    tx = result["transaction"]
    assert tx["type"] == "REDEEM"
    assert tx["points_delta"] == -150
    assert tx["free_item_name"] == "Butter Croissant"
    assert tx["free_item_value_paise"] == 1500
    assert tx["balance_after"] == 350
    assert result["receipt"]["points_earned_on_redemption"] == 0  # Free redemption earns 0 points


def test_over_redemption_rejected(test_db):
    test_db.execute(
        "INSERT INTO members (name, phone_number, phone, points_balance) VALUES (?, ?, ?, ?)",
        ("Rohan Joshi", "9876543215", "+919876543215", 80)
    )
    member_id = 1

    with pytest.raises(InsufficientBalanceError):
        redeem_points(test_db, member_id, 100)

    # State unchanged
    cursor = test_db.execute("SELECT points_balance FROM members WHERE id = 1")
    assert cursor.fetchone()["points_balance"] == 80


def test_invalid_amounts_rejected(test_db):
    test_db.execute(
        "INSERT INTO members (name, phone_number, phone, points_balance) VALUES (?, ?, ?, ?)",
        ("Simran Kaur", "9876543216", "+919876543216", 100)
    )
    member_id = 1

    with pytest.raises(InvalidAmountError):
        record_purchase(test_db, member_id, 0)

    with pytest.raises(InvalidAmountError):
        record_purchase(test_db, member_id, -500)

    with pytest.raises(InvalidPointsError):
        redeem_points(test_db, member_id, 0)
