import React from "react";
import { Award, Shield, Sparkles, Crown } from "lucide-react";

export default function TierBadge({ tier }) {
  const tierUpper = (tier || "REGULAR").toUpperCase();

  if (tierUpper === "PLATINUM") {
    return (
      <span className="tier-badge platinum">
        <Crown size={14} /> Platinum
      </span>
    );
  }

  if (tierUpper === "GOLD") {
    return (
      <span className="tier-badge gold">
        <Sparkles size={14} /> Gold
      </span>
    );
  }

  if (tierUpper === "SILVER") {
    return (
      <span className="tier-badge silver">
        <Award size={14} /> Silver
      </span>
    );
  }

  return (
    <span className="tier-badge regular">
      <Shield size={14} /> Regular
    </span>
  );
}
