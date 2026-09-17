import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Coffee,
  Sparkles,
  Gift,
  CheckCircle2,
  AlertCircle,
  History,
  TrendingUp,
} from "lucide-react";
import { api } from "../api";
import TierBadge from "../components/TierBadge";
import ReceiptModal from "../components/ReceiptModal";

export default function CustomerWallet() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [redeemingItemId, setRedeemingItemId] = useState(null);

  const fetchWallet = useCallback(async () => {
    try {
      const data = await api.customer.getWallet();
      setWallet(data);
    } catch (err) {
      setError(err.message || "Failed to load loyalty wallet.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleRedeemItem = async (item) => {
    setError("");
    setSuccessMsg("");
    setRedeemingItemId(item.id);

    try {
      const res = await api.customer.redeem(item.points_required, item.name);
      setSuccessMsg(`Enjoy your ${item.name}! -${item.points_required} points deducted.`);
      setActiveReceipt(res.receipt);
      // Immediately refresh wallet
      fetchWallet();
    } catch (err) {
      setError(err.message || "Could not redeem item.");
    } finally {
      setRedeemingItemId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-muted)" }}>
        Loading your loyalty wallet...
      </div>
    );
  }

  if (error && !wallet) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <div className="alert alert-danger" style={{ marginBottom: "1.5rem" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
        <p style={{ color: "var(--color-muted)" }}>
          Please make sure your account is linked to a customer membership.
        </p>
      </div>
    );
  }

  const member = wallet?.member;
  const currentBalance = member?.points_balance || 0;
  const lifetimeSpend = (member?.lifetime_spend_paise || 0) / 100;

  // Next tier progress
  let nextTier = null;
  let neededSpend = 0;
  let progressPct = 100;
  let tierRateLabel = "3.0× (0.3/₹)";

  if (member?.tier === "REGULAR" || lifetimeSpend < 5000) {
    nextTier = "SILVER";
    neededSpend = Math.max(0, 5000 - lifetimeSpend);
    progressPct = Math.min(100, Math.floor((lifetimeSpend / 5000) * 100));
    tierRateLabel = "1.5× (0.15/₹)";
  } else if (member?.tier === "SILVER" || lifetimeSpend < 15000) {
    nextTier = "GOLD";
    neededSpend = Math.max(0, 15000 - lifetimeSpend);
    const span = Math.max(0, lifetimeSpend - 5000);
    progressPct = Math.min(100, Math.floor((span / 10000) * 100));
    tierRateLabel = "2.0× (0.20/₹)";
  } else if (member?.tier === "GOLD" || (lifetimeSpend < 50000 && (member?.lifetime_points || 0) < 5000)) {
    nextTier = "PLATINUM";
    neededSpend = Math.max(0, 50000 - lifetimeSpend);
    const span = Math.max(0, lifetimeSpend - 15000);
    progressPct = Math.min(100, Math.floor((span / 35000) * 100));
    tierRateLabel = "3.0× (0.3/₹)";
  }

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Notifications */}
      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Digital Loyalty Card */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #2b1e15, #17100a)",
          border: "1px solid var(--border-accent)",
          padding: "2.5rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--color-gold)", marginBottom: "0.5rem" }}>
              <Coffee size={24} />
              <span style={{ fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", fontSize: "0.9rem" }}>
                BrewRewards Member Pass
              </span>
            </div>
            <h1 style={{ fontSize: "2.4rem", marginBottom: "0.25rem" }}>{member?.name}</h1>
            <div style={{ color: "var(--color-muted)", fontFamily: "monospace", fontSize: "1.1rem" }}>
              {member?.phone}
            </div>
          </div>

          <div>
            <TierBadge tier={member?.tier} />
          </div>
        </div>

        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ color: "var(--color-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>
              Available Points Wallet
            </div>
            <div style={{ fontSize: "3rem", fontWeight: 700, color: "var(--color-gold)", lineHeight: 1.1 }}>
              {currentBalance.toLocaleString()}{" "}
              <span style={{ fontSize: "1.1rem", color: "var(--color-muted)", fontWeight: 400 }}>PTS</span>
            </div>
            <div style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
              Equivalent to ₹{(currentBalance / 10).toFixed(2)} in free items (10 pts = ₹1)
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ color: "var(--color-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>
              Lifetime Spend
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--color-crema)" }}>
              ₹{lifetimeSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Progress to Next Tier or Platinum Pinnacle */}
        {nextTier ? (
          <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "8px" }}>
              <span>
                Road to <strong style={{ color: nextTier === "PLATINUM" ? "var(--tier-platinum-border)" : "var(--color-gold)" }}>{nextTier} Tier</strong> ({tierRateLabel} multiplier)
              </span>
              <span style={{ color: "var(--color-muted)" }}>
                Need {neededSpend.toLocaleString()} more to unlock
              </span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%`, background: nextTier === "PLATINUM" ? "linear-gradient(90deg, #63d2ff, #b8ecff)" : undefined }} />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "8px", color: "var(--tier-platinum-text)" }}>
            <Sparkles size={16} />
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              Pinnacle Tier Unlocked — Earning points at top Platinum rate (0.3/₹)!
            </span>
          </div>
        )}
      </div>

      {/* Rewards Catalog - Redeem for Free Items */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.5rem" }}>
          <Gift size={22} color="var(--color-gold)" />
          <h2 style={{ fontSize: "1.4rem" }}>Redeem Free Items</h2>
        </div>
        <p style={{ color: "var(--color-muted)", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          10 points = ₹1 of item value. Tap any eligible item to claim your voucher instantly.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          {wallet?.available_rewards?.map((item) => (
            <div
              key={item.id}
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <h3 style={{ fontSize: "1.1rem" }}>{item.name}</h3>
                  <span style={{ color: "var(--color-gold)", fontWeight: 600, fontSize: "0.95rem" }}>
                    ₹{item.inr_value}
                  </span>
                </div>
                <div style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>
                  Cost: <strong style={{ color: "var(--color-gold)" }}>{item.points_required.toLocaleString()} pts</strong>
                </div>
              </div>

              <div>
                {item.can_redeem ? (
                  <button
                    onClick={() => handleRedeemItem(item)}
                    disabled={redeemingItemId === item.id}
                    className="btn-primary"
                    style={{ width: "100%", padding: "8px", fontSize: "0.88rem" }}
                  >
                    {redeemingItemId === item.id ? "Redeeming..." : "Redeem Now"}
                  </button>
                ) : (
                  <div style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--color-muted)", background: "rgba(255,255,255,0.03)", padding: "8px", borderRadius: "var(--radius-sm)" }}>
                    Need {item.points_short.toLocaleString()} more pts
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Member Personal Transaction History */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.2rem" }}>
          <History size={20} color="var(--color-gold)" />
          <h2 style={{ fontSize: "1.3rem" }}>Your Point History</h2>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Details</th>
                <th>Points Change</th>
                <th>Balance Snapshot</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {wallet?.recent_transactions?.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--color-muted)" }}>
                    No points transactions yet.
                  </td>
                </tr>
              ) : (
                wallet?.recent_transactions?.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          background:
                            tx.type === "EARN" ? "rgba(46, 204, 113, 0.15)" : "rgba(231, 76, 60, 0.15)",
                          color: tx.type === "EARN" ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {tx.type === "EARN" ? "EARNED" : "REDEEMED"}
                      </span>
                    </td>
                    <td>
                      {tx.type === "EARN"
                        ? `Purchase: ₹${((tx.amount_paise || 0) / 100).toFixed(2)}`
                        : tx.free_item_name || "Point Redemption"}
                    </td>
                    <td>
                      <strong style={{ color: tx.points_delta > 0 ? "var(--success)" : "var(--danger)" }}>
                        {tx.points_delta > 0 ? `+${tx.points_delta}` : tx.points_delta} pts
                      </strong>
                    </td>
                    <td>{tx.balance_after.toLocaleString()} pts</td>
                    <td style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>{tx.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
}
