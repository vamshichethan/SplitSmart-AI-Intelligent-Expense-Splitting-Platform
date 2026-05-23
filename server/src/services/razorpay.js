import crypto from "node:crypto";

export async function createRazorpayOrder({ amount, receipt }) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return {
      provider: "mock",
      keyId: "",
      id: `order_mock_${Date.now()}`,
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt
    };
  }

  const credentials = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Razorpay order failed: ${error}`);
  }

  return {
    provider: "razorpay",
    keyId: process.env.RAZORPAY_KEY_ID,
    ...(await response.json())
  };
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    return orderId?.startsWith("order_mock_");
  }

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expected === signature;
}
