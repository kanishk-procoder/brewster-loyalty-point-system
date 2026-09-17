import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Coins,
  CreditCard,
  Gift,
  History,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Phone,
  User,
  Clock,
  Printer,
} from "lucide-react";
import { api } from "../api";
import TierBadge from "../components/TierBadge";
import Pagination from "../components/Pagination";
import ReceiptModal from "../components/ReceiptModal";
import TierUpgradeModal from "../components/TierUpgradeModal";

const REWARD_ITEMS = [
  { name: "Single Origin Espresso", points: 1200, value: 120 },
  { name: "Butter Croissant", points: 1500, value: 150 },
  { name: "Classic Cappuccino", points: 1800, value: 180 },
  { name: "Nitro Cold Brew", points: 2200, value: 220 },
  { name: "Caramel Macchiato", points: 2400, value: 240 },
];

export default function MemberDetail({ memberId, onBack }) {
  const [member, setMember] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txPage, setTxPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Receipt modal state
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Tier Upgrade Modal state (Level 3 Twist Pop-up)
  const [upgradeData, setUpgradeData] = useState(null);

  // Modals
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseAmountInr, setPurchaseAmountInr] = useState("");
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemPointsAmount, setRedeemPointsAmount] = useState("");
  const [freeItemName, setFreeItemName] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState("");

  const loadMemberData = useCallback(async () => {
    try {
      const data = await api.members.get(memberId);
      setMember(data);
    } catch (err) {
      setError(err.message || "Failed to load member.");
    }
  }, [memberId]);

  const loadTransactions = useCallback(async () => {
    try {
      const txData = await api.members.getTransactions(memberId, { page: txPage, limit: 10 });
      setTransactions(txData.items);
      setTxTotal(txData.total);
      setTxTotalPages(txData.total_pages);
    } catch (err) {
      console.error(err);
    }
  }, [memberId, txPage]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMemberData(), loadTransactions()]).finally(() => setLoading(false));
  }, [loadMemberData, loadTransactions]);

  if (loading && !member) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-muted)" }}>
        Loading member record...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>Member not found.</p>
        <button onClick={onBack} className="btn-secondary">
          <ArrowLeft size={16} /> Back to Member List
        </button>
      </div>
    );
  }

  // Tier progress by lifetime spend (₹) and points
  const lifetimeSpend = (member.lifetime_spend_paise || 0) / 100;
  const lifetimePoints = member.lifetime_points || 0;
  let nextTier = null;
  let neededSpend = 0;
  let progressPercent = 100;

  if (member.tier === "REGULAR" || lifetimeSpend < 5000) {
    nextTier = "SILVER";
    neededSpend = Math.max(0, 5000 - lifetimeSpend);
    progressPercent = Math.min(100, Math.floor((lifetimeSpend / 5000) * 100));
  } else if (member.tier === "SILVER" || lifetimeSpend < 15000) {
    nextTier = "GOLD";
    neededSpend = Math.max(0, 15000 - lifetimeSpend);
    const currentSpan = Math.max(0, lifetimeSpend - 5000);
    progressPercent = Math.min(100, Math.floor((currentSpan / 10000) * 100));
  } else if (member.tier === "GOLD" || (lifetimeSpend < 50000 && lifetimePoints < 5000)) {
    nextTier = "PLATINUM";
    neededSpend = Math.max(0, 50000 - lifetimeSpend);
    const currentSpan = Math.max(0, lifetimeSpend - 15000);
    progressPercent = Math.min(100, Math.floor((currentSpan / 35000) * 100));
  }

  // Live points preview with round half-up
  const enteredAmount = parseFloat(purchaseAmountInr) || 0;
  const multiplier = member.tier === "PLATINUM" ? 3.0 : member.tier === "GOLD" ? 2.0 : member.tier === "SILVER" ? 1.5 : 1.0;
  const estimatedPoints = Math.floor((enteredAmount / 10) * multiplier + 0.5);

  const handleRecordPurchase = async (e) => {
    e.preventDefault();
    setPurchaseError("");
    setPurchaseLoading(true);
    try {
      const amountPaise = Math.round(enteredAmount * 100);
      if (amountPaise <= 0) {
        throw new Error("Please enter an amount greater than ₹0.");
      }
      const previousTier = member.tier;
      const res = await api.members.recordPurchase(member.id, amountPaise);
      setMember(res.member);
      setShowPurchaseModal(false);
      setPurchaseAmountInr("");
      loadTransactions();

      const isUpgrade = Boolean(
        res.tier_upgraded ||
        (res.member && previousTier && res.member.tier !== previousTier) ||
        (res.receipt && res.receipt.new_tier && res.receipt.new_tier !== res.receipt.tier_applied)
      );

      if (isUpgrade) {
        const upgradeInfo = {
          oldTier: previousTier || res.receipt?.tier_applied || "REGULAR",
          newTier: res.member.tier || res.receipt?.new_tier || "SILVER",
          memberName: res.member.name,
          phone: res.member.phone,
          receipt: res.receipt,
        };
        setUpgradeData(upgradeInfo);
        setSuccessMsg(
          `🎉 TIER UPGRADE! ${res.member.name} promoted to ${upgradeInfo.newTier} Tier!`
        );

        // Dispatch window event for top-right live toast notification
        window.dispatchEvent(
          new CustomEvent("tier-upgrade-alert", {
            detail: {
              old_tier: upgradeInfo.oldTier,
              new_tier: upgradeInfo.newTier,
              recipient: upgradeInfo.phone,
              memberName: upgradeInfo.memberName,
              message: `Congratulations ${upgradeInfo.memberName}! You have achieved ${upgradeInfo.newTier} Tier at BrewRewards!`,
            },
          })
        );
      } else {
        setSuccessMsg(
          `Recorded purchase of ₹${enteredAmount.toFixed(2)}! Awarded +${res.transaction.points_delta} points.`
        );
        setActiveReceipt(res.receipt);
      }
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err) {
      setPurchaseError(err.message || "Failed to record purchase.");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleRedeemPoints = async (e) => {
    e.preventDefault();
    setRedeemError("");
    setRedeemLoading(true);
    try {
      const pts = parseInt(redeemPointsAmount, 10);
      if (isNaN(pts) || pts <= 0) {
        throw new Error("Please enter a positive integer of points.");
      }
      if (pts > member.points_balance) {
        throw new Error(`Cannot redeem ${pts} points. Current balance is only ${member.points_balance}.`);
      }
      const res = await api.members.redeem(member.id, pts, freeItemName || null);
      setMember(res.member);
      setShowRedeemModal(false);
      setRedeemPointsAmount("");
      setFreeItemName("");
      setSuccessMsg(`Redeemed ${pts} points! New live balance: ${res.member.points_balance} pts.`);
      setActiveReceipt(res.receipt);
      setTimeout(() => setSuccessMsg(""), 5000);
      loadTransactions();
    } catch (err) {
      setRedeemError(err.message || "Failed to redeem points.");
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Top back button */}
      <div>
        <button onClick={onBack} className="btn-secondary" style={{ padding: "8px 14px", fontSize: "0.88rem" }}>
          <ArrowLeft size={16} /> Back to Member List
        </button>
      </div>

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

      {/* Member Profile Overview Card */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(32, 25, 19, 0.95), rgba(41, 32, 25, 0.7))",
          border: "1px solid var(--border-accent)",
          padding: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "0.5rem" }}>
              <h1 style={{ fontSize: "2.2rem" }}>{member.name}</h1>
              <TierBadge tier={member.tier} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-gold)" }}>
              <Phone size={16} />
              <span style={{ fontSize: "1.1rem", fontFamily: "monospace", letterSpacing: "1px" }}>
                <span style={{ opacity: 0.7 }}>{member.country_code}</span> {member.phone_number}
              </span>
            </div>
          </div>

          {/* Big Action Buttons */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="btn-primary"
              style={{ padding: "12px 24px", fontSize: "1rem" }}
            >
              <Coins size={18} /> Record Purchase (+Pts)
            </button>
            <button
              onClick={() => setShowRedeemModal(true)}
              className="btn-secondary"
              style={{
                padding: "12px 24px",
                fontSize: "1rem",
                borderColor: "var(--color-gold)",
                color: "var(--color-gold)",
              }}
              disabled={member.points_balance <= 0}
            >
              <Gift size={18} /> Redeem Points
            </button>
          </div>
        </div>

        {/* Live Balance & Lifetime Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.5rem",
            marginTop: "2rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <div style={{ color: "var(--color-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Live Points Balance
            </div>
            <div style={{ fontSize: "2.4rem", fontWeight: 700, color: "var(--color-gold)", lineHeight: 1.2 }}>
              {member.points_balance.toLocaleString()}{" "}
              <span style={{ fontSize: "1rem", color: "var(--color-muted)", fontWeight: 400 }}>pts</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--color-muted)", marginTop: "4px" }}>
              Equivalent to ₹{(member.points_balance / 10).toFixed(2)} in free items
            </div>
          </div>

          <div>
            <div style={{ color: "var(--color-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Lifetime Café Spend
            </div>
            <div style={{ fontSize: "2.4rem", fontWeight: 700, color: "var(--color-crema)", lineHeight: 1.2 }}>
              ₹{lifetimeSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--color-muted)", marginTop: "4px" }}>
              Governs tier qualification (never demotes)
            </div>
          </div>

          <div>
            <div style={{ color: "var(--color-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Current Earning Rate
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-crema)", lineHeight: 1.2 }}>
              {member.tier === "PLATINUM" ? "3.0×" : member.tier === "GOLD" ? "2.0×" : member.tier === "SILVER" ? "1.5×" : "1.0×"}{" "}
              <span style={{ fontSize: "0.95rem", color: "var(--color-muted)", fontWeight: 400 }}>
                ({member.tier === "PLATINUM" ? "30 pts / ₹100 (0.3/₹)" : member.tier === "GOLD" ? "20 pts / ₹100" : member.tier === "SILVER" ? "15 pts / ₹100" : "10 pts / ₹100"})
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--color-gold)", marginTop: "4px" }}>
              Standard rounding (.5 upward) applied
            </div>
          </div>
        </div>

        {/* Tier Progress Bar or Pinnacle Platinum Status */}
        {nextTier ? (
          <div style={{ marginTop: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "6px" }}>
              <span>
                Progress to <strong style={{ color: nextTier === "PLATINUM" ? "var(--tier-platinum-border)" : "var(--color-gold)" }}>{nextTier} Tier</strong>
              </span>
              <span style={{ color: "var(--color-muted)" }}>
                ₹{neededSpend.toLocaleString()} remaining to unlock
              </span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${progressPercent}%`,
                  background: nextTier === "PLATINUM" ? "linear-gradient(90deg, #63d2ff, #b8ecff)" : undefined
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "8px", color: "var(--tier-platinum-text)", fontSize: "0.9rem", fontWeight: 600 }}>
            <Sparkles size={16} />
            <span>Pinnacle Tier Active — Earning maximum 0.3/₹ points rate!</span>
          </div>
        )}
      </div>

      {/* Transaction History Audit Table */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.2rem" }}>
          <History size={20} color="var(--color-gold)" />
          <h2 style={{ fontSize: "1.3rem" }}>Live Transaction Audit Ledger</h2>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Type</th>
                <th>Purchase / Item</th>
                <th>Points Delta</th>
                <th>Balance Snapshot</th>
                <th>Tier At Time</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--color-muted)" }}>
                    No transactions recorded yet for this member.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--color-gold)" }}>
                        {tx.receipt_number}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 10px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          background:
                            tx.type === "EARN" ? "rgba(46, 204, 113, 0.15)" : "rgba(231, 76, 60, 0.15)",
                          color: tx.type === "EARN" ? "var(--success)" : "var(--danger)",
                          border: `1px solid ${tx.type === "EARN" ? "rgba(46, 204, 113, 0.3)" : "rgba(231, 76, 60, 0.3)"}`,
                        }}
                      >
                        {tx.type === "EARN" ? "+ PURCHASE" : "- REDEEM"}
                      </span>
                    </td>
                    <td>
                      {tx.type === "EARN"
                        ? `₹${((tx.amount_paise || 0) / 100).toFixed(2)}`
                        : `${tx.free_item_name || "Redemption"} (₹${((tx.free_item_value_paise || 0) / 100).toFixed(2)} value)`}
                    </td>
                    <td>
                      <strong
                        style={{
                          fontSize: "1rem",
                          color: tx.points_delta > 0 ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {tx.points_delta > 0 ? `+${tx.points_delta}` : tx.points_delta} pts
                      </strong>
                    </td>
                    <td>
                      <span style={{ color: "var(--color-crema)", fontWeight: 600 }}>
                        {tx.balance_after.toLocaleString()} pts
                      </span>
                    </td>
                    <td>
                      <TierBadge tier={tx.tier_at_transaction} />
                    </td>
                    <td style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>
                      {tx.created_at}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={txPage}
          totalPages={txTotalPages}
          totalItems={txTotal}
          onPageChange={(p) => setTxPage(p)}
        />
      </div>

      {/* Record Purchase Modal */}
      {showPurchaseModal && (
        <div className="modal-overlay" onClick={() => setShowPurchaseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.4rem", color: "var(--color-gold)" }}>Record Purchase</h2>
              <button className="modal-close" onClick={() => setShowPurchaseModal(false)}>
                &times;
              </button>
            </div>

            {purchaseError && (
              <div className="alert alert-danger">
                <AlertCircle size={16} />
                <span>{purchaseError}</span>
              </div>
            )}

            <form onSubmit={handleRecordPurchase}>
              <div className="form-group">
                <label>Customer Bill Amount in Rupees (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  autoFocus
                  placeholder="e.g. 350.00"
                  value={purchaseAmountInr}
                  onChange={(e) => setPurchaseAmountInr(e.target.value)}
                  style={{ fontSize: "1.2rem", fontWeight: 600 }}
                />
              </div>

              {/* Quick Auto-Fill to Trigger Tier Upgrade */}
              {nextTier && neededSpend > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <button
                    type="button"
                    className="quick-btn"
                    onClick={() => setPurchaseAmountInr(neededSpend.toString())}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(245, 176, 65, 0.12)",
                      borderColor: "var(--color-gold)",
                      color: "var(--color-gold)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                    }}
                  >
                    <Sparkles size={16} /> Auto-Fill ₹{neededSpend.toLocaleString()} to Upgrade to {nextTier} Tier!
                  </button>
                </div>
              )}

              {/* Quick Bill Presets */}
              <div className="quick-buttons">
                {[120, 250, 450, 650, 950].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="quick-btn"
                    onClick={() => setPurchaseAmountInr(amt.toString())}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {/* Live Preview Box */}
              <div
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "1rem",
                  margin: "1.5rem 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                    Points to Award ({member.tier} {multiplier}× rate, round .5 up):
                  </div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--success)" }}>
                    +{estimatedPoints} points
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>New Live Balance:</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--color-crema)" }}>
                    {(member.points_balance + estimatedPoints).toLocaleString()} pts
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPurchaseModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={purchaseLoading || enteredAmount <= 0}
                  style={{ flex: 1 }}
                >
                  {purchaseLoading ? "Processing..." : "Confirm & Issue Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redeem Points Modal */}
      {showRedeemModal && (
        <div className="modal-overlay" onClick={() => setShowRedeemModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "540px" }}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.4rem", color: "var(--color-gold)" }}>Redeem for Free Items</h2>
              <button className="modal-close" onClick={() => setShowRedeemModal(false)}>
                &times;
              </button>
            </div>

            {redeemError && (
              <div className="alert alert-danger">
                <AlertCircle size={16} />
                <span>{redeemError}</span>
              </div>
            )}

            <div style={{ marginBottom: "1rem", fontSize: "0.95rem" }}>
              Current Available Balance:{" "}
              <strong style={{ color: "var(--color-gold)" }}>
                {member.points_balance.toLocaleString()} pts
              </strong>{" "}
              <span style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>
                (Rule: 10 points = ₹1 value)
              </span>
            </div>

            {/* Quick Free Item Selector */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.85rem", color: "var(--color-muted)", display: "block", marginBottom: "6px" }}>
                Select Free Item from Menu:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "6px" }}>
                {REWARD_ITEMS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    disabled={item.points > member.points_balance}
                    onClick={() => {
                      setRedeemPointsAmount(item.points.toString());
                      setFreeItemName(item.name);
                    }}
                    className="quick-btn"
                    style={{
                      textAlign: "left",
                      opacity: item.points > member.points_balance ? 0.4 : 1,
                      borderColor: freeItemName === item.name ? "var(--color-gold)" : "var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>{item.name}</div>
                    <div style={{ color: "var(--color-gold)", fontSize: "0.78rem" }}>
                      {item.points} pts (₹{item.value})
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleRedeemPoints}>
              <div className="form-group">
                <label>Points to Redeem (or enter custom)</label>
                <input
                  type="number"
                  min="1"
                  max={member.points_balance}
                  required
                  placeholder="e.g. 1500"
                  value={redeemPointsAmount}
                  onChange={(e) => setRedeemPointsAmount(e.target.value)}
                  style={{ fontSize: "1.1rem", fontWeight: 600 }}
                />
              </div>

              <div className="form-group">
                <label>Item Name / Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Medium Cappuccino"
                  value={freeItemName}
                  onChange={(e) => setFreeItemName(e.target.value)}
                />
              </div>

              <div
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.85rem 1rem",
                  margin: "1rem 0",
                  fontSize: "0.88rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-muted)" }}>Free Item Value Equivalent:</span>
                  <strong style={{ color: "var(--color-gold)" }}>
                    ₹{((parseInt(redeemPointsAmount, 10) || 0) / 10).toFixed(2)}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                  <span style={{ color: "var(--color-muted)" }}>Remaining Balance After:</span>
                  <strong style={{ color: "var(--color-crema)" }}>
                    {Math.max(0, member.points_balance - (parseInt(redeemPointsAmount, 10) || 0)).toLocaleString()} pts
                  </strong>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: "6px" }}>
                  &bull; Free redemption awards 0 new points. Lifetime spend and tier are NEVER reduced.
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowRedeemModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={redeemLoading || !redeemPointsAmount}
                  style={{ flex: 1 }}
                >
                  {redeemLoading ? "Redeeming..." : "Confirm Redemption"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}

      {/* Celebratory Tier Upgrade Pop-up Modal */}
      {upgradeData && (
        <TierUpgradeModal
          upgradeData={upgradeData}
          onClose={() => setUpgradeData(null)}
          onViewReceipt={(receipt) => {
            setUpgradeData(null);
            setActiveReceipt(receipt);
          }}
        />
      )}
    </div>
  );
}
