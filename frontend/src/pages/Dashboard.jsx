import React, { useState, useEffect } from "react";
import {
  Users,
  Award,
  Sparkles,
  Shield,
  TrendingUp,
  Gift,
  ArrowRight,
  Clock,
  Activity,
} from "lucide-react";
import { api } from "../api";
import TierBadge from "../components/TierBadge";

export default function Dashboard({ setView, onSelectMember }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard
      .getStats()
      .then((data) => setStats(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-muted)" }}>
        Loading store metrics...
      </div>
    );
  }

  const totalMembers = stats?.total_members || 0;
  const regularPct = totalMembers ? Math.round(((stats?.regular_count || 0) / totalMembers) * 100) : 0;
  const silverPct = totalMembers ? Math.round(((stats?.silver_count || 0) / totalMembers) * 100) : 0;
  const goldPct = totalMembers ? Math.round(((stats?.gold_count || 0) / totalMembers) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem" }}>Store Counter Analytics</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.95rem" }}>
            Live performance, member tier distribution, and point circulation
          </p>
        </div>
        <button onClick={() => setView("members")} className="btn-primary">
          Go to Register Counter <ArrowRight size={16} />
        </button>
      </div>

      {/* Top 4 Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
        }}
      >
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <span style={{ color: "var(--color-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Total Members</span>
            <Users size={20} color="var(--color-gold)" />
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 700, color: "var(--color-crema)" }}>
            {stats?.total_members.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--color-muted)", marginTop: "4px" }}>
            Active rewards profiles
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <span style={{ color: "var(--color-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Points Issued</span>
            <TrendingUp size={20} color="var(--success)" />
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 700, color: "var(--success)" }}>
            +{stats?.total_points_issued.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--color-muted)", marginTop: "4px" }}>
            Earned across all purchases
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <span style={{ color: "var(--color-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Points Redeemed</span>
            <Gift size={20} color="var(--color-gold)" />
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 700, color: "var(--color-gold)" }}>
            {stats?.total_points_redeemed.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--color-muted)", marginTop: "4px" }}>
            Converted into free items
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <span style={{ color: "var(--color-muted)", fontSize: "0.85rem", textTransform: "uppercase" }}>Circulating Balance</span>
            <Activity size={20} color="var(--color-amber)" />
          </div>
          <div style={{ fontSize: "2.2rem", fontWeight: 700, color: "var(--color-crema)" }}>
            {((stats?.total_points_issued || 0) - (stats?.total_points_redeemed || 0)).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--color-muted)", marginTop: "4px" }}>
            Outstanding customer liability
          </div>
        </div>
      </div>

      {/* Tier Distribution Breakdown */}
      <div className="card" style={{ padding: "2rem" }}>
        <h2 style={{ fontSize: "1.3rem", marginBottom: "1.5rem", color: "var(--color-gold)" }}>
          Member Tier Demographics
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
          {/* Regular */}
          <div style={{ background: "var(--bg-primary)", padding: "1.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--tier-regular-text)", fontWeight: 600 }}>
                <Shield size={16} /> Regular Tier
              </span>
              <strong style={{ fontSize: "1.2rem" }}>{stats?.regular_count}</strong>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginBottom: "8px" }}>
              {regularPct}% of customer base &bull; 1.0× multiplier
            </div>
            <div className="progress-bar-container" style={{ margin: 0, height: "6px" }}>
              <div className="progress-bar-fill" style={{ width: `${regularPct}%`, background: "var(--tier-regular-border)" }} />
            </div>
          </div>

          {/* Silver */}
          <div style={{ background: "var(--bg-primary)", padding: "1.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--tier-silver-text)", fontWeight: 600 }}>
                <Award size={16} /> Silver Tier
              </span>
              <strong style={{ fontSize: "1.2rem" }}>{stats?.silver_count}</strong>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginBottom: "8px" }}>
              {silverPct}% of customer base &bull; 1.5× multiplier
            </div>
            <div className="progress-bar-container" style={{ margin: 0, height: "6px" }}>
              <div className="progress-bar-fill" style={{ width: `${silverPct}%`, background: "var(--tier-silver-border)" }} />
            </div>
          </div>

          {/* Gold */}
          <div style={{ background: "var(--bg-primary)", padding: "1.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--tier-gold-text)", fontWeight: 600 }}>
                <Sparkles size={16} /> Gold VIP
              </span>
              <strong style={{ fontSize: "1.2rem" }}>{stats?.gold_count}</strong>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginBottom: "8px" }}>
              {goldPct}% of customer base &bull; 2.0× multiplier
            </div>
            <div className="progress-bar-container" style={{ margin: 0, height: "6px" }}>
              <div className="progress-bar-fill" style={{ width: `${goldPct}%`, background: "var(--tier-gold-border)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Counter Transactions Feed */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.2rem" }}>
          <Clock size={20} color="var(--color-gold)" />
          <h2 style={{ fontSize: "1.3rem" }}>Live Counter Activity Feed</h2>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Member ID</th>
                <th>Purchase (₹)</th>
                <th>Points Delta</th>
                <th>Balance Snapshot</th>
                <th>Tier At Time</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recent_transactions?.map((tx) => (
                <tr key={tx.id} onClick={() => onSelectMember(tx.member_id)}>
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
                    <span style={{ color: "var(--color-gold)", textDecoration: "underline" }}>
                      Member #{tx.member_id}
                    </span>
                  </td>
                  <td>{tx.amount_paise ? `₹${(tx.amount_paise / 100).toFixed(2)}` : "—"}</td>
                  <td>
                    <strong style={{ color: tx.points_delta > 0 ? "var(--success)" : "var(--danger)" }}>
                      {tx.points_delta > 0 ? `+${tx.points_delta}` : tx.points_delta} pts
                    </strong>
                  </td>
                  <td>{tx.balance_after.toLocaleString()} pts</td>
                  <td>
                    <TierBadge tier={tx.tier_at_transaction} />
                  </td>
                  <td style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>{tx.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
