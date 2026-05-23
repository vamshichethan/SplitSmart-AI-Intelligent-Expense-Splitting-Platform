export async function createRazorpayOrder({ amount, receipt }) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return {
      provider: "mock",
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
    ...(await response.json())
  };
}
