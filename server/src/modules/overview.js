import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { disputeComments, disputes, expenses, groups, notifications, payments, users } from "../data.js";
import { requireAuth } from "../middleware/auth.js";
import { generateAiInsights } from "../services/aiInsights.js";
import { uploadReceiptImage } from "../services/cloudinary.js";
import { sendReminderEmail } from "../services/email.js";
import { extractReceiptDetails } from "../services/receiptExtraction.js";
import { createRazorpayOrder, verifyRazorpaySignature } from "../services/razorpay.js";
import { buildGroupAnalytics } from "../utils/analytics.js";
import { applySettlementPayments, createUpiIntentLink, findOutstandingSettlement } from "../utils/payments.js";
import { buildItemWiseExpense, ReceiptValidationError } from "../utils/receiptSplits.js";
import { buildExpenseReminders } from "../utils/reminders.js";
import { calculateNetBalances, simplifySettlements } from "../utils/settlements.js";
import { buildExpenseSplits, SplitValidationError } from "../utils/splits.js";
import { initialsFor, publicUser } from "../utils/users.js";

export const overviewRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

const addMemberSchema = z
  .object({
    userId: z.string().optional(),
    name: z.string().trim().min(2).max(80).optional(),
    email: z.string().trim().email().optional()
  })
  .refine((payload) => payload.userId || payload.name || payload.email, {
    message: "Provide an existing user or new member details."
  });

const receiptExtractionSchema = z.object({
  receiptText: z.string().max(6000).optional()
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

const razorpayOrderSchema = z.object({
  amount: z.number().positive(),
  receipt: z.string().min(1).max(80).optional()
});

const razorpaySettlementSchema = settlementPaymentSchema.extend({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().optional()
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
  const visibleGroups = groups.filter((group) => group.memberIds.includes(req.user.id));
  const requestedGroup = visibleGroups.find((group) => group.id === req.query.groupId);
  const activeGroup = requestedGroup ?? visibleGroups[0] ?? createStarterGroup(req.user);
  res.json(buildGroupDashboard(req.user, activeGroup));
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

overviewRouter.delete("/groups/:groupId/members/:userId", (req, res) => {
  const group = groups.find((item) => item.id === req.params.groupId);
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  if (!group.memberIds.includes(req.user.id)) {
    res.status(403).json({ error: "You can only manage groups you belong to." });
    return;
  }

  if (group.memberIds.length <= 1) {
    res.status(400).json({ error: "A group needs at least one member." });
    return;
  }

  if (!group.memberIds.includes(req.params.userId)) {
    res.status(404).json({ error: "Member not found in this group." });
    return;
  }

  if (memberHasGroupActivity(group.id, req.params.userId)) {
    res.status(400).json({ error: "Members with expenses, splits, payments, or disputes cannot be removed from this group." });
    return;
  }

  group.memberIds = group.memberIds.filter((id) => id !== req.params.userId);
  res.json(buildGroupDashboard(req.user, group));
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

overviewRouter.post("/receipts/extract", async (req, res, next) => {
  try {
    const parsed = receiptExtractionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    res.json(await extractReceiptDetails(parsed.data.receiptText));
  } catch (error) {
    next(error);
  }
});

overviewRouter.post("/receipts/upload", upload.single("receipt"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Receipt file is required." });
      return;
    }

    res.status(201).json(await uploadReceiptImage(req.file));
  } catch (error) {
    next(error);
  }
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

overviewRouter.post("/payments/razorpay/order", async (req, res, next) => {
  try {
    const parsed = razorpayOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    res.status(201).json(
      await createRazorpayOrder({
        amount: parsed.data.amount,
        receipt: parsed.data.receipt ?? `splitsmart_${Date.now()}`
      })
    );
  } catch (error) {
    next(error);
  }
});

overviewRouter.post("/groups/:groupId/payments/razorpay/confirm", (req, res) => {
  const group = groups.find((item) => item.id === req.params.groupId);
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const parsed = razorpaySettlementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const settlement = validateOutstandingSettlement(group, parsed.data);
  if ("error" in settlement) {
    res.status(400).json({ error: settlement.error });
    return;
  }

  const isVerified = verifyRazorpaySignature({
    orderId: parsed.data.orderId,
    paymentId: parsed.data.paymentId,
    signature: parsed.data.signature
  });

  if (!isVerified) {
    res.status(400).json({ error: "Razorpay payment signature could not be verified." });
    return;
  }

  const payment = {
    id: `p${payments.length + 1}`,
    groupId: group.id,
    from: parsed.data.from,
    to: parsed.data.to,
    amount: parsed.data.amount,
    method: "razorpay",
    status: "completed",
    providerPaymentId: parsed.data.paymentId,
    providerOrderId: parsed.data.orderId,
    createdAt: new Date().toISOString()
  };

  payments.unshift(payment);
  res.status(201).json(buildGroupDashboard(req.user, group));
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

overviewRouter.post("/expenses/:expenseId/reminders", async (req, res, next) => {
  const expense = expenses.find((item) => item.id === req.params.expenseId);
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  try {
    const group = groups.find((item) => item.id === expense.groupId);
    const reminders = [];

    for (const reminder of buildExpenseReminders({ group, expense, users })) {
      const user = users.find((item) => item.id === reminder.userId);
      const emailResult = await sendReminderEmail({
        to: user.email,
        subject: `SplitSmart reminder: ${expense.title}`,
        text: reminder.message
      });
      reminders.push({
        id: `n${notifications.length + reminders.length + 1}`,
        ...reminder,
        status: emailResult.skipped ? "smtp_not_configured" : "email_sent",
        provider: emailResult.skipped ? "local" : "smtp",
        providerMessage: emailResult.reason ?? emailResult.messageId,
        createdAt: new Date().toISOString()
      });
    }

    notifications.unshift(...reminders);
    res.status(201).json(buildGroupDashboard(req.user, group));
  } catch (error) {
    next(error);
  }
});

overviewRouter.get("/groups/:groupId/analytics/ai-insights", async (req, res, next) => {
  try {
    const group = groups.find((item) => item.id === req.params.groupId);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const dashboard = buildGroupDashboard(req.user, group);
    res.json(
      await generateAiInsights({
        group: dashboard.activeGroup,
        analytics: dashboard.analytics,
        balances: dashboard.balances
      })
    );
  } catch (error) {
    next(error);
  }
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
  const visibleGroups = groups.filter((item) => item.memberIds.includes(currentUser.id));
  const visibleUserIds = new Set([currentUser.id, ...visibleGroups.flatMap((item) => item.memberIds)]);
  const activeGroup = hydrateGroup(group);
  const groupExpenses = expenses.filter((expense) => expense.groupId === activeGroup.id);
  const groupPayments = payments.filter((payment) => payment.groupId === activeGroup.id);
  const rawBalances = calculateNetBalances(groupExpenses, activeGroup.members);
  const balances = applySettlementPayments(rawBalances, groupPayments);
  const groupExpenseIds = new Set(groupExpenses.map((expense) => expense.id));

  return {
    currentUser: publicUser(currentUser),
    users: users.filter((user) => visibleUserIds.has(user.id)).map(publicUser),
    groups: visibleGroups.map(hydrateGroup),
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

function createStarterGroup(user) {
  const group = {
    id: `g${groups.length + 1}`,
    name: `${user.name}'s group`,
    type: "Friends",
    currency: "INR",
    createdAt: new Date().toISOString().slice(0, 10),
    memberIds: [user.id]
  };
  groups.push(group);
  return group;
}

function memberHasGroupActivity(groupId, userId) {
  const groupExpenses = expenses.filter((expense) => expense.groupId === groupId);
  return (
    groupExpenses.some(
      (expense) =>
        expense.paidBy === userId ||
        expense.splits.some((split) => split.userId === userId) ||
        expense.receiptItems.some((item) => item.assignedTo.includes(userId))
    ) ||
    payments.some((payment) => payment.groupId === groupId && (payment.from === userId || payment.to === userId)) ||
    disputes.some((dispute) => {
      const expense = expenses.find((item) => item.id === dispute.expenseId);
      return expense?.groupId === groupId && dispute.raisedBy === userId;
    }) ||
    notifications.some((notification) => notification.groupId === groupId && notification.userId === userId)
  );
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

  const name = payload.name ?? payload.email.split("@")[0];
  const emailSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.)|(\.$)/g, "");
  const user = {
    id: `u${users.length + 1}`,
    name,
    email: payload.email?.toLowerCase() ?? `${emailSlug || `member${users.length + 1}`}@example.com`,
    avatar: initialsFor(name),
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
