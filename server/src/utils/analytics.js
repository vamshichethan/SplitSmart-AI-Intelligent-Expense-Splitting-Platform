export function buildGroupAnalytics({ expenses, payments, members }) {
  const categorySpend = aggregateBy(expenses, "category");
  const monthlySpend = aggregateMonthly(expenses);
  const memberPaid = aggregatePaidBy(expenses);
  const topSpender = topEntry(memberPaid, members);
  const completedPayments = payments.filter((payment) => payment.status === "completed");
  const pendingPayments = payments.filter((payment) => payment.status !== "completed");

  return {
    categorySpend,
    monthlySpend,
    topSpender,
    totals: {
      expenseCount: expenses.length,
      totalSpend: roundMoney(expenses.reduce((sum, expense) => sum + expense.amount, 0)),
      completedSettlements: completedPayments.length,
      pendingPaymentLinks: pendingPayments.length
    },
    insights: buildInsights({ categorySpend, topSpender, expenses, completedPayments, pendingPayments })
  };
}

function aggregateBy(items, key) {
  const values = new Map();

  for (const item of items) {
    values.set(item[key], roundMoney((values.get(item[key]) ?? 0) + item.amount));
  }

  return [...values.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function aggregateMonthly(expenses) {
  const values = new Map();

  for (const expense of expenses) {
    const month = expense.date.slice(0, 7);
    values.set(month, roundMoney((values.get(month) ?? 0) + expense.amount));
  }

  return [...values.entries()].map(([month, total]) => ({ month, total }));
}

function aggregatePaidBy(expenses) {
  const values = new Map();

  for (const expense of expenses) {
    values.set(expense.paidBy, roundMoney((values.get(expense.paidBy) ?? 0) + expense.amount));
  }

  return values;
}

function topEntry(values, members) {
  const [userId, amount] = [...values.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  const user = members.find((member) => member.id === userId);

  return userId
    ? {
        userId,
        name: user?.name ?? "Member",
        amount
      }
    : null;
}

function buildInsights({ categorySpend, topSpender, expenses, completedPayments, pendingPayments }) {
  if (!expenses.length) {
    return ["Add the first expense to unlock spending insights."];
  }

  const topCategory = categorySpend[0];
  const insights = [
    `${topCategory.name} is the leading category at ${formatCurrency(topCategory.value)}.`,
    topSpender ? `${topSpender.name} has paid the most so far: ${formatCurrency(topSpender.amount)}.` : "No payer concentration yet.",
    completedPayments.length
      ? `${completedPayments.length} settlement payment${completedPayments.length === 1 ? "" : "s"} completed in this group.`
      : "No settlement payments have been completed yet."
  ];

  if (pendingPayments.length) {
    insights.push(`${pendingPayments.length} generated UPI link${pendingPayments.length === 1 ? "" : "s"} still need confirmation.`);
  }

  return insights;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
