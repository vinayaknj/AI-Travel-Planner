
export function extractJSON(raw) {
  let clean = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start !== -1 && end !== -1) clean = clean.slice(start, end + 1);
  return clean;
}

export function safeParse(raw) {
  const clean = extractJSON(raw);
  try {
    return JSON.parse(clean);
  } catch {
    const repaired = clean.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    return JSON.parse(repaired);
  }
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export async function callGroq(systemPrompt, userPrompt) {
  const groqApiKey = requireEnv("GROQ_API_KEY");
  const res = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "";
  if (!raw) throw new Error("Groq empty");
  return safeParse(raw);
}

export async function callGemini(systemPrompt, userPrompt) {
  const geminiApiKey = requireEnv("GEMINI_API_KEY");
  const combined = `${systemPrompt}\n\n${userPrompt}`;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4000,
          responseMimeType: "application/json",
        },
        contents: [{ parts: [{ text: combined }] }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!raw) throw new Error("Gemini empty");
  return safeParse(raw);
}
