const fallbackReceipt = {
  provider: "local",
  merchant: "Coastal Curry House",
  confidence: 0.74,
  tax: 184,
  serviceCharge: 240,
  total: 3144,
  items: [
    { name: "Veg Thali", price: 640 },
    { name: "Chicken Biryani", price: 920 },
    { name: "Lime Soda", price: 320 },
    { name: "Chocolate Brownie", price: 840 }
  ]
};

export async function extractReceiptDetails(receiptText = "") {
  const cleanedText = receiptText.trim();

  if (!process.env.GEMINI_API_KEY || !cleanedText) {
    return {
      ...fallbackReceipt,
      note: process.env.GEMINI_API_KEY ? "Add receipt text for Gemini extraction." : "GEMINI_API_KEY is not configured."
    };
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const prompt = [
    "Extract a restaurant or shopping receipt into strict JSON.",
    'Schema: {"merchant": string, "confidence": number, "tax": number, "serviceCharge": number, "total": number, "items": [{"name": string, "price": number}]}',
    "Use INR amounts as numbers. If tax, service charge, or total are missing, infer only when obvious; otherwise use 0 for extras and subtotal for total.",
    "Return only JSON. Receipt text:",
    cleanedText
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 700 }
      })
    }
  );

  if (!response.ok) {
    return { ...fallbackReceipt, note: "Gemini extraction failed, so local demo data was used." };
  }

  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    return normalizeGeminiReceipt(JSON.parse(stripCodeFence(text)));
  } catch {
    return { ...fallbackReceipt, note: "Gemini returned an unreadable receipt shape, so local demo data was used." };
  }
}

function normalizeGeminiReceipt(receipt) {
  const items = Array.isArray(receipt.items)
    ? receipt.items
        .map((item) => ({
          name: String(item.name ?? "Receipt item").trim(),
          price: money(item.price)
        }))
        .filter((item) => item.name && item.price > 0)
    : [];

  if (!items.length) {
    return { ...fallbackReceipt, note: "Gemini did not find line items, so local demo data was used." };
  }

  const subtotal = money(items.reduce((sum, item) => sum + item.price, 0));
  const tax = money(receipt.tax);
  const serviceCharge = money(receipt.serviceCharge);
  const total = money(receipt.total) || money(subtotal + tax + serviceCharge);

  return {
    provider: "gemini",
    merchant: String(receipt.merchant ?? "Receipt").trim() || "Receipt",
    confidence: clamp(Number(receipt.confidence) || 0.86, 0, 1),
    tax,
    serviceCharge,
    total,
    items
  };
}

function stripCodeFence(text) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) / 100 : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
