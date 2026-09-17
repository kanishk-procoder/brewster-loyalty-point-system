import React from "react";
import { Printer, CheckCircle2, Coffee, X } from "lucide-react";

export default function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "420px",
          background: "#fff",
          color: "#1c1917",
          fontFamily: "'Courier New', Courier, monospace",
          borderRadius: "var(--radius-sm)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
          padding: "2rem 1.75rem",
        }}
      >
        {/* Receipt Header */}
        <div style={{ textAlign: "center", borderBottom: "2px dashed #a8a29e", paddingBottom: "1rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
            <Coffee size={32} color="#78350f" />
          </div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: "bold", textTransform: "uppercase", color: "#1c1917", fontFamily: "inherit" }}>
            {receipt.cafe_name}
          </h2>
          <div style={{ fontSize: "0.85rem", color: "#57534e" }}>{receipt.branch}</div>
          <div style={{ fontSize: "0.8rem", color: "#78716c", marginTop: "4px" }}>
            {receipt.date}
          </div>
          <div style={{ marginTop: "8px", fontWeight: "bold", fontSize: "0.95rem", letterSpacing: "1px" }}>
            {receipt.receipt_number}
          </div>
        </div>

        {/* Member Details */}
        <div style={{ fontSize: "0.88rem", marginBottom: "1rem", borderBottom: "1px solid #e7e5e4", paddingBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>MEMBER:</span>
            <strong>{receipt.customer_name}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
            <span>PHONE:</span>
            <span>{receipt.phone}</span>
          </div>
        </div>

        {/* Transaction Content */}
        <div style={{ marginBottom: "1.2rem", fontSize: "0.92rem" }}>
          {receipt.amount_paid_inr !== undefined && receipt.amount_paid_inr !== null ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>PURCHASE TOTAL:</span>
                <strong style={{ fontSize: "1.1rem" }}>₹{receipt.amount_paid_inr.toFixed(2)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#15803d", fontWeight: "bold", marginBottom: "6px" }}>
                <span>POINTS EARNED ({receipt.tier_applied}):</span>
                <span>+{receipt.points_earned} PTS</span>
              </div>
              {receipt.new_tier && receipt.new_tier !== receipt.tier_applied && (
                <div style={{ background: "#fef3c7", padding: "6px 8px", borderRadius: "4px", fontSize: "0.8rem", color: "#92400e", textAlign: "center", marginTop: "8px" }}>
                  🎉 CONGRATULATIONS! Upgraded to {receipt.new_tier} Tier!
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>ITEM REDEEMED:</span>
                <strong>{receipt.free_item}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#b91c1c", fontWeight: "bold", marginBottom: "6px" }}>
                <span>POINTS USED:</span>
                <span>-{receipt.points_redeemed} PTS</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#57534e", fontSize: "0.85rem", marginBottom: "6px" }}>
                <span>ITEM VALUE EQUIVALENT:</span>
                <span>₹{receipt.free_item_value_inr?.toFixed(2)} (10 pts = ₹1)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#78716c", fontSize: "0.82rem" }}>
                <span>PTS EARNED ON REDEMPTION:</span>
                <span>0 PTS</span>
              </div>
            </>
          )}
        </div>

        {/* Balance Snapshot (The Proof of Correctness) */}
        <div style={{ borderTop: "2px dashed #a8a29e", paddingTop: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem", fontWeight: "bold" }}>
            <span>LIVE BALANCE AFTER:</span>
            <span>{receipt.live_points_balance?.toLocaleString()} PTS</span>
          </div>
          <div style={{ textAlign: "center", fontSize: "0.78rem", color: "#78716c", marginTop: "8px" }}>
            Thank you for brewing with us! <br /> Points redeemable at any counter.
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              background: "#1c1917",
              color: "#fff",
              padding: "10px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            <Printer size={16} /> Print Receipt
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "#e7e5e4",
              color: "#1c1917",
              padding: "10px",
              borderRadius: "4px",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
