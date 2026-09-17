import os
import tempfile
import pytest

# Create a temporary file database for integration tests
temp_db = tempfile.NamedTemporaryFile(suffix="_test.db", delete=False)
temp_db_path = temp_db.name
temp_db.close()

import app.config
app.config.DB_PATH = temp_db_path
import app.db
app.db.DB_PATH = temp_db_path

from fastapi.testclient import TestClient
from app.main import app
from app.db import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db(temp_db_path)
    yield
    try:
        if os.path.exists(temp_db_path):
            os.remove(temp_db_path)
    except Exception:
        pass

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_auth_flow(client):
    # Register staff
    reg_resp = client.post(
        "/api/auth/register",
        json={"name": "Test Staff", "email": "test@cafe.com", "password": "Password123", "role": "STAFF"}
    )
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert "access_token" in data
    token = data["access_token"]
    assert data["user"]["role"] == "STAFF"

    # Login staff
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "test@cafe.com", "password": "Password123"}
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["access_token"]

    # Get /me with token
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "test@cafe.com"


def test_member_crud_and_search(client):
    # Create member with country_code & phone_number
    res = client.post(
        "/api/members",
        json={"name": "Rajesh Khanna", "country_code": "+91", "phone_number": "9820011223"}
    )
    assert res.status_code == 201
    member = res.json()
    assert member["name"] == "Rajesh Khanna"
    assert member["country_code"] == "+91"
    assert member["phone_number"] == "9820011223"
    assert member["phone"] == "+919820011223"
    assert member["points_balance"] == 0
    assert member["tier"] == "REGULAR"

    # Duplicate phone rejection
    dup_res = client.post(
        "/api/members",
        json={"name": "Another Person", "country_code": "+91", "phone_number": "9820011223"}
    )
    assert dup_res.status_code == 400

    # Search by partial phone
    search_res = client.get("/api/members?query=98200")
    assert search_res.status_code == 200
    data = search_res.json()
    assert data["total"] >= 1
    assert any(m["phone_number"] == "9820011223" for m in data["items"])


def test_purchase_redemption_and_receipt(client):
    # Create a fresh member
    create_res = client.post(
        "/api/members",
        json={"name": "Mira Rajput", "country_code": "+91", "phone_number": "9819998877"}
    )
    member_id = create_res.json()["id"]

    # Record purchase: ₹500.00 = 50000 paise
    p_res = client.post(f"/api/members/{member_id}/purchases", json={"amount_paise": 50000})
    assert p_res.status_code == 200
    p_data = p_res.json()
    assert p_data["member"]["points_balance"] == 50
    assert p_data["transaction"]["points_delta"] == 50
    assert "receipt" in p_data
    assert p_data["receipt"]["points_earned"] == 50
    assert p_data["receipt"]["amount_paid_inr"] == 500.0

    # Redeem 20 points for "Espresso Shot"
    r_res = client.post(
        f"/api/members/{member_id}/redemptions",
        json={"points": 20, "free_item_name": "Espresso Shot"}
    )
    assert r_res.status_code == 200
    r_data = r_res.json()
    assert r_data["member"]["points_balance"] == 30
    assert r_data["transaction"]["points_delta"] == -20
    assert r_data["receipt"]["free_item"] == "Espresso Shot"
    assert r_data["receipt"]["points_earned_on_redemption"] == 0

    # Over-redemption fails with 409
    over_res = client.post(f"/api/members/{member_id}/redemptions", json={"points": 500})
    assert over_res.status_code == 409


def test_customer_portal_flow(client):
    # Register a customer linked to phone 9819998877
    reg_resp = client.post(
        "/api/auth/register",
        json={
            "name": "Mira Customer",
            "email": "mira@customer.com",
            "password": "Password123",
            "role": "CUSTOMER",
            "phone": "9819998877"
        }
    )
    assert reg_resp.status_code == 201
    cust_token = reg_resp.json()["access_token"]

    # Customer accesses wallet
    wallet_resp = client.get(
        "/api/customer/wallet",
        headers={"Authorization": f"Bearer {cust_token}"}
    )
    assert wallet_resp.status_code == 200
    w_data = wallet_resp.json()
    assert w_data["member"]["phone_number"] == "9819998877"
    assert "available_rewards" in w_data
