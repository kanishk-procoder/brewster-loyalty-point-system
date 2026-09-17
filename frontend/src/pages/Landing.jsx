import React from "react";
import {
  Coffee,
  Award,
  Zap,
  ShieldCheck,
  Smartphone,
  Gift,
  Store,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function Landing({ setView }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4rem", paddingBottom: "4rem" }}>
      {/* Hero Section */}
      <section
        style={{
          textAlign: "center",
          padding: "4rem 1rem 2rem",
          maxWidth: "850px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(229, 152, 46, 0.15)",
            border: "1px solid rgba(229, 152, 46, 0.4)",
            borderRadius: "var(--radius-full)",
            padding: "6px 16px",
            color: "var(--color-gold)",
            fontSize: "0.88rem",
            fontWeight: 600,
            marginBottom: "1.5rem",
          }}
        >
          <Coffee size={16} /> The High-Precision Loyalty Platform for Coffee Chains
        </div>

        <h1
          style={{
            fontSize: "clamp(2.5rem, 5vw, 3.8rem)",
            lineHeight: 1.15,
            marginBottom: "1.5rem",
            letterSpacing: "-0.5px",
          }}
        >
          Every Point Accounted For. <br />
          <span
            style={{
              background: "linear-gradient(135deg, var(--color-gold), #c27d1d)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Every Member Rewarded.
          </span>
        </h1>

        <p
          style={{
            fontSize: "1.2rem",
            color: "var(--color-muted)",
            maxWidth: "680px",
            margin: "0 auto 2.5rem",
          }}
        >
          A fast, zero-drift rewards counter built for baristas. Record purchases in seconds,
          accelerate regulars into higher tiers, and redeem treats with guaranteed live accuracy.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setView("members")}
            className="btn-primary"
            style={{ fontSize: "1.05rem", padding: "14px 28px" }}
          >
            Open Barista Counter <ArrowRight size={18} />
          </button>
          <button
            onClick={() => setView("login")}
            className="btn-secondary"
            style={{ fontSize: "1.05rem", padding: "14px 28px" }}
          >
            Staff Login
          </button>
        </div>
      </section>

      {/* 1. What It Is */}
      <section className="card" style={{ padding: "2.5rem" }}>
        <h2 style={{ fontSize: "1.8rem", color: "var(--color-gold)", marginBottom: "1rem" }}>
          1. What It Is
        </h2>
        <p style={{ color: "var(--color-crema)", fontSize: "1.05rem", lineHeight: 1.8 }}>
          <strong>BrewRewards</strong> is an enterprise-ready customer loyalty and counter-operations
          system designed specifically for high-volume café chains. Unlike generic point tools prone
          to floating-point inaccuracies and sluggish search, BrewRewards operates on an
          <strong> integer-based paise ledger</strong> with ACID-compliant SQLite transactions.
          When queues stretch out the door, counter staff can look up a customer in milliseconds by
          phone number, award tier-multiplied points, and redeem rewards with live, audit-backed balances.
        </p>
      </section>

      {/* 2. Key Features */}
      <section>
        <h2 style={{ fontSize: "1.8rem", color: "var(--color-gold)", marginBottom: "1.5rem" }}>
          2. Key Features
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.5rem",
          }}
        >
          <div className="card">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-sm)",
                background: "rgba(229, 152, 46, 0.2)",
                color: "var(--color-gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Sub-Millisecond Lookup</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.95rem" }}>
              B-Tree indexed phone search handles thousands of regulars effortlessly. Cashiers type
              partial digits and find the right member before the coffee finishes brewing.
            </p>
          </div>

          <div className="card">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-sm)",
                background: "rgba(160, 174, 192, 0.2)",
                color: "var(--tier-silver-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <Award size={24} />
            </div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Accelerated Tier Progression</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.95rem" }}>
              Automatic promotions: Regular (1.0×) &rarr; Silver (1.5×) &rarr; Gold (2.0×) &rarr; Platinum (0.3/₹, 3.0× at 5,000 pts).
              Tiers track lifetime points, so redemptions never demote loyal customers.
            </p>
          </div>

          <div className="card">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-sm)",
                background: "rgba(46, 204, 113, 0.2)",
                color: "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Atomic Audit Ledger</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.95rem" }}>
              Every earn and redeem records signed deltas and post-transaction balance snapshots using
              SQLite <code style={{ color: "var(--color-gold)" }}>BEGIN IMMEDIATE</code>. Zero race conditions, zero floating drift.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Target Audience & 4. How It Helps (2 Column Grid) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "2rem",
        }}
      >
        <section className="card">
          <h2 style={{ fontSize: "1.6rem", color: "var(--color-gold)", marginBottom: "1rem" }}>
            3. Target Audience
          </h2>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <li style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <CheckCircle2 size={20} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Baristas & Counter Cashiers:</strong> Need ultra-fast search and 1-click purchase
                logging that doesn't slow down the register during morning rushes.
              </div>
            </li>
            <li style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <CheckCircle2 size={20} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Café Chain Owners & Franchisees:</strong> Want provable transaction correctness
                and customer retention data across single or multi-store locations.
              </div>
            </li>
            <li style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <CheckCircle2 size={20} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Loyal Coffee Drinkers:</strong> Expect immediate, visible progress towards free
                cappuccinos with transparent tier multipliers.
              </div>
            </li>
          </ul>
        </section>

        <section className="card">
          <h2 style={{ fontSize: "1.6rem", color: "var(--color-gold)", marginBottom: "1rem" }}>
            4. How It Helps
          </h2>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <li style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <TrendingUp size={20} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Eliminates Queue Bottlenecks:</strong> Baristas look up members in a single keystroke,
                preventing counter friction and abandoned orders.
              </div>
            </li>
            <li style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <Clock size={20} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Prevents Costly Math Errors:</strong> Hard-coded integer math removes accidental
                over-redemptions and inconsistent manual point calculations.
              </div>
            </li>
            <li style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <ShieldCheck size={20} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Builds Irresistible Habit Loops:</strong> Visual progress to Silver and Gold tiers
                gamifies weekly coffee visits into higher customer lifetime value (LTV).
              </div>
            </li>
          </ul>
        </section>
      </div>

      {/* 5. Three Features We Would Build Next */}
      <section className="card" style={{ background: "rgba(23, 18, 13, 0.95)", border: "1px solid var(--border-accent)" }}>
        <h2 style={{ fontSize: "1.8rem", color: "var(--color-gold)", marginBottom: "0.5rem" }}>
          5. Three Features We Would Build Next
        </h2>
        <p style={{ color: "var(--color-muted)", marginBottom: "1.5rem" }}>
          Strategic roadmap items planned for the next product release cycle:
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          <div style={{ background: "var(--bg-card)", padding: "1.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--color-gold)", marginBottom: "0.75rem" }}>
              <Smartphone size={22} />
              <h3 style={{ fontSize: "1.1rem" }}>Feature 1: Customer PWA & Dynamic QR Pass</h3>
            </div>
            <p style={{ color: "var(--color-muted)", fontSize: "0.92rem", lineHeight: 1.6 }}>
              A lightweight mobile Progressive Web App (PWA) allowing customers to add their digital loyalty
              card to Apple Wallet / Google Pay. Baristas scan the QR code via counter webcam, bypassing
              manual phone entry entirely.
            </p>
          </div>

          <div style={{ background: "var(--bg-card)", padding: "1.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--color-gold)", marginBottom: "0.75rem" }}>
              <Gift size={22} />
              <h3 style={{ fontSize: "1.1rem" }}>Feature 2: Automated Perks & Double-Point Hours</h3>
            </div>
            <p style={{ color: "var(--color-muted)", fontSize: "0.92rem", lineHeight: 1.6 }}>
              Rule-based promotional engine allowing café managers to schedule automatic 2× point multipliers
              during slow afternoon hours (e.g., 2 PM - 5 PM) and automatically trigger free birthday pastry coupons.
            </p>
          </div>

          <div style={{ background: "var(--bg-card)", padding: "1.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--color-gold)", marginBottom: "0.75rem" }}>
              <Store size={22} />
              <h3 style={{ fontSize: "1.1rem" }}>Feature 3: POS Webhook & Offline Sync</h3>
            </div>
            <p style={{ color: "var(--color-muted)", fontSize: "0.92rem", lineHeight: 1.6 }}>
              Two-way webhooks connecting directly into Toast, Square, and Petpooja POS registers, with
              an IndexedDB offline queue so baristas can continue earning points even if the café Wi-Fi drops.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
