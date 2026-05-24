import { io } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? API_BASE.replace(/\/api\/?$/, "");
const TOKEN_KEY = "splitsmart.session";
let socket;

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

export async function removeGroupMember(groupId, userId) {
  return request(`/groups/${groupId}/members/${userId}`, {
    method: "DELETE"
  });
}

export async function createExpense(groupId, payload) {
  return request(`/groups/${groupId}/expenses`, {
    method: "POST",
    body: payload
  });
}

export async function extractReceipt(payload) {
  return request("/receipts/extract", {
    method: "POST",
    body: payload
  });
}

export async function uploadReceiptImage(file) {
  const formData = new FormData();
  formData.append("receipt", file);

  return request("/receipts/upload", {
    method: "POST",
    body: formData,
    isFormData: true
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

export async function createRazorpayOrder(payload) {
  return request("/payments/razorpay/order", {
    method: "POST",
    body: payload
  });
}

export async function confirmRazorpayPayment(groupId, payload) {
  return request(`/groups/${groupId}/payments/razorpay/confirm`, {
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

export async function addDisputeComment(disputeId, payload) {
  return request(`/disputes/${disputeId}/comments`, {
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

export function subscribeToRealtime(groupId, handlers) {
  const onEvent = typeof handlers === "function" ? handlers : handlers.onEvent;
  const onStatus = typeof handlers === "function" ? null : handlers.onStatus;

  if (!socket) {
    socket = io(SOCKET_URL || undefined, {
      transports: ["websocket", "polling"]
    });
  }

  const events = ["expense:created", "settlement:updated", "settlement:processed", "notification:created", "notification:updated"];
  const handler = (event) => {
    if (!event.groupId || event.groupId === groupId) {
      onEvent(event);
    }
  };
  const joinGroup = () => socket.emit("group:join", groupId);
  const handleReady = () => onStatus?.("connected");
  const handleDisconnect = () => onStatus?.("disconnected");

  if (groupId) {
    joinGroup();
    socket.on("connect", joinGroup);
  }
  socket.on("realtime:ready", handleReady);
  socket.on("disconnect", handleDisconnect);
  onStatus?.(socket.connected ? "connected" : "connecting");
  events.forEach((eventName) => socket.on(eventName, handler));

  return () => {
    socket.off("connect", joinGroup);
    socket.off("realtime:ready", handleReady);
    socket.off("disconnect", handleDisconnect);
    events.forEach((eventName) => socket.off(eventName, handler));
  };
}

async function request(path, options = {}) {
  const session = getStoredSession();
  const isFormData = options.isFormData || options.body instanceof FormData;
  const headers = {
    ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined
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
