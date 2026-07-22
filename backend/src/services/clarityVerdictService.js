import { lookupIngredientsSafety } from "./ingredientSafetyLookupService.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_TEXT_MODEL || "openai/gpt-4o-mini";

const SEVERITY_ORDER = { avoid: 3, caution: 2, insufficient_data: 1, likely_safe: 0 };

function aggregate(statuses) {
  return statuses.reduce(
    (worst, s) => (SEVERITY_ORDER[s] > SEVERITY_ORDER[worst] ? s : worst),
    "likely_safe"
  );
}

const SUMMARY_PROMPT = `You write short, plain-language safety summaries for a pregnancy/breastfeeding product app. You are given a product name and a list of ingredients that ALREADY have a determined pregnancy and breastfeeding status (from a clinical database) — do not change or second-guess these statuses.

Using only the given statuses and reasoning, write:
- a one-to-two sentence "pregnancy" summary
- a one-to-two sentence "breastfeeding" summary
- 0-3 concrete product-category alternatives (never brand names) that would avoid the flagged ingredients

Respond with ONLY valid JSON, no markdown fences:
{
  "pregnancySummary": string,
  "breastfeedingSummary": string,
  "alternatives": [ { "suggestion": string, "reason": string } ]
}`;

async function synthesizeSummary(productName, ingredientNotes, pregnancyStatus, breastfeedingStatus) {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) {
    return { pregnancySummary: "", breastfeedingSummary: "", alternatives: [] };
  }

  const userContent = [
    productName ? `Product: ${productName}` : "Product: (name not identified)",
    `Overall pregnancy status: ${pregnancyStatus}`,
    `Overall breastfeeding status: ${breastfeedingStatus}`,
    "Ingredient details:",
    ...ingredientNotes.map(
      (n) =>
        `- ${n.ingredient}: pregnancy=${n.pregnancy}, breastfeeding=${n.breastfeeding}${
          n.reasoning ? ` (${n.reasoning})` : ""
        }`
    ),
  ].join("\n");

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: SUMMARY_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) return { pregnancySummary: "", breastfeedingSummary: "", alternatives: [] };

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { pregnancySummary: "", breastfeedingSummary: "", alternatives: [] };

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    return {
      pregnancySummary: typeof parsed.pregnancySummary === "string" ? parsed.pregnancySummary : "",
      breastfeedingSummary:
        typeof parsed.breastfeedingSummary === "string" ? parsed.breastfeedingSummary : "",
      alternatives: Array.isArray(parsed.alternatives)
        ? parsed.alternatives
            .filter((a) => a && typeof a.suggestion === "string")
            .map((a) => ({ suggestion: a.suggestion, reason: a.reason ?? "" }))
        : [],
    };
  } catch {
    return { pregnancySummary: "", breastfeedingSummary: "", alternatives: [] };
  }
}

/**
 * Builds a verdict from the Clarity ingredient-safety database, with a light
 * LLM pass only for narrating the already-determined statuses + alternatives.
 * @param {string | null} productName
 * @param {string[]} ingredients
 */
export async function getClarityVerdict(productName, ingredients) {
  const lookups = await lookupIngredientsSafety(ingredients);

  const ingredientNotes = lookups.map((l) =>
    l.hit
      ? {
          ingredient: l.ingredient,
          source: "clarity_db",
          pregnancy: l.pregnancy,
          breastfeeding: l.breastfeeding,
          reasoning: l.reasoning,
          evidenceTier: l.evidenceTier,
          citation: l.citation,
        }
      : {
          ingredient: l.ingredient,
          source: "unknown",
          pregnancy: "insufficient_data",
          breastfeeding: "insufficient_data",
          reasoning: "Not yet covered by the ingredient safety database.",
          evidenceTier: null,
          citation: null,
        }
  );

  const pregnancyStatus = aggregate(ingredientNotes.map((n) => n.pregnancy));
  const breastfeedingStatus = aggregate(ingredientNotes.map((n) => n.breastfeeding));

  const { pregnancySummary, breastfeedingSummary, alternatives } = await synthesizeSummary(
    productName,
    ingredientNotes,
    pregnancyStatus,
    breastfeedingStatus
  );

  const dbBacked = ingredientNotes.filter((n) => n.source === "clarity_db").length;

  return {
    pregnancy: { status: pregnancyStatus, summary: pregnancySummary },
    breastfeeding: { status: breastfeedingStatus, summary: breastfeedingSummary },
    ingredientNotes,
    alternatives,
    coverage: { dbBacked, total: ingredientNotes.length },
    disclaimer:
      "This is guidance from a clinical ingredient database, not medical advice. Check with your OB or midwife about anything flagged caution or avoid.",
  };
}
