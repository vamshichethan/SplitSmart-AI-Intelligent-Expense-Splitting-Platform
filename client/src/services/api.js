const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TOKEN_KEY = "splitsmart.session";

export function getStoredSession() {
  const raw = localStorage.getItem(TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function storeSession(session) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(payload) {
  const session = await request("/auth/login", {
    method: "POST",
    body: payload
  });
  storeSession(session);
  return session;
}

export async function register(payload) {
  const session = await request("/auth/register", {
    method: "POST",
    body: payload
  });
  storeSession(session);
  return session;
}

export async function getCurrentUser() {
  return request("/auth/me");
}

export async function getDashboard(groupId) {
  const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : "";
  return request(`/dashboard${query}`);
}

export async function createGroup(payload) {
  return request("/groups", {
    method: "POST",
    body: payload
  });
}

export async function addGroupMember(groupId, payload) {
  return request(`/groups/${groupId}/members`, {
    method: "POST",
    body: payload
  });
}

export async function createExpense(groupId, payload) {
  return request(`/groups/${groupId}/expenses`, {
    method: "POST",
    body: payload
  });
}

export async function mockExtractReceipt() {
  return request("/receipts/mock-extract", {
    method: "POST"
  });
}

export async function createReceiptExpense(groupId, payload) {
  return request(`/groups/${groupId}/receipts/item-wise-expense`, {
    method: "POST",
    body: payload
  });
}

export async function createUpiIntent(groupId, payload) {
  return request(`/groups/${groupId}/payments/upi-intent`, {
    method: "POST",
    body: payload
  });
}

export async function markSettlementPaid(groupId, payload) {
  return request(`/groups/${groupId}/payments/manual`, {
    method: "POST",
    body: payload
  });
}

export async function sendExpenseReminders(expenseId) {
  return request(`/expenses/${expenseId}/reminders`, {
    method: "POST"
  });
}

export async function createDispute(expenseId, payload) {
  return request(`/expenses/${expenseId}/disputes`, {
    method: "POST",
    body: payload
  });
}

export async function resolveDispute(disputeId, payload) {
  return request(`/disputes/${disputeId}/resolve`, {
    method: "PATCH",
    body: payload
  });
}

export async function getAiInsights(groupId) {
  return request(`/groups/${groupId}/analytics/ai-insights`);
}

async function request(path, options = {}) {
  const session = getStoredSession();
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  return parseResponse(response);
}

async function parseResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ? JSON.stringify(data.error) : "Request failed");
  }

  return data;
}
