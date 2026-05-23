export function buildExpenseSplits({ amount, members, splitMode, splits = [] }) {
  if (!members.length) {
    throw new SplitValidationError("A group must have members before adding expenses.");
  }

  if (splitMode === "custom") {
    return normalizeCustomSplits({ amount, members, splits });
  }

  if (splitMode === "percentage") {
    return normalizePercentageSplits({ amount, members, splits });
  }

  return buildEqualSplits(amount, members);
}

export class SplitValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SplitValidationError";
  }
}

function buildEqualSplits(amount, members) {
  const baseAmount = roundMoney(amount / members.length);
  const result = members.map((userId) => ({ userId, amount: baseAmount }));
  return rebalanceAmounts(result, amount);
}

function normalizeCustomSplits({ amount, members, splits }) {
  const cleaned = normalizeSplitUsers(splits, members).map((split) => ({
    userId: split.userId,
    amount: requireFiniteValue(split.amount, "Custom split amounts must be valid numbers.")
  }));

  assertTotal(roundMoney(sum(cleaned.map((split) => split.amount))), amount, "Custom split total must match the expense amount.");
  return cleaned.filter((split) => split.amount > 0);
}

function normalizePercentageSplits({ amount, members, splits }) {
  const cleaned = normalizeSplitUsers(splits, members).map((split) => ({
    userId: split.userId,
    percentage: requireFiniteValue(split.percentage, "Percentage split values must be valid numbers.")
  }));

  assertTotal(roundMoney(sum(cleaned.map((split) => split.percentage))), 100, "Percentage split total must equal 100.");

  const amounts = cleaned.map((split) => ({
    userId: split.userId,
    amount: roundMoney((amount * split.percentage) / 100)
  }));

  return rebalanceAmounts(amounts, amount).filter((split) => split.amount > 0);
}

function normalizeSplitUsers(splits, members) {
  if (!splits.length) {
    throw new SplitValidationError("Provide split values for each participant.");
  }

  const allowedMembers = new Set(members);
  const seen = new Set();

  for (const split of splits) {
    if (!allowedMembers.has(split.userId)) {
      throw new SplitValidationError("Split includes a user who is not in this group.");
    }
    if (seen.has(split.userId)) {
      throw new SplitValidationError("Split includes the same user more than once.");
    }
    seen.add(split.userId);
  }

  return splits;
}

function rebalanceAmounts(splits, amount) {
  const target = roundMoney(amount);
  const current = roundMoney(sum(splits.map((split) => split.amount)));
  const delta = roundMoney(target - current);

  if (splits.length && delta !== 0) {
    splits[splits.length - 1].amount = roundMoney(splits[splits.length - 1].amount + delta);
  }

  return splits;
}

function assertTotal(actual, expected, message) {
  if (!Number.isFinite(actual) || Math.abs(roundMoney(actual) - roundMoney(expected)) > 0.01) {
    throw new SplitValidationError(message);
  }
}

function requireFiniteValue(value, message) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new SplitValidationError(message);
  }

  return roundMoney(number);
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
