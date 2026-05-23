import assert from "node:assert/strict";
import test from "node:test";
import { applySettlementPayments, createUpiIntentLink } from "../src/utils/payments.js";

test("completed settlement payments reduce outstanding balances", () => {
  const balances = applySettlementPayments(
    [
      { userId: "u1", amount: 500 },
      { userId: "u2", amount: -500 }
    ],
    [{ from: "u2", to: "u1", amount: 200, status: "completed" }]
  );

  assert.deepEqual(balances, [
    { userId: "u1", amount: 300 },
    { userId: "u2", amount: -300 }
  ]);
});

test("creates a UPI intent link for settlement payment", () => {
  const link = createUpiIntentLink({
    fromUser: { name: "Rahul", email: "rahul@example.com" },
    toUser: { name: "Vamshi", email: "vamshi@example.com" },
    amount: 250,
    note: "Goa Trip settlement"
  });

  assert.equal(link.startsWith("upi://pay?"), true);
  assert.equal(link.includes("am=250.00"), true);
  assert.equal(link.includes("pa=vamshi%40upi"), true);
});
