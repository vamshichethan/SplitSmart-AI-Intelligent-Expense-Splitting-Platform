import assert from "node:assert/strict";
import test from "node:test";
import { buildExpenseSplits, SplitValidationError } from "../src/utils/splits.js";

test("equal splits rebalance rounding to the full expense amount", () => {
  assert.deepEqual(
    buildExpenseSplits({
      amount: 100,
      members: ["u1", "u2", "u3"],
      splitMode: "equal"
    }),
    [
      { userId: "u1", amount: 33.33 },
      { userId: "u2", amount: 33.33 },
      { userId: "u3", amount: 33.34 }
    ]
  );
});

test("custom splits must match the expense amount", () => {
  assert.throws(
    () =>
      buildExpenseSplits({
        amount: 500,
        members: ["u1", "u2"],
        splitMode: "custom",
        splits: [
          { userId: "u1", amount: 200 },
          { userId: "u2", amount: 200 }
        ]
      }),
    SplitValidationError
  );
});

test("percentage splits convert to balanced amounts", () => {
  assert.deepEqual(
    buildExpenseSplits({
      amount: 999,
      members: ["u1", "u2", "u3"],
      splitMode: "percentage",
      splits: [
        { userId: "u1", percentage: 50 },
        { userId: "u2", percentage: 25 },
        { userId: "u3", percentage: 25 }
      ]
    }),
    [
      { userId: "u1", amount: 499.5 },
      { userId: "u2", amount: 249.75 },
      { userId: "u3", amount: 249.75 }
    ]
  );
});
