export function calculateNetBalances(groupExpenses, members) {
  const balances = new Map(members.map((member) => [member.id, 0]));

  for (const expense of groupExpenses) {
    balances.set(expense.paidBy, (balances.get(expense.paidBy) ?? 0) + expense.amount);

    for (const split of expense.splits) {
      balances.set(split.userId, (balances.get(split.userId) ?? 0) - split.amount);
    }
  }

  return [...balances.entries()].map(([userId, amount]) => ({
    userId,
    amount: roundMoney(amount)
  }));
}

export function simplifySettlements(netBalances) {
  const debtors = netBalances
    .filter((balance) => balance.amount < 0)
    .map((balance) => ({ userId: balance.userId, amount: Math.abs(balance.amount) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = netBalances
    .filter((balance) => balance.amount > 0)
    .map((balance) => ({ ...balance }))
    .sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = roundMoney(Math.min(debtor.amount, creditor.amount));

    if (amount > 0) {
      settlements.push({
        from: debtor.userId,
        to: creditor.userId,
        amount
      });
    }

    debtor.amount = roundMoney(debtor.amount - amount);
    creditor.amount = roundMoney(creditor.amount - amount);

    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }

  return settlements;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
