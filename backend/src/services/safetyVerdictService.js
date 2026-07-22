const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_TEXT_MODEL || "openai/gpt-4o-mini";

// This is the core trust promise of the product: never round a shaky guess
// up to "safe". Thresholds also differ between pregnancy and breastfeeding,
// so both get their own status rather than one collapsed verdict.
const SYSTEM_PROMPT = `You are a clinical-safety assistant for a pregnancy and breastfeeding product-safety app. You will be given a product name (if known) and a list of ingredients transcribed from its label. Assess safety during (a) pregnancy and (b) breastfeeding, using established clinical/regulatory guidance (FDA, ACOG, CDC, LactMed, e-lactancia, EFSA and similar).

Use exactly these status values: "likely_safe", "caution", "avoid", "insufficient_data".
- "avoid": clear, well-established guidance against use in pregnancy/breastfeeding (e.g. alcohol, unpasteurized soft cheese, high-mercury fish, retinoids).
- "caution": fine in moderation or limited amounts, mixed evidence, or dose/frequency-dependent (e.g. caffeine, artificial sweeteners, high-dose vitamin A).
- "insufficient_data": evidence is genuinely limited or you are not confident. Never stretch to "likely_safe" just to produce an answer.
- Never present a guess as certainty. This app gives guidance, not a diagnosis.

Return ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "pregnancy": { "status": "likely_safe" | "caution" | "avoid" | "insufficient_data", "summary": string },
  "breastfeeding": { "status": "likely_safe" | "caution" | "avoid" | "insufficient_data", "summary": string },
  "ingredientNotes": [
    { "ingredient": string, "pregnancy": status, "breastfeeding": status, "reasoning": string }
  ],
  "alternatives": [
    { "suggestion": string, "reason": string }
  ],
  "disclaimer": string
}

Only list ingredients in "ingredientNotes" that are not plainly "likely_safe" for both categories, or that are commonly asked about — skip restating inert ingredients like water or salt unless the list is short.
"alternatives" should be concrete product-category suggestions (never brand endorsements) that avoid the flagged ingredients, e.g. "caffeine-free herbal soda" for a caffeinated soft drink. Omit if nothing is flagged.
"disclaimer" should note this is guidance, not medical advice, and to check with an OB/midwife for anything flagged caution or avoid.`;

export class SafetyVerdictError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "SafetyVerdictError";
    this.cause = cause;
  }
}

/**
 * @param {string | null} productName
 * @param {string[]} ingredients
 */
export async function getSafetyVerdict(productName, ingredients) {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) {
    throw new SafetyVerdictError("OPENROUTER_KEY is not configured");
  }
  if (!ingredients || ingredients.length === 0) {
    throw new SafetyVerdictError("At least one ingredient is required");
  }

  const userContent = [
    productName ? `Product: ${productName}` : "Product: (name not identified)",
    "Ingredients:",
    ...ingredients.map((i) => `- ${i}`),
  ].join("\n");

  let response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });
  } catch (err) {
    throw new SafetyVerdictError("Could not reach the verdict model provider", err);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new SafetyVerdictError(`Verdict model request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new SafetyVerdictError("Verdict model returned no content");
  }

  return parseVerdictResponse(content);
}

const VALID_STATUSES = new Set(["likely_safe", "caution", "avoid", "insufficient_data"]);

function normalizeStatus(status) {
  return VALID_STATUSES.has(status) ? status : "insufficient_data";
}

function parseVerdictResponse(content) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : content;

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new SafetyVerdictError("Could not parse verdict model response as JSON", err);
  }

  const pregnancy = parsed.pregnancy ?? {};
  const breastfeeding = parsed.breastfeeding ?? {};

  return {
    pregnancy: {
      status: normalizeStatus(pregnancy.status),
      summary: typeof pregnancy.summary === "string" ? pregnancy.summary : "",
    },
    breastfeeding: {
      status: normalizeStatus(breastfeeding.status),
      summary: typeof breastfeeding.summary === "string" ? breastfeeding.summary : "",
    },
    ingredientNotes: Array.isArray(parsed.ingredientNotes)
      ? parsed.ingredientNotes
          .filter((n) => n && typeof n.ingredient === "string")
          .map((n) => ({
            ingredient: n.ingredient,
            pregnancy: normalizeStatus(n.pregnancy),
            breastfeeding: normalizeStatus(n.breastfeeding),
            reasoning: typeof n.reasoning === "string" ? n.reasoning : "",
          }))
      : [],
    alternatives: Array.isArray(parsed.alternatives)
      ? parsed.alternatives
          .filter((a) => a && typeof a.suggestion === "string")
          .map((a) => ({
            suggestion: a.suggestion,
            reason: typeof a.reason === "string" ? a.reason : "",
          }))
      : [],
    disclaimer:
      typeof parsed.disclaimer === "string" && parsed.disclaimer
        ? parsed.disclaimer
        : "This is guidance, not medical advice. Check with your OB or midwife about anything flagged caution or avoid.",
  };
}
