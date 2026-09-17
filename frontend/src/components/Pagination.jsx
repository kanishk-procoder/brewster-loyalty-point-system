import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: "1.5rem",
      padding: "0.5rem 0",
      color: "var(--color-muted)",
      fontSize: "0.9rem"
    }}>
      <div>
        Total <strong style={{ color: "var(--color-crema)" }}>{totalItems}</strong> members &bull; Page{" "}
        <strong style={{ color: "var(--color-crema)" }}>{page}</strong> of{" "}
        <strong style={{ color: "var(--color-crema)" }}>{totalPages}</strong>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          className="btn-secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{ opacity: page <= 1 ? 0.5 : 1, cursor: page <= 1 ? "not-allowed" : "pointer" }}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <button
          className="btn-secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{ opacity: page >= totalPages ? 0.5 : 1, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
