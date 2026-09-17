const API_BASE = "http://localhost:8000/api";

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("brew_token");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.detail || (typeof data === "string" ? data : "An unexpected error occurred.");
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please verify that the backend is running at http://localhost:8000.");
    }
    if (err.message && err.message.includes("Failed to fetch")) {
      throw new Error("Unable to reach backend at http://localhost:8000. Please ensure the server is active.");
    }
    throw err;
  }
}

export const api = {
  auth: {
    login: (email, password) =>
      apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (name, email, password, role = "STAFF", phone = null) =>
      apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role, phone }),
      }),
    getMe: () => apiFetch("/auth/me"),
  },

  members: {
    list: ({ query = "", page = 1, limit = 20, sort = "created_at", order = "desc" } = {}) => {
      const params = new URLSearchParams({
        page,
        limit,
        sort,
        order,
      });
      if (query && query.trim()) {
        params.append("query", query.trim());
      }
      return apiFetch(`/members?${params.toString()}`);
    },
    get: (id) => apiFetch(`/members/${id}`),
    create: ({ name, country_code = "+91", phone_number }) =>
      apiFetch("/members", {
        method: "POST",
        body: JSON.stringify({ name, country_code, phone_number }),
      }),
    update: (id, data) =>
      apiFetch(`/members/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    recordPurchase: (id, amountPaise) =>
      apiFetch(`/members/${id}/purchases`, {
        method: "POST",
        body: JSON.stringify({ amount_paise: amountPaise }),
      }),
    redeem: (id, points, freeItemName = null) =>
      apiFetch(`/members/${id}/redemptions`, {
        method: "POST",
        body: JSON.stringify({ points, free_item_name: freeItemName }),
      }),
    getTransactions: (id, { page = 1, limit = 10 } = {}) =>
      apiFetch(`/members/${id}/transactions?page=${page}&limit=${limit}`),
  },

  customer: {
    getWallet: () => apiFetch("/customer/wallet"),
    redeem: (points, freeItemName = null) =>
      apiFetch("/customer/redeem", {
        method: "POST",
        body: JSON.stringify({ points, free_item_name: freeItemName }),
      }),
    getCatalog: () => apiFetch("/customer/catalog"),
  },

  dashboard: {
    getStats: () => apiFetch("/dashboard/stats"),
  },

  outbox: {
    list: (memberId = null) => {
      const q = memberId ? `?member_id=${memberId}` : "";
      return apiFetch(`/outbox${q}`);
    },
    clear: () =>
      apiFetch("/outbox/clear", {
        method: "POST",
      }),
  },
};
