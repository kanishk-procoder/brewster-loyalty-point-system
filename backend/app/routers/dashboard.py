from fastapi import APIRouter
from app.db import get_db
from app.schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats():
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN tier = 'REGULAR' THEN 1 ELSE 0 END) as regular_cnt,
                SUM(CASE WHEN tier = 'SILVER' THEN 1 ELSE 0 END) as silver_cnt,
                SUM(CASE WHEN tier = 'GOLD' THEN 1 ELSE 0 END) as gold_cnt,
                COALESCE(SUM(lifetime_spend_paise), 0) as total_spend_paise
            FROM members;
        """)
        row = cursor.fetchone()
        total_members = row["total"] or 0
        regular_count = row["regular_cnt"] or 0
        silver_count = row["silver_cnt"] or 0
        gold_count = row["gold_cnt"] or 0
        total_revenue_inr = (row["total_spend_paise"] or 0) / 100

        cursor = conn.execute("""
            SELECT
                COALESCE(SUM(CASE WHEN type = 'EARN' THEN points_delta ELSE 0 END), 0) as issued,
                COALESCE(SUM(CASE WHEN type = 'REDEEM' THEN ABS(points_delta) ELSE 0 END), 0) as redeemed
            FROM point_transactions;
        """)
        tx_row = cursor.fetchone()
        total_points_issued = tx_row["issued"]
        total_points_redeemed = tx_row["redeemed"]

        cursor = conn.execute("""
            SELECT * FROM point_transactions
            ORDER BY created_at DESC, id DESC
            LIMIT 10;
        """)
        recent_transactions = [dict(r) for r in cursor.fetchall()]

        return {
            "total_members": total_members,
            "regular_count": regular_count,
            "silver_count": silver_count,
            "gold_count": gold_count,
            "total_points_issued": total_points_issued,
            "total_points_redeemed": total_points_redeemed,
            "total_revenue_inr": total_revenue_inr,
            "recent_transactions": recent_transactions,
        }
