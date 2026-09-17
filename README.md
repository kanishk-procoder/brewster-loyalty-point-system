# ☕ BrewRewards — Café Loyalty & Counter Platform

A high-precision, full-stack customer loyalty, counter-operations, and customer wallet system built for café chains of any size. Counter staff can look up members across large customer directories by phone number, record purchases with tier-accelerated point calculations, and print bills/receipts. Customers can sign in, view their live points wallet and tier, and self-redeem eligible free items.

---

## 🚀 Key Highlights & Confirmed Business Rules

- **Tier Qualification & Multipliers**:
  - **Regular**: 0 to ₹4,999 lifetime spend &bull; Earns **1 point per ₹10** spent (0.1/₹, 1.0×).
  - **Silver**: Begins at **₹5,000** lifetime spend &bull; Earns **1.5 points per ₹10** spent (0.15/₹, 1.5×).
  - **Gold**: Begins at **₹15,000** lifetime spend &bull; Earns **2.0 points per ₹10** spent (0.2/₹, 2.0×).
  - **Platinum (Level 1 Twist)**: Begins at **lifetime ≥ 5000** points &bull; Earns **0.3/₹** (3.0 points per ₹10 spent, 3.0×).
  - *Backward-Compatibility*: Existing members' tiers and balances remain strictly unchanged unless their lifetime points/spend now qualifies them for Platinum.
- **90-Day Inactivity Expiration (Level 2 Twist)**:
  - Points expire if unused for 90 days.
  - Automated job expires stale points, adjusts member balances, and logs an `EXPIRE` ledger entry.
  - Triggered & graded via `POST /clock` (and `POST /api/clock`) or automated cron.
  - FIFO deduction ensures points redeemed for rewards are never expired twice.
- **Notification Service Outbox (Level 3 Twist)**:
  - When a member crosses into a new tier upon recording a purchase, a congratulatory notification is published to the Notification Service outbox.
  - Inspected and graded via `GET /outbox` (and `GET /api/outbox`).
- **Tie-Breaking Rounding Rule**: Fractional points use standard rounding where **.5 and above rounds upward** (e.g., $37.5 \to 38$ points).
- **Redemption Value Rule**: **10 points = ₹1 of free-item value** (1 point = 10 paise value).
- **Zero Points on Redemptions**: Free item redemptions award **0 new points**.
- **Tier Stability Guarantee**: Point redemptions deduct from `points_balance` only. `lifetime_spend_paise` and tier are **never** reduced.
- **Separate Country Code**: Phone country code (e.g. `+91`) and local phone number are stored and indexed separately.
- **Atomic Concurrency Protection**: SQLite raw SQL transactions executed via `BEGIN IMMEDIATE` guarantee zero race conditions across counter registers.
- **Dual Role System**:
  - **Staff / Barista**: Counter lookup, purchase recording, bill receipt generation, counter redemption.
  - **Customer**: Personal loyalty wallet, live points balance pass, one-tap catalog self-redemption.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.10+, FastAPI, Pydantic v2
- **Database**: SQLite3 (raw parameterized SQL, WAL mode, foreign keys, multi-column indexes)
- **Security & Auth**: PyJWT, bcrypt password hashing, role-based access control (RBAC)
- **Testing**: pytest, HTTPX TestClient (19 automated unit & integration tests)
- **Frontend**: React 18 / 19, Vite, Lucide Icons, Plain Vanilla CSS design system

---

## 🏃 Quick Setup & Run Instructions

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
python -m pip install -r requirements.txt

# Seed sample database (creates staff, customer VIP, sample members across all tiers)
python seed.py

# Start the FastAPI backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
> **Note on Windows `[WinError 10013]`**: If you encounter a socket permission or port in use error, another process may be occupying port 8000. Run `netstat -ano | findstr :8000` to find the process PID and kill it (`taskkill /F /PID <PID>`), or use `--host 127.0.0.1 --port 8000`.

- **Swagger Interactive API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **API Base**: `http://127.0.0.1:8000/api`

#### Pre-Configured Demo Accounts:
- **Staff (Counter Barista)**: `admin@brewrewards.com` / `Admin@1234`
- **Customer (Gold VIP)**: `customer@brewrewards.com` / `Customer@1234`

---

### 2. Frontend Setup

In a separate terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install packages
cmd /c npm install

# Start the Vite development server
cmd /c npm run dev
```
- **Web Application**: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Running Automated Tests & Debugging

### Run Test Suite
```bash
cd backend
python -m pytest tests/ -v
```

The test suite consists of 19 tests across 3 modules:
1. `test_points.py`:
   - Round half-up tie rule verification ($10.5 \to 11$, $37.5 \to 38$)
   - New member initialization (0 balance, Regular tier)
   - Base Regular earn rates (1 point per ₹10 spent)
   - Silver boundary detection (₹5,000 lifetime spend) & 1.5× rate
   - Gold boundary detection (₹15,000 lifetime spend) & 2.0× rate
   - Threshold-crossing transactions applying pre-purchase tier rate
   - Redemption converting 10 points to ₹1 item value
   - Zero points awarded on redemptions
   - Redemption reducing `points_balance` without demoting tier or lifetime spend
   - Atomic over-redemption rejections (HTTP 409 Conflict)
   - Validation of negative or zero purchase amounts
2. `test_twists.py`:
   - **Level 1 Twist**: Platinum tier earns 0.3/₹ (3.0 pts per ₹10).
   - **Level 1 Twist**: Backward-compatibility test verifying existing members < 5000 lifetime keep tier/balance, and qualifying members promote to Platinum.
   - **Level 1 Twist**: Threshold-crossing into Platinum uses pre-upgrade tier rate and enables 0.3/₹ for subsequent purchases.
   - **Level 2 Twist**: 90-day inactivity expiration job via `POST /clock` logs `EXPIRE` transactions and decrements balance.
   - **Level 2 Twist**: FIFO redemption unredeemed points tracking prevents double-expiration.
   - **Level 3 Twist**: Outbox captures tier-crossing notifications with recipient phone, old tier, new tier, and message.
   - **Evaluation APIs**: End-to-end HTTP verification of `/clock`, `/clock/reset`, and `/outbox`.
3. `test_api.py`:
   - Staff and Customer registration, login, and JWT verification
   - Member creation with separate country code and phone number
   - Partial phone lookup and name search
   - Live purchase and redemption endpoints with receipt generation
   - Customer self-service wallet and reward catalog eligibility

---

## 📡 Complete REST API Endpoint Specification

All endpoints are prefixed with `/api`.

| Method | Endpoint | Description | Request Body / Query Params | Status Codes |
|---|---|---|---|:---:|
| `POST` | `/api/auth/register` | Register staff or customer account | `{ "name": "...", "email": "...", "password": "...", "role": "STAFF"|"CUSTOMER", "phone"?: "..." }` | `201`, `400` |
| `POST` | `/api/auth/login` | Authenticate & receive JWT | `{ "email": "...", "password": "..." }` | `200`, `401` |
| `GET` | `/api/auth/me` | Current authenticated user profile | Header: `Authorization: Bearer <token>` | `200`, `401` |
| `POST` | `/api/members` | Register new café member | `{ "name": "...", "country_code": "+91", "phone_number": "9876543210" }` | `201`, `400` |
| `GET` | `/api/members` | Paginated search & sort members | Query: `query`, `page`, `limit`, `sort`, `order` | `200` |
| `GET` | `/api/members/{id}` | Get single member record & balance | Path: `id` | `200`, `404` |
| `PUT` | `/api/members/{id}` | Update member profile | `{ "name"?: "...", "country_code"?: "...", "phone_number"?: "..." }` | `200`, `400`, `404` |
| `POST` | `/api/members/{id}/purchases` | Record purchase & issue receipt | `{ "amount_paise": 25000 }` (integer paise) | `200`, `400`, `404` |
| `POST` | `/api/members/{id}/redemptions` | Redeem points for free items | `{ "points": 1500, "free_item_name"?: "Croissant" }` | `200`, `400`, `404`, `409` |
| `GET` | `/api/members/{id}/transactions` | Paginated member transaction history | Query: `page`, `limit` | `200`, `404` |
| `GET` | `/api/customer/wallet` | Customer's live wallet & catalog | Header: `Authorization: Bearer <token>` | `200`, `404` |
| `POST` | `/api/customer/redeem` | Customer self-redeems free item | `{ "points": 1200, "free_item_name"?: "Espresso" }` | `200`, `400`, `409` |
| `GET` | `/api/customer/catalog` | List of free reward items & point costs | None | `200` |
| `GET` | `/api/dashboard/stats` | Aggregate store metrics & revenue | None | `200` |
| `POST` | `/clock`, `/api/clock` | Set/advance virtual clock & run expiry job (Level 2) | `{ "current_time"?: "ISO", "days"?: 90, "seconds"?: int }` | `200`, `400` |
| `GET` | `/clock`, `/api/clock` | Read current virtual clock | None | `200` |
| `POST` | `/clock/reset`, `/api/clock/reset` | Reset virtual clock to system time | None | `200` |
| `GET` | `/outbox`, `/api/outbox` | Read tier-upgrade notifications (Level 3) | Query: `member_id` (optional) | `200` |
| `DELETE` | `/outbox`, `/api/outbox` | Clear notification outbox | None | `200` |
| `POST` | `/outbox/clear`, `/api/outbox/clear` | Clear notification outbox | None | `200` |
| `GET` | `/api/health` | Service health probe | None | `200` |
