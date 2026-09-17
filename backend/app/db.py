import sqlite3
from typing import Optional
from contextlib import contextmanager
import app.config

def get_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    """Create a new connection with Row factory and foreign keys enabled."""
    target_path = db_path if db_path is not None else app.config.DB_PATH
    conn = sqlite3.connect(target_path, check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

@contextmanager
def get_db(db_path: Optional[str] = None):
    """Context manager for obtaining a database connection."""
    conn = get_connection(db_path)
    try:
        yield conn
    finally:
        conn.close()

def init_db(db_path: Optional[str] = None):
    """Initialize database tables with PLATINUM tier, expiry tracking, and outbox."""
    with get_db(db_path) as conn:

        # 1. Staff and Customer Users
        conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'STAFF' CHECK(role IN ('STAFF', 'CUSTOMER')),
            member_id INTEGER,
            created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
        );
        """)

        # 2. Members with PLATINUM tier & last_activity_at
        conn.execute("""
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            country_code TEXT NOT NULL DEFAULT '+91',
            phone_number TEXT NOT NULL,
            phone TEXT NOT NULL UNIQUE,
            points_balance INTEGER NOT NULL DEFAULT 0 CHECK(points_balance >= 0),
            lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK(lifetime_points >= 0),
            lifetime_spend_paise INTEGER NOT NULL DEFAULT 0 CHECK(lifetime_spend_paise >= 0),
            tier TEXT NOT NULL DEFAULT 'REGULAR'
                CHECK(tier IN ('REGULAR', 'SILVER', 'GOLD', 'PLATINUM')),
            last_activity_at TEXT NOT NULL DEFAULT (DATETIME('now')),
            created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
        );
        """)

        # 3. Transaction Ledger supporting 'EXPIRE' type and unredeemed tracking
        conn.execute("""
        CREATE TABLE IF NOT EXISTS point_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id INTEGER NOT NULL,
            receipt_number TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('EARN', 'REDEEM', 'EXPIRE')),
            amount_paise INTEGER,
            free_item_name TEXT,
            free_item_value_paise INTEGER,
            points_delta INTEGER NOT NULL,
            unredeemed_points INTEGER NOT NULL DEFAULT 0,
            balance_after INTEGER NOT NULL CHECK(balance_after >= 0),
            tier_at_transaction TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
        );
        """)

        # 4. Outbox Table for Notification Service (Level 3 twist)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS outbox (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id INTEGER NOT NULL,
            recipient TEXT NOT NULL,
            event TEXT NOT NULL,
            old_tier TEXT NOT NULL,
            new_tier TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
        );
        """)

        # Indexes
        conn.execute("CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_members_phone_local ON members(phone_number);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tx_receipt ON point_transactions(receipt_number);")
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_transactions_member_time
            ON point_transactions(member_id, created_at DESC);
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_outbox_member ON outbox(member_id);")

        # Level 1 Twist Backward-Compatibility:
        # Existing members' tiers and balances remain unchanged unless they now qualify for PLATINUM.
        conn.execute("""
            UPDATE members
            SET tier = 'PLATINUM'
            WHERE (lifetime_points >= 5000 OR lifetime_spend_paise >= 5000000)
              AND tier != 'PLATINUM';
        """)
