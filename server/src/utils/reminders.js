export function buildExpenseReminders({ group, expense, users }) {
  return expense.splits
    .filter((split) => split.userId !== expense.paidBy && split.amount > 0)
    .map((split) => {
      const user = users.find((item) => item.id === split.userId);
      return {
        groupId: group.id,
        expenseId: expense.id,
        userId: split.userId,
        type: "payment_reminder",
        message: `${user?.name ?? "Member"} owes ${formatCurrency(split.amount)} for ${expense.title}.`,
        status: "sent"
      };
    });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}
