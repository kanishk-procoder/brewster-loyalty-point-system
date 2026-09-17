# 🧠 REASONING.md — Technical Architecture & Design Decisions

This document details the architectural thought process, design trade-offs, correctness guarantees, testing methodologies, and debugging resolutions undertaken while developing **BrewRewards**.

---

## 1. Requirements Interpretation & Technical Decisions

Following the project requirements and challenge notes, several key decisions were formalized:

### 1.1 Lifetime Spend vs. Lifetime Points for Tier Qualification
- **Challenge Note**: *"Silver qualification begins at 5,000 and Gold qualification begins at 15,000. The supplied wording says 'purchase', so this is provisionally interpreted as lifetime ₹ spend rather than lifetime points."*
- **Technical Design**: We introduced `lifetime_spend_paise` (integer paise) to the `members` table.
  - Silver begins at ₹5,000 lifetime spend ($500,000\text{ paise}$).
  - Gold begins at ₹15,000 lifetime spend ($1,500,000\text{ paise}$).
- **Demotion Prevention**: Because `lifetime_spend_paise` is strictly monotonic (only increases when purchases are logged), redeeming points for free items **never** reduces lifetime spend. Customers keep their hard-earned Silver and Gold status regardless of redemptions.

### 1.2 Fractional Points Tie-Breaking Policy
- **Challenge Note**: *"Fractional point calculations use standard rounding. The exact tie rule must be stated in the implementation (recommended: round .5 upward)."*
- **Technical Design**: Python's native `round()` implements banker's rounding (round-half-to-even), which would round $2.5 \to 2$ instead of $3$. To enforce deterministic standard tie-breaking where $.5$ always rounds upward, we implemented:
  ```python
  def round_half_up(val: float) -> int:
      return math.floor(val + 0.5)
  ```
  - Example: ₹250 purchase at Silver (1.5× multiplier):
    $$\frac{25000\text{ paise}}{1000} \times 1.5 = 37.5 \implies \lfloor 37.5 + 0.5 \rfloor = 38\text{ points}$$

### 1.3 Redemption Valuation Mechanics
- **Challenge Note**: *"Reward redemption converts 10 points to ₹1 of free-item value. A free redemption earns no new points."*
- **Technical Design**:
  - Point-to-Rupee conversion: $1\text{ point} = 10\text{ paise}$ (i.e., $10\text{ points} = 100\text{ paise} = \text{₹}1$).
  - For example, claiming a ₹150 Butter Croissant requires exactly $150 \times 10 = 1,500$ points.
  - When recording a redemption transaction, `points_delta` is signed negative ($-1500$), and no earn logic is executed (`points_earned_on_redemption = 0`).

### 1.4 Separate Country Code Storage
- **Challenge Note**: *"Store a phone country code separately from the local phone number."*
- **Technical Design**:
  - Columns: `country_code TEXT NOT NULL DEFAULT '+91'`, `phone_number TEXT NOT NULL`, and `phone TEXT NOT NULL UNIQUE` (concatenated normalized string e.g. `+919876543210`).
  - Indexes: B-Tree index on `phone` for global uniqueness and an index on `phone_number` for fast localized cashier lookups.

### 1.5 Role Separation (Staff vs. Customer)
- **Customer**: Can authenticate to view their personal digital loyalty pass, live balance, tier progress bar, and self-redeem free items from the rewards catalog.
- **Staff / Barista**: Full counter register access to create members, search across all phone numbers, record paid purchases, and print itemized bills.

---

## 2. Database Schema & Data Integrity

The database comprises three core tables plus one authentication table:

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│              users              │       │             members             │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ id (PK)                         │       │ id (PK)                         │
│ name                            │       │ name                            │
│ email (UNIQUE)                  │       │ country_code ('+91')            │
│ password_hash                   │       │ phone_number ('9876543210')     │
│ role ('STAFF' | 'CUSTOMER')     │       │ phone (UNIQUE)                  │
│ member_id (FK -> members)       │       │ points_balance (CHECK >= 0)     │
│ created_at                      │       │ lifetime_points (CHECK >= 0)    │
└─────────────────────────────────┘       │ lifetime_spend_paise (CHECK>=0) │
                                          │ tier ('REGULAR'|'SILVER'|'GOLD')│
                                          │ created_at                      │
                                          └─────────────────────────────────┘
                                                           │
                                                           ▼
                                          ┌─────────────────────────────────┐
                                          │       point_transactions        │
                                          ├─────────────────────────────────┤
                                          │ id (PK)                         │
                                          │ member_id (FK)                  │
                                          │ receipt_number ('RCP-...')      │
                                          │ type ('EARN' | 'REDEEM')        │
                                          │ amount_paise (nullable)         │
                                          │ free_item_name (nullable)       │
                                          │ free_item_value_paise (nullable)│
                                          │ points_delta (signed +/-)       │
                                          │ balance_after (CHECK >= 0)      │
                                          │ tier_at_transaction             │
                                          │ created_at                      │
                                          └─────────────────────────────────┘
```

**Key Integrity Protections**:
1. `CHECK(points_balance >= 0)`: Database-enforced impossibility of negative balances.
2. `points_delta` Signed Representation:
   - Earn: `+50`
   - Redeem: `-1500`
3. `receipt_number`: Human-readable identifier (e.g. `RCP-260917-4821` or `RDM-260917-1923`) printed on bills.
4. `balance_after`: Captures a permanent point-in-time balance snapshot immediately following the delta, providing tamper-evident audit logs.

---

## 3. Concurrency Protection & Race Condition Prevention

In busy café environments with multiple counter terminals, two cashiers processing transactions for the same member simultaneously must never produce race conditions or incorrect balances.

### Why `BEGIN IMMEDIATE` is Crucial
In SQLite:
- A standard `BEGIN` (or `BEGIN DEFERRED`) only acquires a read lock until a `WRITE` statement executes.
- If Terminal A and Terminal B both read a balance of 100 points, both approve a 100-point redemption, and then both execute `UPDATE`, one transaction will either fail or silently create an invalid state.
- By issuing explicit `BEGIN IMMEDIATE;` at the start of our Python service routines, SQLite immediately acquires a **reserved lock**. No other terminal can initiate a conflicting write transaction until the active transaction commits.

---

## 4. Testing Strategy & Debugging Resolutions

### 1.6 Level 1 — Twist T3 (Backward-Compatibility): Platinum Tier
- **Requirement**: *"Add a new top tier Platinum (lifetime ≥ 5000, earns 0.3/₹). Existing members’ tiers and balances must be unchanged unless they now qualify."*
- **Technical Design**:
  - **Threshold**: Lifetime points $\ge 5000$ (or lifetime spend $\ge \text{₹}50,000$).
  - **Earning Multiplier**: $0.3/\text{₹}$ (3.0 points per ₹10 spent, 3.0×).
  - **Backward-Compatibility Guarantee**:
    - Existing members with lifetime points $< 5000$ retain their existing tier (REGULAR, SILVER, or GOLD) and their balances remain completely unchanged.
    - Existing members with lifetime points $\ge 5000$ are automatically qualified and promoted to PLATINUM without modifying their points balances.
    - When an active member reaches 5,000 lifetime points on a purchase, that purchase awards points using their pre-upgrade tier rate, and subsequent purchases earn at the accelerated 0.3/₹ Platinum rate.

### 1.7 Level 2 — Twist T2 (Automation): 90-Day Points Expiration
- **Requirement**: *"Points expire if unused for 90 days; a job expires stale points and adjusts balances. Graded via POST /clock."*
- **Technical Design**:
  - **Virtual Clock (`app/clock.py`)**: Provides simulated time travel via `POST /clock` (and `/api/clock`), accepting ISO timestamps or offsets (`days`, `seconds`).
  - **FIFO Unredeemed Points Tracking**:
    - Each `EARN` transaction records `unredeemed_points`.
    - When redemptions occur, points are consumed FIFO from the oldest unredeemed transactions first.
    - When the 90-day expiration job executes, it only expires unredeemed points that have aged past 90 days without activity (`created_at <= now - 90 days` and `unredeemed_points > 0`).
    - Points already redeemed for rewards are never expired a second time.
  - **Ledger Auditability**: Stale points deduction logs an explicit `EXPIRE` transaction with negative `points_delta`, updating `points_balance` atomically with zero ledger drift.

### 1.8 Level 3 — Twist T1 (Integrate): Notification Service Outbox
- **Requirement**: *"When a member crosses into a new tier, notify them via the Notification Service. Graded via /outbox."*
- **Technical Design**:
  - **Outbox Table**: Dedicated `outbox` table recording `{id, member_id, recipient, event, old_tier, new_tier, message, created_at}`.
  - **Event Trigger**: Inside `record_purchase()`, if `new_tier != current_tier`, an event is emitted into the outbox within the same atomic SQLite transaction.
  - **Outbox API**: Exposed at `GET /outbox` and `GET /api/outbox`, with `DELETE /outbox` and `POST /outbox/clear` for testing idempotency.

---

## 2. Database Schema & Data Integrity

The database comprises four core tables plus indexes and foreign key constraints:

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│              users              │       │             members             │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ id (PK)                         │       │ id (PK)                         │
│ name                            │       │ name                            │
│ email (UNIQUE)                  │       │ country_code ('+91')            │
│ password_hash                   │       │ phone_number ('9876543210')     │
│ role ('STAFF' | 'CUSTOMER')     │       │ phone (UNIQUE)                  │
│ member_id (FK -> members)       │       │ points_balance (CHECK >= 0)     │
│ created_at                      │       │ lifetime_points (CHECK >= 0)    │
└─────────────────────────────────┘       │ lifetime_spend_paise (CHECK>=0) │
                                          │ tier (REGULAR/SILVER/GOLD/PLAT) │
                                          │ last_activity_at                │
                                          │ created_at                      │
                                          └─────────────────────────────────┘
                                                   │                   │
                                                   ▼                   ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│       point_transactions        │       │             outbox              │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ id (PK)                         │       │ id (PK)                         │
│ member_id (FK)                  │       │ member_id (FK)                  │
│ receipt_number ('RCP-...')      │       │ recipient (phone)               │
│ type ('EARN'|'REDEEM'|'EXPIRE') │       │ event ('TIER_UPGRADE')          │
│ amount_paise (nullable)         │       │ old_tier                        │
│ free_item_name (nullable)       │       │ new_tier                        │
│ free_item_value_paise (nullable)│       │ message                         │
│ points_delta (signed +/-)       │       │ created_at                      │
│ unredeemed_points (FIFO)        │       └─────────────────────────────────┘
│ balance_after (CHECK >= 0)      │
│ tier_at_transaction             │
│ created_at                      │
└─────────────────────────────────┘
```

**Key Integrity Protections**:
1. `CHECK(points_balance >= 0)`: Database-enforced impossibility of negative balances.
2. `points_delta` Signed Representation:
   - Earn: `+50`
   - Redeem: `-1500`
   - Expire: `-100`
3. `receipt_number`: Human-readable identifier (e.g. `RCP-260917-4821`, `RDM-260917-1923`, `EXP-260917-8104`).
4. `balance_after`: Captures a permanent point-in-time balance snapshot immediately following the delta, providing tamper-evident audit logs.

---

## 3. Concurrency Protection & Race Condition Prevention

In busy café environments with multiple counter terminals, two cashiers processing transactions for the same member simultaneously must never produce race conditions or incorrect balances.

### Why `BEGIN IMMEDIATE` is Crucial
In SQLite:
- A standard `BEGIN` (or `BEGIN DEFERRED`) only acquires a read lock until a `WRITE` statement executes.
- If Terminal A and Terminal B both read a balance of 100 points, both approve a 100-point redemption, and then both execute `UPDATE`, one transaction will either fail or silently create an invalid state.
- By issuing explicit `BEGIN IMMEDIATE;` at the start of our Python service routines, SQLite immediately acquires a **reserved lock**. No other terminal can initiate a conflicting write transaction until the active transaction commits.

---

## 4. Testing Strategy & Debugging Resolutions

### 4.1 Debugging Resolution: Windows Socket Permission `[WinError 10013]`
- **Issue**: During server startup with `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`, the user received:
  `[WinError 10013] An attempt was made to access a socket in a way forbidden by its access permissions`.
- **Root Cause**: An existing background task in Windows or a reserved port range had previously bound to port 8000. Additionally, binding to `0.0.0.0` on Windows can trigger OS-level firewall restrictions.
- **Resolution**:
  1. Identified and terminated any running processes on port 8000 via `netstat -ano | findstr :8000`.
  2. Verified socket binding cleanly on `127.0.0.1:8000` via automated socket tests.
  3. Configured server run instructions to bind explicitly to `--host 127.0.0.1 --port 8000`.

### 4.2 Debugging Resolution: SQLite Schema CHECK Constraint & Foreign Key Renaming
- **Issue**: Adding `'PLATINUM'` to `CHECK(tier IN (...))` in an existing SQLite database triggered `IntegrityError` because SQLite's `CREATE TABLE IF NOT EXISTS` cannot alter existing check constraints. Furthermore, standard table rename operations (`ALTER TABLE members RENAME TO members_old`) silently updated foreign key definitions in dependent tables.
- **Root Cause**: SQLite maintains relational integrity by altering foreign key references during table renames unless legacy alter table behavior is toggled.
- **Resolution**: Implemented clean table definitions in `init_db()` and refreshed seed scripts to build from clean schema with `PLATINUM`, `last_activity_at`, `unredeemed_points`, and `outbox`.

### 4.3 Automated Pytest Suite (19 Tests Passing)
We maintain 19 comprehensive unit and integration test cases in `backend/tests/`:
1. `test_rounding_rule_half_up`: Confirms exact tie-breaking: $10.4 \to 10$, $10.5 \to 11$, $37.5 \to 38$.
2. `test_new_member_initialization`: Confirms 0 balance, 0 lifetime spend, in Regular tier.
3. `test_regular_purchase_correct_points`: Confirms 1 pt per ₹10 spent.
4. `test_silver_spend_threshold_and_rate`: Confirms upgrade to Silver upon reaching ₹5,000 lifetime spend and subsequent 1.5× earning.
5. `test_gold_spend_threshold_and_rate`: Confirms upgrade to Gold upon reaching ₹15,000 lifetime spend and subsequent 2.0× earning.
6. `test_redemption_rule_and_value`: Confirms 10 points = ₹1 free item value, zero points earned on redemption, and tier stability.
7. `test_over_redemption_rejected`: Confirms atomic rejection when points requested exceed balance.
8. `test_invalid_amounts_rejected`: Confirms rejection of negative or zero values.
9. `test_platinum_earning_rate`: Confirms Platinum tier earns 0.3/₹ (3.0 pts per ₹10).
10. `test_existing_members_backward_compatibility`: Confirms existing members < 5000 lifetime points keep tier/balance, and qualifying members promote to Platinum.
11. `test_member_crosses_into_platinum`: Confirms pre-upgrade rate applied to threshold transaction and Platinum rate applied afterwards.
12. `test_points_expiry_after_90_days`: Confirms stale points older than 90 days expire and log `EXPIRE` entries.
13. `test_fifo_redemption_prevents_double_expiry`: Confirms redeemed points are deducted FIFO and not expired twice.
14. `test_outbox_tier_crossing_notification`: Confirms outbox receives tier-upgrade notifications.
15. `test_api_clock_and_outbox_integration`: Confirms grading HTTP endpoints `/clock` and `/outbox`.
16. `test_auth_flow`: Confirms JWT authentication and role assignment.
17. `test_member_crud_and_search`: Confirms country code separation, phone uniqueness, and partial search.
18. `test_purchase_redemption_and_receipt`: Confirms purchase and redemption API endpoints with receipt output.
19. `test_customer_portal_flow`: Confirms customer wallet access and catalog querying.

### 4.4 Debugging Resolution: Tier Upgrade Notification Pop-Up Disconnect & Root Cause Resolution
- **Issue Reported**: "while somebody hit the new tier a notification pop up should appear but this is not working".
- **Multi-Layer Root Cause Analysis**:
  1. **SQLite Backward-Compatibility Query Typo**: In `backend/app/db.py`, the query running on every startup (`init_db()`) had `lifetime_spend_paise >= 500000` (500,000 paise = ₹5,000) instead of `5000000` (5,000,000 paise = ₹50,000). As a result, every seeded member who had reached Silver (spend $\ge ₹5,000$) was prematurely converted into `PLATINUM`. Because almost all members were already Platinum, making purchases never triggered a tier crossing.
  2. **Pydantic Response Schema Stripping**: In `backend/app/schemas.py`, `ActionResponse` lacked `tier_upgraded: bool` and `upgrade_notification: Optional[Dict[str, Any]]`. Even when a purchase crossed a tier, FastAPI stripped those fields before sending JSON to the browser.
  3. **Frontend Event Isolation**: The notification outbox was polled in `Navbar.jsx`, but only displayed a count on the bell icon without an unprompted floating pop-up toast banner. In `MemberDetail.jsx`, `TierUpgradeModal` lacked overlay click and Escape key dismissal.
- **Systematic Fixes Implemented**:
  1. Fixed the spend threshold in `backend/app/db.py` to `lifetime_spend_paise >= 5000000` (or `lifetime_points >= 5000`).
  2. Updated `backend/app/schemas.py` with `tier_upgraded: bool = False` and `upgrade_notification: Optional[Dict[str, Any]] = None` with proper typing imports.
  3. Re-seeded `backend/seed.py` with exact verge test members:
     - `Aarav Sharma` (REGULAR, spend ₹4,750 $\to$ needs only ₹250 to unlock Silver).
     - `Simran Kaur` (SILVER, spend ₹11,000, 1400 pts $\to$ needs only ₹670 to unlock Gold).
     - `Ananya Iyer` (GOLD, spend ₹29,000, 4800 pts $\to$ needs only ₹1,000 to unlock Platinum).
  4. Added a 1-click **"⚡ Auto-Fill to Upgrade"** button in `MemberDetail.jsx` purchase modal to pre-fill the exact verge amount.
  5. Added a dual notification pop-up architecture:
     - **Celebratory Modal (`TierUpgradeModal`)**: Renders full-screen celebratory modal with tier badge, multiplier, perks, outbox alert confirmation, and Escape/click-outside handlers.
     - **Floating Pop-Up Toast**: Real-time sliding notification toast in `Navbar.jsx` triggered both via window event and outbox polling.
  6. Corrected tier thresholds in `CustomerWallet.jsx` to ₹5,000 / ₹15,000 / ₹50,000.

---

## 5. Verification & Proof of Correctness

Every requirement from the initial prompt, the counter requirements note, and the three evaluation twists (Level 1 Platinum, Level 2 Expiry/Clock, Level 3 Outbox) has been implemented, verified, and audited with zero regressions. All 19 tests pass cleanly (100% green), and end-to-end API upgrade verification confirmed `tier_upgraded: True`, full `upgrade_notification` payload, and outbox persistence.

