import React, { useState, useEffect, useRef } from "react";
import {
  Coffee,
  Users,
  LayoutDashboard,
  LogIn,
  LogOut,
  Sparkles,
  Wallet,
  Bell,
  Trash2,
  ArrowRight,
  X,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import TierBadge from "./TierBadge";

export default function Navbar({ currentView, setView }) {
  const { user, logout } = useAuth();
  const isCustomer = user?.role === "CUSTOMER";

  // Notification Outbox state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);
  const dropdownRef = useRef(null);
  const prevMaxIdRef = useRef(null);

  const fetchOutbox = async () => {
    try {
      const data = await api.outbox.list();
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);

      if (list.length > 0) {
        const maxId = Math.max(...list.map((n) => n.id || 0));
        if (prevMaxIdRef.current !== null && maxId > prevMaxIdRef.current) {
          const newest = list.find((n) => n.id === maxId);
          if (newest) {
            setToastNotification(newest);
          }
        }
        prevMaxIdRef.current = maxId;
      } else {
        prevMaxIdRef.current = 0;
      }
    } catch {
      // Ignore background network error
    }
  };

  useEffect(() => {
    fetchOutbox();
    const interval = setInterval(fetchOutbox, 4000);
    return () => clearInterval(interval);
  }, []);

  // Listen to instantaneous client-side tier-upgrade-alert events
  useEffect(() => {
    const handleTierAlert = (e) => {
      if (e.detail) {
        setToastNotification(e.detail);
        fetchOutbox();
      }
    };
    window.addEventListener("tier-upgrade-alert", handleTierAlert);
    return () => window.removeEventListener("tier-upgrade-alert", handleTierAlert);
  }, []);

  // Auto-dismiss toast after 8 seconds
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClearOutbox = async () => {
    try {
      await api.outbox.clear();
      setNotifications([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div
          className="brand-logo"
          onClick={() => setView("landing")}
          style={{ cursor: "pointer" }}
        >
          <div className="brand-icon">
            <Coffee size={20} />
          </div>
          <span>BrewRewards</span>
        </div>

        <nav className="nav-links">
          <button
            onClick={() => setView("landing")}
            className={`nav-link ${currentView === "landing" ? "active" : ""}`}
            style={{ background: "transparent" }}
          >
            <Sparkles size={16} /> Overview
          </button>

          {isCustomer ? (
            <button
              onClick={() => setView("wallet")}
              className={`nav-link ${currentView === "wallet" ? "active" : ""}`}
              style={{ background: "transparent" }}
            >
              <Wallet size={16} /> My Loyalty Wallet
            </button>
          ) : (
            <button
              onClick={() => setView("members")}
              className={`nav-link ${currentView === "members" ? "active" : ""}`}
              style={{ background: "transparent" }}
            >
              <Users size={16} /> Register Counter
            </button>
          )}

          <button
            onClick={() => setView("dashboard")}
            className={`nav-link ${currentView === "dashboard" ? "active" : ""}`}
            style={{ background: "transparent" }}
          >
            <LayoutDashboard size={16} /> Store Stats
          </button>

          {/* Real-time Notification Bell for Tier Upgrades */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="nav-link"
              style={{
                background: "transparent",
                position: "relative",
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
              }}
              title="Tier Upgrade Notifications"
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    background: "var(--danger)",
                    color: "#fff",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 8px rgba(231, 76, 60, 0.6)",
                  }}
                >
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "8px",
                  width: "360px",
                  maxHeight: "420px",
                  overflowY: "auto",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-accent)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                  padding: "1rem",
                  zIndex: 1200,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "0.92rem", color: "var(--color-gold)" }}>
                    <Bell size={15} /> Tier Upgrade Alerts
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearOutbox}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--color-muted)",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--color-muted)", fontSize: "0.85rem" }}>
                    No tier upgrade notifications yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {notifications.slice(-6).reverse().map((n) => (
                      <div
                        key={n.id}
                        style={{
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-sm)",
                          padding: "0.75rem",
                          fontSize: "0.82rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontWeight: 600, color: "var(--color-crema)" }}>{n.recipient}</span>
                          <span style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>{n.created_at?.split(" ")[1]}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "6px 0" }}>
                          <TierBadge tier={n.old_tier} />
                          <ArrowRight size={12} color="var(--color-muted)" />
                          <TierBadge tier={n.new_tier} />
                        </div>
                        <p style={{ color: "var(--color-muted)", fontSize: "0.8rem", margin: 0 }}>
                          {n.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "0.5rem" }}>
              <span
                style={{
                  fontSize: "0.8rem",
                  background: isCustomer ? "rgba(46, 204, 113, 0.15)" : "rgba(229, 152, 46, 0.15)",
                  color: isCustomer ? "var(--success)" : "var(--color-gold)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: `1px solid ${isCustomer ? "rgba(46, 204, 113, 0.3)" : "rgba(229, 152, 46, 0.3)"}`,
                }}
              >
                {isCustomer ? "Customer Pass" : "Staff Cashier"}
              </span>
              <span style={{ fontSize: "0.85rem", color: "var(--color-crema)", fontWeight: 500 }}>
                {user.name.split(" ")[0]}
              </span>
              <button
                onClick={logout}
                className="btn-danger"
                style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <LogOut size={14} /> Exit
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView("login")}
              className="btn-primary"
              style={{ padding: "8px 16px", fontSize: "0.85rem" }}
            >
              <LogIn size={15} /> Sign In
            </button>
          )}
        </nav>
      </div>

      {/* Floating Tier Upgrade Pop-Up Notification Toast */}
      {toastNotification && (
        <div
          className="tier-upgrade-toast"
          style={{
            position: "fixed",
            top: "80px",
            right: "24px",
            zIndex: 9999,
            maxWidth: "400px",
            width: "calc(100% - 48px)",
            background: "linear-gradient(135deg, #2b1f14, #150f09)",
            border: "2px solid var(--color-gold)",
            boxShadow: "0 12px 36px rgba(0,0,0,0.85), 0 0 25px rgba(245, 176, 65, 0.4)",
            borderRadius: "var(--radius-md)",
            padding: "1.2rem",
            animation: "modalPop 0.3s ease-out",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--color-gold)",
                fontWeight: 700,
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              <Sparkles size={16} /> Tier Upgrade Pop-Up!
            </div>
            <button
              onClick={() => setToastNotification(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-muted)",
                cursor: "pointer",
                padding: "2px",
              }}
              aria-label="Close notification"
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ margin: "10px 0", display: "flex", alignItems: "center", gap: "8px" }}>
            <TierBadge tier={toastNotification.old_tier} />
            <ArrowRight size={14} color="var(--color-muted)" />
            <TierBadge tier={toastNotification.new_tier} />
          </div>

          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--color-crema)", lineHeight: 1.4 }}>
            {toastNotification.message}
          </p>

          <div
            style={{
              marginTop: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.78rem",
              color: "var(--success)",
            }}
          >
            <CheckCircle2 size={14} /> Alert dispatched to <strong>{toastNotification.recipient}</strong>
          </div>
        </div>
      )}
    </header>
  );
}
