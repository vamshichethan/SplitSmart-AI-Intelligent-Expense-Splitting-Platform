const API_BASE = "/api";
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
