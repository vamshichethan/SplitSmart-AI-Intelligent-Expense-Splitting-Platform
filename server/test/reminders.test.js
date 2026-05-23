import assert from "node:assert/strict";
import test from "node:test";
import { buildExpenseReminders } from "../src/utils/reminders.js";

test("builds reminders for owing members and skips the payer", () => {
  const reminders = buildExpenseReminders({
    group: { id: "g1" },
    users: [
      { id: "u1", name: "Vamshi" },
      { id: "u2", name: "Rahul" }
    ],
    expense: {
      id: "e1",
      title: "Dinner",
      paidBy: "u1",
      splits: [
        { userId: "u1", amount: 500 },
        { userId: "u2", amount: 500 }
      ]
    }
  });

  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].userId, "u2");
  assert.match(reminders[0].message, /Rahul owes/);
});
