import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Members from "./pages/Members";
import MemberDetail from "./pages/MemberDetail";
import Dashboard from "./pages/Dashboard";
import CustomerWallet from "./pages/CustomerWallet";

function MainApp() {
  const [currentView, setView] = useState("landing");
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const { user } = useAuth();

  // If customer logs in, direct to wallet
  useEffect(() => {
    if (user?.role === "CUSTOMER" && currentView === "login") {
      setView("wallet");
    } else if (user?.role === "STAFF" && currentView === "login") {
      setView("members");
    }
  }, [user, currentView]);

  const handleSelectMember = (id) => {
    setSelectedMemberId(id);
    setView("detail");
  };

  const handleBackToMembers = () => {
    setSelectedMemberId(null);
    setView("members");
  };

  return (
    <div className="app-container">
      <Navbar currentView={currentView} setView={setView} />

      <main className="main-content">
        {currentView === "landing" && <Landing setView={setView} />}

        {currentView === "login" && <Login setView={setView} />}

        {currentView === "wallet" && <CustomerWallet />}

        {currentView === "members" && (
          <Members onSelectMember={handleSelectMember} />
        )}

        {currentView === "detail" && selectedMemberId && (
          <MemberDetail
            memberId={selectedMemberId}
            onBack={handleBackToMembers}
          />
        )}

        {currentView === "dashboard" && (
          <Dashboard
            setView={setView}
            onSelectMember={handleSelectMember}
          />
        )}
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "2rem 1.5rem",
          textAlign: "center",
          color: "var(--color-muted)",
          fontSize: "0.85rem",
          background: "var(--bg-primary)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
          <div>
            &copy; 2026 <strong>BrewRewards</strong> &bull; High-Precision Café Loyalty Platform
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <button onClick={() => setView("landing")} style={{ background: "transparent", color: "var(--color-muted)" }}>Overview</button>
            <button onClick={() => setView("members")} style={{ background: "transparent", color: "var(--color-muted)" }}>Counter</button>
            <button onClick={() => setView("wallet")} style={{ background: "transparent", color: "var(--color-muted)" }}>Customer Wallet</button>
            <button onClick={() => setView("dashboard")} style={{ background: "transparent", color: "var(--color-muted)" }}>Store Stats</button>
            <button onClick={() => setView("login")} style={{ background: "transparent", color: "var(--color-muted)" }}>Staff / VIP Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
