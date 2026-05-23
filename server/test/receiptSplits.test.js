import assert from "node:assert/strict";
import test from "node:test";
import { buildItemWiseExpense } from "../src/utils/receiptSplits.js";

test("builds item-wise splits from receipt assignments", () => {
  const expense = buildItemWiseExpense({
    group: { memberIds: ["u1", "u2", "u3"] },
    paidBy: "u1",
    receipt: {
      merchant: "Test Cafe",
      total: 600,
      items: [
        { name: "Pizza", price: 300, assignedTo: ["u1", "u2"] },
        { name: "Dessert", price: 300, assignedTo: ["u3"] }
      ]
    }
  });

  assert.equal(expense.splitMode, "item-wise");
  assert.deepEqual(expense.splits, [
    { userId: "u1", amount: 150 },
    { userId: "u2", amount: 150 },
    { userId: "u3", amount: 300 }
  ]);
});

test("distributes receipt tax and service charge proportionally", () => {
  const expense = buildItemWiseExpense({
    group: { memberIds: ["u1", "u2"] },
    paidBy: "u1",
    receipt: {
      merchant: "Test Cafe",
      tax: 30,
      serviceCharge: 30,
      total: 660,
      items: [
        { name: "Meal A", price: 300, assignedTo: ["u1"] },
        { name: "Meal B", price: 300, assignedTo: ["u2"] }
      ]
    }
  });

  assert.deepEqual(expense.splits, [
    { userId: "u1", amount: 330 },
    { userId: "u2", amount: 330 }
  ]);
});
