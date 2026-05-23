import assert from "node:assert/strict";
import test from "node:test";
import { initializePersistence } from "../src/services/persistence.js";

test("persistence is disabled when DATABASE_URL is not configured", async () => {
  const original = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  const result = await initializePersistence();

  process.env.DATABASE_URL = original;
  assert.deepEqual(result, { enabled: false });
});
