import React, { useState } from "react";
import { Coffee, Lock, Mail, User, AlertCircle, Sparkles, Phone, ShieldCheck, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login({ setView }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState("STAFF");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let loggedUser;
      if (isRegister) {
        loggedUser = await register(name, email, password, role, phone || null);
      } else {
        loggedUser = await login(email, password);
      }

      if (loggedUser.role === "CUSTOMER") {
        setView("wallet");
      } else {
        setView("members");
      }
    } catch (err) {
      setError(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoStaff = () => {
    setIsRegister(false);
    setRole("STAFF");
    setEmail("admin@brewrewards.com");
    setPassword("Admin@1234");
    setError("");
  };

  const handleFillDemoCustomer = () => {
    setIsRegister(false);
    setRole("CUSTOMER");
    setEmail("customer@brewrewards.com");
    setPassword("Customer@1234");
    setError("");
  };

  return (
    <div
      style={{
        maxWidth: "460px",
        margin: "3rem auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          className="brand-icon"
          style={{ width: 50, height: 50, margin: "0 auto 1rem", borderRadius: "var(--radius-md)" }}
        >
          <Coffee size={28} />
        </div>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
          {isRegister ? "Create Account" : "Sign In to BrewRewards"}
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: "0.92rem" }}>
          Select whether you are accessing the staff register or your customer wallet
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Role Selector Tabs */}
      <div style={{ display: "flex", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "4px" }}>
        <button
          type="button"
          onClick={() => setRole("STAFF")}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.85rem",
            fontWeight: 600,
            background: role === "STAFF" ? "var(--color-amber)" : "transparent",
            color: role === "STAFF" ? "#120a04" : "var(--color-muted)",
          }}
        >
          <ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} /> Staff / Barista
        </button>
        <button
          type="button"
          onClick={() => setRole("CUSTOMER")}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.85rem",
            fontWeight: 600,
            background: role === "CUSTOMER" ? "var(--color-amber)" : "transparent",
            color: role === "CUSTOMER" ? "#120a04" : "var(--color-muted)",
          }}
        >
          <Wallet size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} /> Customer Wallet
        </button>
      </div>

      <div className="card" style={{ padding: "2rem" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {isRegister && (
            <div className="form-group">
              <label>Full Name</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%", paddingLeft: "38px" }}
                />
                <User
                  size={18}
                  style={{ position: "absolute", left: 12, top: 12, color: "var(--color-muted)" }}
                />
              </div>
            </div>
          )}

          {isRegister && role === "CUSTOMER" && (
            <div className="form-group">
              <label>Phone Number (Link existing points)</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: "100%", paddingLeft: "38px" }}
                />
                <Phone
                  size={18}
                  style={{ position: "absolute", left: 12, top: 12, color: "var(--color-muted)" }}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                required
                placeholder={role === "STAFF" ? "barista@cafe.com" : "customer@gmail.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", paddingLeft: "38px" }}
              />
              <Mail
                size={18}
                style={{ position: "absolute", left: 12, top: 12, color: "var(--color-muted)" }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", paddingLeft: "38px" }}
              />
              <Lock
                size={18}
                style={{ position: "absolute", left: 12, top: 12, color: "var(--color-muted)" }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {loading ? "Authenticating..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            style={{ background: "transparent", color: "var(--color-gold)", fontSize: "0.88rem" }}
          >
            {isRegister
              ? "Already have an account? Sign in here"
              : "Need an account? Register here"}
          </button>
        </div>
      </div>

      {!isRegister && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            onClick={handleFillDemoStaff}
            className="btn-secondary"
            style={{ width: "100%", fontSize: "0.85rem", justifyContent: "flex-start", padding: "10px 14px" }}
          >
            <Sparkles size={16} color="var(--color-gold)" /> Demo Staff Login (Counter Barista)
          </button>
          <button
            onClick={handleFillDemoCustomer}
            className="btn-secondary"
            style={{ width: "100%", fontSize: "0.85rem", justifyContent: "flex-start", padding: "10px 14px" }}
          >
            <Wallet size={16} color="var(--success)" /> Demo Customer Login (Ananya Iyer - Gold VIP)
          </button>
        </div>
      )}
    </div>
  );
}
