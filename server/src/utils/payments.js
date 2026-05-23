export function applySettlementPayments(netBalances, payments) {
  const balances = new Map(netBalances.map((balance) => [balance.userId, balance.amount]));

  for (const payment of payments.filter((item) => item.status === "completed")) {
    balances.set(payment.from, roundMoney((balances.get(payment.from) ?? 0) + payment.amount));
    balances.set(payment.to, roundMoney((balances.get(payment.to) ?? 0) - payment.amount));
  }

  return [...balances.entries()].map(([userId, amount]) => ({
    userId,
    amount: roundMoney(amount)
  }));
}

export function createUpiIntentLink({ fromUser, toUser, amount, note }) {
  const params = new URLSearchParams({
    pa: `${toUser.email.split("@")[0]}@upi`,
    pn: toUser.name,
    am: amount.toFixed(2),
    cu: "INR",
    tn: note || `SplitSmart settlement from ${fromUser.name}`
  });

  return `upi://pay?${params.toString()}`;
}

export function findOutstandingSettlement(settlements, candidate) {
  return settlements.find(
    (settlement) =>
      settlement.from === candidate.from &&
      settlement.to === candidate.to &&
      Math.abs(settlement.amount - candidate.amount) <= 0.01
  );
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
