import assert from "node:assert/strict";
import test from "node:test";
import { generateAiInsights } from "../src/services/aiInsights.js";
import { createRazorpayOrder } from "../src/services/razorpay.js";

test("Gemini insights fall back locally when key is absent", async () => {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const result = await generateAiInsights({
    group: { name: "Demo" },
    analytics: { insights: ["Local insight"] },
    balances: []
  });

  process.env.GEMINI_API_KEY = original;
  assert.deepEqual(result, { provider: "local", insights: ["Local insight"] });
});

test("Razorpay order falls back to mock when credentials are absent", async () => {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;

  const result = await createRazorpayOrder({ amount: 500, receipt: "test" });

  process.env.RAZORPAY_KEY_ID = key;
  process.env.RAZORPAY_KEY_SECRET = secret;
  assert.equal(result.provider, "mock");
  assert.equal(result.amount, 50000);
});
