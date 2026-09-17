import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = os.getenv("DB_PATH", str(DATA_DIR / "brew_rewards.db"))

# Café Identity
CAFE_NAME = "BrewRewards Artisan Coffee"
CAFE_BRANCH = "Flagship Counter - Branch #01"
CAFE_ADDRESS = "104 Roast Boulevard, Bengaluru"

# JWT / Security
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-brew-rewards-key-change-in-prod-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# --- Business Rules ---
# Base currency: Paise (1 INR = 100 Paise)
BASE_PAISE_PER_POINT = 1000  # 1 pt per ₹10 at Regular rate

# Earning Rates (Points per ₹10)
REGULAR_RATE = 1.0    # 1.0 pt per ₹10 (0.1/₹)
SILVER_RATE = 1.5     # 1.5 pts per ₹10 (0.15/₹)
GOLD_RATE = 2.0       # 2.0 pts per ₹10 (0.20/₹)
PLATINUM_RATE = 3.0   # 3.0 pts per ₹10 (0.30/₹) -> Exactly 0.3/₹ per Level 1 twist!

# Tier Thresholds:
# Qualification criteria: lifetime >= 5000 qualifies for PLATINUM
PLATINUM_THRESHOLD_LIFETIME = 5000

# Silver & Gold spend thresholds (paise)
SILVER_SPEND_THRESHOLD_PAISE = 500000   # ₹5,000 spend
GOLD_SPEND_THRESHOLD_PAISE = 1500000   # ₹15,000 spend

# Expiry Rule (Level 2 twist)
POINTS_EXPIRY_DAYS = 90

# Redemption Rule: 10 points = ₹1 free item value
POINTS_PER_RUPEE_REDEMPTION = 10

TIERS = {
    "REGULAR": {"rate": REGULAR_RATE, "min_val": 0},
    "SILVER": {"rate": SILVER_RATE, "min_val": 5000},
    "GOLD": {"rate": GOLD_RATE, "min_val": 15000},
    "PLATINUM": {"rate": PLATINUM_RATE, "min_val": PLATINUM_THRESHOLD_LIFETIME},
}

# Free rewards catalog
REWARD_CATALOG = [
    {"id": "cappuccino", "name": "Classic Cappuccino", "inr_value": 180, "points_required": 1800},
    {"id": "espresso", "name": "Single Origin Espresso", "inr_value": 120, "points_required": 1200},
    {"id": "cold_brew", "name": "Nitro Cold Brew", "inr_value": 220, "points_required": 2200},
    {"id": "croissant", "name": "Butter Croissant", "inr_value": 150, "points_required": 1500},
    {"id": "latte", "name": "Caramel Macchiato", "inr_value": 240, "points_required": 2400},
]
