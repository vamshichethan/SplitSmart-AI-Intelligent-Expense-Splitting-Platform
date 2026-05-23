import { Router } from "express";
import { z } from "zod";
import { disputes, expenses, groups, users } from "../data.js";
import { requireAuth } from "../middleware/auth.js";
import { buildItemWiseExpense, ReceiptValidationError } from "../utils/receiptSplits.js";
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

function buildGroupDashboard(currentUser, group) {
  const activeGroup = hydrateGroup(group);
  const groupExpenses = expenses.filter((expense) => expense.groupId === activeGroup.id);
  const balances = calculateNetBalances(groupExpenses, activeGroup.members);
  const groupExpenseIds = new Set(groupExpenses.map((expense) => expense.id));

  return {
    currentUser: publicUser(currentUser),
    users: users.map(publicUser),
    groups: groups.map(hydrateGroup),
    activeGroup,
    expenses: groupExpenses.map(hydrateExpense),
    balances: balances.map(withUser),
    settlements: simplifySettlements(balances).map(withSettlementUsers),
    disputes: disputes.filter((dispute) => groupExpenseIds.has(dispute.expenseId)).map(hydrateDispute),
    analytics: buildAnalytics(groupExpenses)
  };
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
    user: publicUser(users.find((user) => user.id === dispute.raisedBy))
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

function buildAnalytics(sourceExpenses = expenses) {
  const categories = new Map();
  const monthly = new Map();

  for (const expense of sourceExpenses) {
    categories.set(expense.category, (categories.get(expense.category) ?? 0) + expense.amount);
    monthly.set(expense.date.slice(0, 7), (monthly.get(expense.date.slice(0, 7)) ?? 0) + expense.amount);
  }

  const topCategory = [...categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "shared expenses";

  return {
    categorySpend: [...categories.entries()].map(([name, value]) => ({ name, value })),
    monthlySpend: [...monthly.entries()].map(([month, total]) => ({ month, total })),
    insights: [
      `${topCategory} is currently the most active category in this group.`,
      "The simplified settlement engine reduced group dues to the minimum repayment list.",
      sourceExpenses.length ? "Recent expenses are ready for settlement review." : "Add the first expense to unlock group insights."
    ]
  };
}
