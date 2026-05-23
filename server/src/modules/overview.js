import { Router } from "express";
import { z } from "zod";
import { disputeComments, disputes, expenses, groups, notifications, payments, users } from "../data.js";
import { requireAuth } from "../middleware/auth.js";
import { buildGroupAnalytics } from "../utils/analytics.js";
import { applySettlementPayments, createUpiIntentLink, findOutstandingSettlement } from "../utils/payments.js";
import { buildItemWiseExpense, ReceiptValidationError } from "../utils/receiptSplits.js";
import { buildExpenseReminders } from "../utils/reminders.js";
import { calculateNetBalances, simplifySettlements } from "../utils/settlements.js";
import { buildExpenseSplits, SplitValidationError } from "../utils/splits.js";
import { publicUser } from "../utils/users.js";

export const overviewRouter = Router();

const createExpenseSchema = z.object({
  title: z.string().min(2),
  amount: z.number().positive(),
  category: z.string().min(2),
  paidBy: z.string(),
  splitMode: z.enum(["equal", "custom", "percentage"]).default("equal"),
  splits: z
    .array(
      z.object({
        userId: z.string(),
        amount: z.number().nonnegative().optional(),
        percentage: z.number().nonnegative().optional()
      })
    )
    .optional()
});

const createGroupSchema = z.object({
  name: z.string().min(2).max(80),
  type: z.string().min(2).max(40).default("Friends"),
  memberIds: z.array(z.string()).optional()
});

const addMemberSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional()
});

const saveReceiptExpenseSchema = z.object({
  paidBy: z.string(),
  receipt: z.object({
    merchant: z.string().optional(),
    confidence: z.number().optional(),
    tax: z.number().nonnegative().optional(),
    serviceCharge: z.number().nonnegative().optional(),
    total: z.number().positive().optional(),
    items: z.array(
      z.object({
        name: z.string().min(1),
        price: z.number().nonnegative(),
        assignedTo: z.array(z.string()).optional()
      })
    )
  })
});

const settlementPaymentSchema = z.object({
  from: z.string(),
  to: z.string(),
  amount: z.number().positive()
});

const createDisputeSchema = z.object({
  reason: z.string().min(5).max(500)
});

const resolveDisputeSchema = z.object({
  status: z.enum(["resolved", "rejected"]),
  resolution: z.string().min(3).max(500)
});

const disputeCommentSchema = z.object({
  message: z.string().min(1).max(500)
});

overviewRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "SplitSmart AI API" });
});

overviewRouter.use(requireAuth);

overviewRouter.get("/dashboard", (req, res) => {
  const requestedGroup = groups.find((group) => group.id === req.query.groupId);
  res.json(buildGroupDashboard(req.user, requestedGroup ?? groups[0]));
});

overviewRouter.get("/groups/:groupId", (req, res) => {
  const group = groups.find((item) => item.id === req.params.groupId);
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const activeGroup = hydrateGroup(group);
  const groupExpenses = expenses.filter((expense) => expense.groupId === group.id);
  const balances = calculateNetBalances(groupExpenses, activeGroup.members);

  res.json({
    group: activeGroup,
    expenses: groupExpenses.map(hydrateExpense),
    balances: balances.map(withUser),
    settlements: simplifySettlements(balances).map(withSettlementUsers)
  });
});

overviewRouter.post("/groups", (req, res) => {
  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const memberIds = new Set([req.user.id, ...(parsed.data.memberIds ?? [])]);
  const group = {
    id: `g${groups.length + 1}`,
    name: parsed.data.name,
    type: parsed.data.type,
    currency: "INR",
    createdAt: new Date().toISOString().slice(0, 10),
    memberIds: [...memberIds].filter((id) => users.some((user) => user.id === id))
  };

  groups.push(group);
  res.status(201).json(buildGroupDashboard(req.user, group));
});

overviewRouter.post("/groups/:groupId/members", (req, res) => {
  const group = groups.find((item) => item.id === req.params.groupId);
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = findOrCreateMember(parsed.data);
  if (!group.memberIds.includes(user.id)) {
    group.memberIds.push(user.id);
  }

  res.status(201).json(buildGroupDashboard(req.user, group));
});

overviewRouter.post("/groups/:groupId/expenses", (req, res) => {
  const group = groups.find((item) => item.id === req.params.groupId);
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const payload = parsed.data;
  const members = group.memberIds;

  if (!members.includes(payload.paidBy)) {
    res.status(400).json({ error: "Payer must be a member of this group." });
    return;
  }

  let splits;

  try {
    splits = buildExpenseSplits({
      amount: payload.amount,
      members,
      splitMode: payload.splitMode,
      splits: payload.splits
    });
  } catch (error) {
    if (error instanceof SplitValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    throw error;
  }

  const expense = {
    id: `e${expenses.length + 1}`,
    groupId: group.id,
    title: payload.title,
    amount: payload.amount,
    category: payload.category,
    paidBy: payload.paidBy,
    splitMode: payload.splitMode,
    date: new Date().toISOString().slice(0, 10),
    status: "settlement_due",
    splits,
    receiptItems: []
  };

  expenses.unshift(expense);
  res.status(201).json(hydrateExpense(expense));
});

overviewRouter.post("/receipts/mock-extract", (_req, res) => {
  res.json({
    merchant: "Coastal Curry House",
    confidence: 0.91,
    tax: 184,
    serviceCharge: 240,
    total: 3144,
    items: [
      { name: "Veg Thali", price: 640 },
      { name: "Chicken Biryani", price: 920 },
      { name: "Lime Soda", price: 320 },
      { name: "Chocolate Brownie", price: 840 }
    ]
  });
});

overviewRouter.post("/groups/:groupId/receipts/item-wise-expense", (req, res) => {
  const group = groups.find((item) => item.id === req.params.groupId);
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const parsed = saveReceiptExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  let expensePayload;

  try {
    expensePayload = buildItemWiseExpense({
      group,
      paidBy: parsed.data.paidBy,
      receipt: parsed.data.receipt
    });
  } catch (error) {
    if (error instanceof ReceiptValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    throw error;
  }

  const expense = {
    id: `e${expenses.length + 1}`,
    groupId: group.id,
    date: new Date().toISOString().slice(0, 10),
    status: "settlement_due",
    ...expensePayload
  };

  expenses.unshift(expense);
  res.status(201).json(buildGroupDashboard(req.user, group));
});

overviewRouter.post("/groups/:groupId/payments/upi-intent", (req, res) => {
  const group = groups.find((item) => item.id === req.params.groupId);
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const parsed = settlementPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const settlement = validateOutstandingSettlement(group, parsed.data);
  if ("error" in settlement) {
    res.status(400).json({ error: settlement.error });
    return;
  }

  const fromUser = users.find((user) => user.id === parsed.data.from);
  const toUser = users.find((user) => user.id === parsed.data.to);
  const payment = {
    id: `p${payments.length + 1}`,
    groupId: group.id,
    ...parsed.data,
    method: "upi",
    status: "pending",
    createdAt: new Date().toISOString()
  };
  const upiIntent = createUpiIntentLink({
    fromUser,
    toUser,
    amount: parsed.data.amount,
    note: `${group.name} settlement`
  });

  payments.unshift(payment);
  res.status(201).json({ payment: hydratePayment(payment), upiIntent });
});

overviewRouter.post("/groups/:groupId/payments/manual", (req, res) => {
  const group = groups.find((item) => item.id === req.params.groupId);
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const parsed = settlementPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const settlement = validateOutstandingSettlement(group, parsed.data);
  if ("error" in settlement) {
    res.status(400).json({ error: settlement.error });
    return;
  }

  const payment = {
    id: `p${payments.length + 1}`,
    groupId: group.id,
    ...parsed.data,
    method: "manual",
    status: "completed",
    createdAt: new Date().toISOString()
  };

  payments.unshift(payment);
  res.status(201).json(buildGroupDashboard(req.user, group));
});

overviewRouter.post("/expenses/:expenseId/reminders", (req, res) => {
  const expense = expenses.find((item) => item.id === req.params.expenseId);
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  const group = groups.find((item) => item.id === expense.groupId);
  const reminders = buildExpenseReminders({ group, expense, users }).map((reminder, index) => ({
    id: `n${notifications.length + index + 1}`,
    ...reminder,
    createdAt: new Date().toISOString()
  }));

  notifications.unshift(...reminders);
  res.status(201).json(buildGroupDashboard(req.user, group));
});

overviewRouter.post("/expenses/:expenseId/disputes", (req, res) => {
  const expense = expenses.find((item) => item.id === req.params.expenseId);
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  const parsed = createDisputeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const dispute = {
    id: `d${disputes.length + 1}`,
    expenseId: expense.id,
    raisedBy: req.user.id,
    reason: parsed.data.reason,
    status: "pending",
    createdAt: new Date().toISOString().slice(0, 10),
    resolution: ""
  };

  disputes.unshift(dispute);
  res.status(201).json(buildGroupDashboard(req.user, groups.find((item) => item.id === expense.groupId)));
});

overviewRouter.post("/disputes/:disputeId/comments", (req, res) => {
  const dispute = disputes.find((item) => item.id === req.params.disputeId);
  if (!dispute) {
    res.status(404).json({ error: "Dispute not found" });
    return;
  }

  const parsed = disputeCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  disputeComments.push({
    id: `dc${disputeComments.length + 1}`,
    disputeId: dispute.id,
    userId: req.user.id,
    message: parsed.data.message,
    createdAt: new Date().toISOString()
  });

  const expense = expenses.find((item) => item.id === dispute.expenseId);
  res.status(201).json(buildGroupDashboard(req.user, groups.find((item) => item.id === expense.groupId)));
});

overviewRouter.patch("/disputes/:disputeId/resolve", (req, res) => {
  const dispute = disputes.find((item) => item.id === req.params.disputeId);
  if (!dispute) {
    res.status(404).json({ error: "Dispute not found" });
    return;
  }

  const parsed = resolveDisputeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  dispute.status = parsed.data.status;
  dispute.resolution = parsed.data.resolution;

  const expense = expenses.find((item) => item.id === dispute.expenseId);
  res.json(buildGroupDashboard(req.user, groups.find((item) => item.id === expense.groupId)));
});

function buildGroupDashboard(currentUser, group) {
  const activeGroup = hydrateGroup(group);
  const groupExpenses = expenses.filter((expense) => expense.groupId === activeGroup.id);
  const groupPayments = payments.filter((payment) => payment.groupId === activeGroup.id);
  const rawBalances = calculateNetBalances(groupExpenses, activeGroup.members);
  const balances = applySettlementPayments(rawBalances, groupPayments);
  const groupExpenseIds = new Set(groupExpenses.map((expense) => expense.id));

  return {
    currentUser: publicUser(currentUser),
    users: users.map(publicUser),
    groups: groups.map(hydrateGroup),
    activeGroup,
    expenses: groupExpenses.map(hydrateExpense),
    balances: balances.map(withUser),
    settlements: simplifySettlements(balances).map(withSettlementUsers),
    payments: groupPayments.map(hydratePayment),
    disputes: disputes.filter((dispute) => groupExpenseIds.has(dispute.expenseId)).map(hydrateDispute),
    notifications: notifications
      .filter((notification) => notification.groupId === activeGroup.id)
      .map(hydrateNotification),
    analytics: buildGroupAnalytics({
      expenses: groupExpenses,
      payments: groupPayments,
      members: activeGroup.members
    })
  };
}

function validateOutstandingSettlement(group, payload) {
  if (!group.memberIds.includes(payload.from) || !group.memberIds.includes(payload.to)) {
    return { error: "Settlement users must be members of this group." };
  }

  const activeGroup = hydrateGroup(group);
  const groupExpenses = expenses.filter((expense) => expense.groupId === group.id);
  const groupPayments = payments.filter((payment) => payment.groupId === group.id);
  const balances = applySettlementPayments(calculateNetBalances(groupExpenses, activeGroup.members), groupPayments);
  const outstanding = simplifySettlements(balances);

  if (!findOutstandingSettlement(outstanding, payload)) {
    return { error: "Settlement is no longer outstanding for that amount." };
  }

  return payload;
}

function findOrCreateMember(payload) {
  if (payload.userId) {
    const existing = users.find((user) => user.id === payload.userId);
    if (existing) return existing;
  }

  if (payload.email) {
    const existing = users.find((user) => user.email.toLowerCase() === payload.email.toLowerCase());
    if (existing) return existing;
  }

  const name = payload.name ?? payload.email?.split("@")[0] ?? "New member";
  const user = {
    id: `u${users.length + 1}`,
    name,
    email: payload.email ?? `${name.toLowerCase().replaceAll(" ", ".")}@example.com`,
    avatar: name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join(""),
    passwordHash: users[0].passwordHash
  };

  users.push(user);
  return user;
}

function hydrateGroup(group) {
  return {
    ...group,
    members: group.memberIds.map((id) => users.find((user) => user.id === id))
      .map(publicUser)
  };
}

function hydrateExpense(expense) {
  return {
    ...expense,
    payer: publicUser(users.find((user) => user.id === expense.paidBy)),
    splits: expense.splits.map(withUser),
    receiptItems: expense.receiptItems.map((item) => ({
      ...item,
      assignees: item.assignedTo.map((id) => publicUser(users.find((user) => user.id === id)))
    }))
  };
}

function hydrateDispute(dispute) {
  const expense = expenses.find((item) => item.id === dispute.expenseId);
  return {
    ...dispute,
    expense: expense ? hydrateExpense(expense) : null,
    user: publicUser(users.find((user) => user.id === dispute.raisedBy)),
    comments: disputeComments
      .filter((comment) => comment.disputeId === dispute.id)
      .map((comment) => ({
        ...comment,
        user: publicUser(users.find((user) => user.id === comment.userId))
      }))
  };
}

function withUser(balance) {
  return {
    ...balance,
    user: publicUser(users.find((user) => user.id === balance.userId))
  };
}

function withSettlementUsers(settlement) {
  return {
    ...settlement,
    fromUser: publicUser(users.find((user) => user.id === settlement.from)),
    toUser: publicUser(users.find((user) => user.id === settlement.to))
  };
}

function hydratePayment(payment) {
  return {
    ...payment,
    fromUser: publicUser(users.find((user) => user.id === payment.from)),
    toUser: publicUser(users.find((user) => user.id === payment.to))
  };
}

function hydrateNotification(notification) {
  return {
    ...notification,
    user: publicUser(users.find((user) => user.id === notification.userId)),
    expense: expenses.find((expense) => expense.id === notification.expenseId) ?? null
  };
}
