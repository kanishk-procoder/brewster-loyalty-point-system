import random
from app.db import get_db, init_db
from app.auth import hash_password
from app.services.points import record_purchase, redeem_points

SAMPLE_MEMBERS = [
    ("Aarav Sharma", "+91", "9876500001", "REGULAR", 3),
    ("Priya Patel", "+91", "9876500002", "REGULAR", 5),
    ("Vikram Malhotra", "+91", "9876500003", "SILVER", 12),
    ("Ananya Iyer", "+91", "9876500004", "GOLD", 25),
    ("Rohan Deshmukh", "+91", "9876500005", "REGULAR", 2),
    ("Simran Kaur", "+91", "9876500006", "SILVER", 15),
    ("Karan Joshi", "+91", "9876500007", "GOLD", 30),
    ("Sneha Reddy", "+91", "9876500008", "REGULAR", 4),
    ("Rahul Sen", "+91", "9876500009", "SILVER", 14),
    ("Neha Verma", "+91", "9876500010", "REGULAR", 1),
    ("Aditya Nair", "+91", "9876500011", "GOLD", 28),
    ("Tanvi Kulkarni", "+91", "9876500012", "REGULAR", 6),
    ("Varun Bhat", "+91", "9876500013", "SILVER", 16),
    ("Pooja Choudhury", "+91", "9876500014", "REGULAR", 3),
    ("Siddharth Roy", "+91", "9876500015", "GOLD", 35),
    ("Kavya Pillai", "+91", "9876500016", "REGULAR", 2),
    ("Manish Tiwari", "+91", "9876500017", "SILVER", 13),
    ("Ishaan Mehta", "+91", "9876500018", "REGULAR", 7),
    ("Divya Menon", "+91", "9876500019", "GOLD", 40),
    ("Aryan Gupta", "+91", "9876500020", "REGULAR", 4),
    ("Kabir Oberoi", "+91", "9876500099", "PLATINUM", 50),
]

def seed():
    print("[*] Initializing Database Schema...")
    init_db()

    with get_db() as conn:
        # Clear out existing data for pristine seed
        conn.execute("DELETE FROM outbox;")
        conn.execute("DELETE FROM point_transactions;")
        conn.execute("DELETE FROM users;")
        conn.execute("DELETE FROM members;")

        # 1. Create Default Staff User
        hashed = hash_password("Admin@1234")
        conn.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'STAFF')",
            ("Counter Staff (Barista)", "admin@brewrewards.com", hashed)
        )
        print("[+] Created default staff user: admin@brewrewards.com / Admin@1234")

        # 2. Seed Members
        print("[*] Seeding Sample Members & Transactions...")
        gold_member_id = None

        for name, country_code, phone_number, target_tier, purchases_count in SAMPLE_MEMBERS:
            full_phone = f"{country_code}{phone_number}"
            cursor = conn.execute(
                """
                INSERT INTO members
                    (name, country_code, phone_number, phone, points_balance, lifetime_points, lifetime_spend_paise, tier)
                VALUES (?, ?, ?, ?, 0, 0, 0, 'REGULAR')
                """,
                (name, country_code, phone_number, full_phone)
            )
            member_id = cursor.lastrowid

            if name == "Aarav Sharma":
                # Regular verge: spend ₹4,750 (needs ₹250 to hit SILVER!)
                record_purchase(conn, member_id, 475000)
            elif name == "Simran Kaur":
                # Silver verge: spend ₹11,000, 1400 pts (needs ₹670 / 100 pts to hit GOLD!)
                record_purchase(conn, member_id, 500000)  # Silver (500 pts)
                record_purchase(conn, member_id, 600000)  # +900 pts = 1400 pts (SILVER)
            elif name == "Ananya Iyer":
                # Gold verge: spend ₹29,000, 4800 pts (needs ₹1,000 / 200 pts to hit PLATINUM!)
                record_purchase(conn, member_id, 500000)   # Silver (500 pts)
                record_purchase(conn, member_id, 1000000)  # Gold (+1500 pts = 2000 pts)
                record_purchase(conn, member_id, 1400000)  # +2800 pts = 4800 pts (GOLD)
                gold_member_id = member_id
            elif name == "Kabir Oberoi":
                # Platinum member (lifetime pts >= 5000)
                record_purchase(conn, member_id, 500000)
                record_purchase(conn, member_id, 1000000)
                record_purchase(conn, member_id, 2000000)
            else:
                # Standard simulated purchases
                for _ in range(purchases_count):
                    amount_inr = random.choice([120, 180, 250, 320, 450])
                    record_purchase(conn, member_id, amount_inr * 100)

                if target_tier == "SILVER":
                    cur_m = conn.execute("SELECT lifetime_spend_paise FROM members WHERE id = ?", (member_id,)).fetchone()
                    needed = max(0, 520000 - cur_m["lifetime_spend_paise"])
                    if needed > 0:
                        record_purchase(conn, member_id, needed)
                elif target_tier == "GOLD":
                    cur_m = conn.execute("SELECT lifetime_spend_paise FROM members WHERE id = ?", (member_id,)).fetchone()
                    needed = max(0, 1550000 - cur_m["lifetime_spend_paise"])
                    if needed > 0:
                        record_purchase(conn, member_id, needed)

            # Sample redemption if sufficient points
            cur_mem = conn.execute("SELECT points_balance FROM members WHERE id = ?", (member_id,)).fetchone()
            if cur_mem and cur_mem["points_balance"] > 400:
                redeem_points(conn, member_id, 150, free_item_name="Butter Croissant")

        # 3. Create Default Customer Account linked to Gold Member
        if gold_member_id:
            cust_hash = hash_password("Customer@1234")
            conn.execute(
                "INSERT INTO users (name, email, password_hash, role, member_id) VALUES (?, ?, ?, 'CUSTOMER', ?)",
                ("Ananya Iyer (Gold VIP)", "customer@brewrewards.com", cust_hash, gold_member_id)
            )
            print("[+] Created default customer user: customer@brewrewards.com / Customer@1234")

        # Clear outbox so notifications start pristine for testing
        conn.execute("DELETE FROM outbox;")

        total_m = conn.execute("SELECT COUNT(*) as c FROM members").fetchone()["c"]
        total_tx = conn.execute("SELECT COUNT(*) as c FROM point_transactions").fetchone()["c"]
        print(f"[+] Seeding complete: {total_m} members and {total_tx} transactions ready.")

if __name__ == "__main__":
    seed()
