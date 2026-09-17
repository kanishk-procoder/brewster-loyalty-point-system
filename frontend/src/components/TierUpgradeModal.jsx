import React from "react";
import { Sparkles, Crown, Award, Shield, ArrowRight, Bell, CheckCircle2, X } from "lucide-react";
import TierBadge from "./TierBadge";

export default function TierUpgradeModal({ upgradeData, onClose, onViewReceipt }) {
  if (!upgradeData) return null;

  const {
    oldTier = "REGULAR",
    newTier = "SILVER",
    memberName = "Valued Member",
    phone = "",
    receipt = null,
  } = upgradeData;

  const getTierPerk = (tier) => {
    const t = (tier || "").toUpperCase();
    if (t === "PLATINUM") {
      return {
        title: "Pinnacle Tier Unlocked!",
        rate: "3.0× points (0.3/₹)",
        desc: "Highest earning rate at BrewRewards! Maximum loyalty acceleration on every coffee purchase.",
        color: "var(--tier-platinum-border)",
        bg: "rgba(99, 210, 255, 0.12)",
      };
    }
    if (t === "GOLD") {
      return {
        title: "Gold VIP Status Achieved!",
        rate: "2.0× points (0.2/₹)",
        desc: "Double points on every purchase! Faster redemption for premium coffees and pastries.",
        color: "var(--color-gold)",
        bg: "rgba(245, 176, 65, 0.12)",
      };
    }
    return {
      title: "Silver Status Achieved!",
      rate: "1.5× points (0.15/₹)",
      desc: "50% more points on every cup! Keep climbing toward Gold and Platinum.",
      color: "var(--tier-silver-border)",
      bg: "rgba(160, 174, 192, 0.12)",
    };
  };

  const perk = getTierPerk(newTier);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 1100, backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="card modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "520px",
          width: "90%",
          textAlign: "center",
          padding: "2.5rem 2rem",
          position: "relative",
          border: `2px solid ${perk.color}`,
          boxShadow: `0 0 35px ${perk.color}40`,
          background: "linear-gradient(180deg, #1c150f 0%, #110c08 100%)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            color: "var(--color-muted)",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Celebratory Icon with Glow */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: perk.bg,
            border: `2px solid ${perk.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
            boxShadow: `0 0 25px ${perk.color}60`,
            color: perk.color,
          }}
        >
          {newTier === "PLATINUM" ? (
            <Crown size={42} />
          ) : newTier === "GOLD" ? (
            <Sparkles size={42} />
          ) : (
            <Award size={42} />
          )}
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: perk.color, fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "0.5rem" }}>
          <Sparkles size={16} /> Tier Upgrade Notification
        </div>

        <h2 style={{ fontSize: "2rem", fontFamily: "var(--font-heading)", color: "var(--color-crema)", marginBottom: "0.5rem", lineHeight: 1.2 }}>
          {perk.title}
        </h2>

        <p style={{ color: "var(--color-muted)", fontSize: "1rem", marginBottom: "1.5rem" }}>
          <strong style={{ color: "var(--color-crema)" }}>{memberName}</strong> has crossed into a new rewards tier!
        </p>

        {/* Tier Transition Visual */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            background: "var(--bg-primary)",
            padding: "1rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            marginBottom: "1.5rem",
          }}
        >
          <TierBadge tier={oldTier} />
          <ArrowRight size={20} color="var(--color-muted)" />
          <TierBadge tier={newTier} />
        </div>

        {/* New Tier Perks Box */}
        <div
          style={{
            background: perk.bg,
            border: `1px solid ${perk.color}50`,
            borderRadius: "var(--radius-sm)",
            padding: "1.25rem",
            textAlign: "left",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--color-muted)", textTransform: "uppercase" }}>New Earning Multiplier</span>
            <strong style={{ color: perk.color, fontSize: "1.1rem" }}>{perk.rate}</strong>
          </div>
          <p style={{ fontSize: "0.9rem", color: "var(--color-crema)", margin: 0 }}>
            {perk.desc}
          </p>
        </div>

        {/* Outbox Dispatch Badge (Level 3 Twist) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "0.85rem",
            color: "var(--success)",
            background: "rgba(46, 204, 113, 0.1)",
            padding: "8px 12px",
            borderRadius: "var(--radius-full)",
            border: "1px solid rgba(46, 204, 113, 0.25)",
            marginBottom: "1.75rem",
          }}
        >
          <CheckCircle2 size={15} />
          <span>Notification Service: Alert dispatched to <strong>{phone || "member"}</strong></span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px" }}>
          {receipt && (
            <button
              onClick={() => {
                onClose();
                if (onViewReceipt) onViewReceipt(receipt);
              }}
              className="btn-secondary"
              style={{ flex: 1, padding: "12px" }}
            >
              View Receipt
            </button>
          )}
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ flex: 1, padding: "12px", background: perk.color, color: "#000", fontWeight: 700 }}
          >
            Awesome! Continue
          </button>
        </div>
      </div>
    </div>
  );
}
