import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  UserPlus,
  ArrowUpDown,
  Phone,
  Coins,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronRight,
  Globe,
} from "lucide-react";
import { api } from "../api";
import TierBadge from "../components/TierBadge";
import Pagination from "../components/Pagination";

const COMMON_COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "USA/Canada (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+81", label: "Japan (+81)" },
];

export default function Members({ onSelectMember }) {
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Query state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");

  // New Member Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCountryCode, setNewCountryCode] = useState("+91");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.members.list({
        query: debouncedQuery,
        page,
        limit: 15,
        sort,
        order,
      });
      setMembers(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      setError(err.message || "Failed to load members.");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, page, sort, order]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSort = (field) => {
    if (sort === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(field);
      setOrder("desc");
    }
    setPage(1);
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const newMember = await api.members.create({
        name: newName,
        country_code: newCountryCode,
        phone_number: newPhoneNumber,
      });
      setShowAddModal(false);
      setNewName("");
      setNewPhoneNumber("");
      setSuccessMsg(`Member ${newMember.name} (${newMember.phone}) registered successfully!`);
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchMembers();
      onSelectMember(newMember.id);
    } catch (err) {
      setAddError(err.message || "Failed to create member.");
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", color: "var(--color-crema)" }}>Loyalty Counter</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.95rem" }}>
            Search member by phone number or name to record purchases & redeem
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ padding: "10px 20px" }}
        >
          <UserPlus size={18} /> Register Member
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

      {/* Search Input Bar */}
      <div className="card" style={{ padding: "1.2rem" }}>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Type phone number (e.g. 98765) or customer name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 14px 14px 44px",
              fontSize: "1.05rem",
              background: "var(--bg-primary)",
              borderColor: query ? "var(--color-amber)" : "var(--border-subtle)",
            }}
          />
          <Search
            size={20}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: query ? "var(--color-gold)" : "var(--color-muted)",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                color: "var(--color-muted)",
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Members Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort("name")}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  Customer Name <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="sortable" onClick={() => handleSort("phone")}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  Phone (Country + Number) <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="sortable" onClick={() => handleSort("tier")}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  Tier Status <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="sortable" onClick={() => handleSort("points_balance")}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  Live Balance <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="sortable" onClick={() => handleSort("lifetime_spend_paise")}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  Lifetime Spend <ArrowUpDown size={14} />
                </div>
              </th>
              <th className="sortable" onClick={() => handleSort("created_at")}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  Joined <ArrowUpDown size={14} />
                </div>
              </th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "var(--color-muted)" }}>
                  Looking up members in database...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--color-muted)" }}>
                  No members found matching "{debouncedQuery}".{" "}
                  <button
                    onClick={() => {
                      setNewPhoneNumber(debouncedQuery);
                      setShowAddModal(true);
                    }}
                    style={{
                      background: "transparent",
                      color: "var(--color-gold)",
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontSize: "0.95rem",
                    }}
                  >
                    Register new member with this phone?
                  </button>
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} onClick={() => onSelectMember(m.id)}>
                  <td>
                    <strong style={{ color: "var(--color-crema)", fontSize: "1rem" }}>{m.name}</strong>
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: "monospace",
                        color: "var(--color-gold)",
                        background: "rgba(229, 152, 46, 0.1)",
                        padding: "4px 8px",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <span style={{ opacity: 0.7, marginRight: "2px" }}>{m.country_code}</span>{" "}
                      {m.phone_number}
                    </span>
                  </td>
                  <td>
                    <TierBadge tier={m.tier} />
                  </td>
                  <td>
                    <strong style={{ color: "var(--color-gold)", fontSize: "1.05rem" }}>
                      {m.points_balance.toLocaleString()} pts
                    </strong>
                  </td>
                  <td style={{ color: "var(--color-muted)" }}>
                    ₹{((m.lifetime_spend_paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>
                    {m.created_at ? m.created_at.split(" ")[0] : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMember(m.id);
                      }}
                    >
                      Open Counter <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={(newPage) => setPage(newPage)}
      />

      {/* Register New Member Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.4rem" }}>Register New Member</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                &times;
              </button>
            </div>

            {addError && (
              <div className="alert alert-danger">
                <AlertCircle size={16} />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMember} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label>Customer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Country Code & Phone Number</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    value={newCountryCode}
                    onChange={(e) => setNewCountryCode(e.target.value)}
                    style={{ width: "130px" }}
                  >
                    {COMMON_COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={addLoading}
                  style={{ flex: 1 }}
                >
                  {addLoading ? "Saving..." : "Confirm Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
