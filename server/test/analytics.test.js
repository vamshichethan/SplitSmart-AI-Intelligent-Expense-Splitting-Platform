import assert from "node:assert/strict";
import test from "node:test";
import { buildGroupAnalytics } from "../src/utils/analytics.js";

test("builds category, payer, and payment insights", () => {
  const analytics = buildGroupAnalytics({
    members: [
      { id: "u1", name: "Vamshi" },
      { id: "u2", name: "Rahul" }
    ],
    expenses: [
      { category: "Food", amount: 1000, paidBy: "u1", date: "2026-05-01" },
      { category: "Travel", amount: 500, paidBy: "u2", date: "2026-05-02" },
      { category: "Food", amount: 250, paidBy: "u1", date: "2026-05-03" }
    ],
    payments: [{ status: "completed" }, { status: "pending" }]
  });

  assert.deepEqual(analytics.categorySpend[0], { name: "Food", value: 1250 });
  assert.deepEqual(analytics.topSpender, { userId: "u1", name: "Vamshi", amount: 1250 });
  assert.equal(analytics.totals.pendingPaymentLinks, 1);
  assert.equal(analytics.insights.length, 4);
});
