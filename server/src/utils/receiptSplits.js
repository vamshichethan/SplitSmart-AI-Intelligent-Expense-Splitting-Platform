export function buildItemWiseExpense({ group, receipt, paidBy }) {
  if (!group.memberIds.includes(paidBy)) {
    throw new ReceiptValidationError("Payer must be a member of this group.");
  }

  if (!receipt.items?.length) {
    throw new ReceiptValidationError("Receipt must include at least one item.");
  }

  const allowedMembers = new Set(group.memberIds);
  const splitTotals = new Map(group.memberIds.map((userId) => [userId, 0]));
  const receiptItems = receipt.items.map((item) => {
    const assignedTo = item.assignedTo?.length ? item.assignedTo : group.memberIds;

    for (const userId of assignedTo) {
      if (!allowedMembers.has(userId)) {
        throw new ReceiptValidationError("Receipt item includes a user who is not in this group.");
      }
    }

    const share = roundMoney(item.price / assignedTo.length);
    assignedTo.forEach((userId, index) => {
      const amount = index === assignedTo.length - 1 ? roundMoney(item.price - share * (assignedTo.length - 1)) : share;
      splitTotals.set(userId, roundMoney((splitTotals.get(userId) ?? 0) + amount));
    });

    return {
      name: item.name,
      price: roundMoney(item.price),
      assignedTo
    };
  });

  const subtotal = roundMoney(sum(receiptItems.map((item) => item.price)));
  const extras = roundMoney((receipt.tax ?? 0) + (receipt.serviceCharge ?? 0));
  const total = roundMoney(receipt.total ?? subtotal + extras);

  if (extras > 0) {
    distributeExtras(splitTotals, total - subtotal);
  }

  assertClose(sum([...splitTotals.values()]), total, "Item assignments do not match the receipt total.");

  return {
    title: receipt.merchant ? `${receipt.merchant} receipt` : "Item-wise receipt",
    amount: total,
    category: "Food",
    paidBy,
    splitMode: "item-wise",
    splits: [...splitTotals.entries()]
      .filter(([, amount]) => amount > 0)
      .map(([userId, amount]) => ({ userId, amount: roundMoney(amount) })),
    receiptItems
  };
}

export class ReceiptValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ReceiptValidationError";
  }
}

function distributeExtras(splitTotals, extras) {
  const entries = [...splitTotals.entries()].filter(([, amount]) => amount > 0);
  const base = sum(entries.map(([, amount]) => amount));

  if (!entries.length || extras === 0) return;

  entries.forEach(([userId, amount], index) => {
    const share = index === entries.length - 1 ? extras - sum(entries.slice(0, -1).map(([, value]) => roundMoney((extras * value) / base))) : roundMoney((extras * amount) / base);
    splitTotals.set(userId, roundMoney((splitTotals.get(userId) ?? 0) + share));
  });
}

function assertClose(actual, expected, message) {
  if (Math.abs(roundMoney(actual) - roundMoney(expected)) > 0.01) {
    throw new ReceiptValidationError(message);
  }
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
