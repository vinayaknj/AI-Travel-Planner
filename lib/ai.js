
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

function previewText(value, maxLength = 320) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function repairCommonJsonIssues(clean) {
  return clean
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/}\s*{/g, "},{")
    .replace(/]\s*\[/g, "],[")
    .replace(/}\s*"/g, '},"')
    .replace(/]\s*"/g, '],"')
    .replace(/"\s*{/g, '",{')
    .replace(/"\s*\[/g, '",[')
    .replace(/"\s*"/g, '","');
}

export function safeParse(raw) {
  const clean = extractJSON(raw);
  try {
    return JSON.parse(clean);
  } catch (firstError) {
    const repaired = repairCommonJsonIssues(clean);
    try {
      return JSON.parse(repaired);
    } catch (secondError) {
      const compact = repaired.replace(/\r?\n/g, " ");
      try {
        return JSON.parse(compact);
      } catch (finalError) {
        throw new Error(
          `JSON parse failed after repair attempts: ${finalError.message}. Initial error: ${firstError.message}. Preview: ${previewText(clean)}`
        );
      }
    }
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

async function fetchGeminiRaw(promptText, options = {}) {
  const geminiApiKey = requireEnv("GEMINI_API_KEY");
  const model = options.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  let res;
  try {
    res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: {
            temperature: options.temperature ?? 0.4,
            maxOutputTokens: options.maxOutputTokens ?? 4000,
            responseMimeType: "application/json",
          },
          contents: [{ parts: [{ text: promptText }] }],
        }),
      },
      options.timeoutMs ?? 30000
    );
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Gemini request timed out after ${options.timeoutMs ?? 30000}ms`);
    }
    throw error;
  }
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!raw) throw new Error("Gemini empty");
  return raw;
}

export async function callGemini(systemPrompt, userPrompt) {
  const combined = `${systemPrompt}\n\n${userPrompt}`;
  const raw = await fetchGeminiRaw(combined, {
    temperature: 0.35,
    maxOutputTokens: 3600,
    timeoutMs: 30000,
  });

  try {
    return safeParse(raw);
  } catch (parseError) {
    const repairPrompt = [
      "Convert the following content into strictly valid JSON.",
      "Rules:",
      "- Return ONLY valid JSON",
      "- Do not add commentary or markdown",
      "- Preserve the original structure and meaning",
      "- Fix commas, brackets, quotes, and trailing characters if needed",
      "",
      "CONTENT:",
      raw,
    ].join("\n");

    const repairedRaw = await fetchGeminiRaw(repairPrompt, {
      temperature: 0,
      maxOutputTokens: 3600,
      timeoutMs: 20000,
    });

    try {
      return safeParse(repairedRaw);
    } catch (repairError) {
      throw new Error(
        `Gemini returned malformed JSON. First parse error: ${parseError.message}. Repair parse error: ${repairError.message}`
      );
    }
  }
}
