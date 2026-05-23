import assert from "node:assert/strict";
import test from "node:test";
import { calculateNetBalances, simplifySettlements } from "../src/utils/settlements.js";

test("calculates net balances from paid expenses and splits", () => {
  const members = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const balances = calculateNetBalances(
    [
      {
        paidBy: "a",
        amount: 900,
        splits: [
          { userId: "a", amount: 300 },
          { userId: "b", amount: 300 },
          { userId: "c", amount: 300 }
        ]
      }
    ],
    members
  );

  assert.deepEqual(balances, [
    { userId: "a", amount: 600 },
    { userId: "b", amount: -300 },
    { userId: "c", amount: -300 }
  ]);
});

test("simplifies balances into minimum practical settlements", () => {
  const settlements = simplifySettlements([
    { userId: "a", amount: 600 },
    { userId: "b", amount: -300 },
    { userId: "c", amount: -300 }
  ]);

  assert.deepEqual(settlements, [
    { from: "b", to: "a", amount: 300 },
    { from: "c", to: "a", amount: 300 }
  ]);
});
