export async function generateAiInsights({ group, analytics, balances }) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      provider: "local",
      insights: analytics.insights
    };
  }

  const prompt = [
    `You are SplitSmart AI. Generate 3 concise spending insights for group "${group.name}".`,
    `Analytics JSON: ${JSON.stringify({ analytics, balances })}`,
    "Return only a JSON array of strings."
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 300 }
      })
    }
  );

  if (!response.ok) {
    return {
      provider: "local",
      insights: analytics.insights
    };
  }

  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

  try {
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const insights = JSON.parse(cleaned);
    return {
      provider: "gemini",
      insights: Array.isArray(insights) ? insights.slice(0, 4) : analytics.insights
    };
  } catch {
    return {
      provider: "gemini",
      insights: [text]
    };
  }
}
