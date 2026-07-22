const CLARITY_URL = "https://clarity-ingredient-safety.p.rapidapi.com/v1/ingredient";
const CLARITY_HOST = "clarity-ingredient-safety.p.rapidapi.com";

const VALID_STATUSES = new Set(["likely_safe", "caution", "avoid", "insufficient_data"]);

function normalizeStatusText(value) {
  if (!value || typeof value !== "string") return "insufficient_data";
  const v = value.toLowerCase();
  if (v.includes("avoid") || v.includes("unsafe") || v.includes("not recommended") || v.includes("contraindicated"))
    return "avoid";
  if (v.includes("caution") || v.includes("moderation") || v.includes("limit")) return "caution";
  if (v.startsWith("safe")) return "likely_safe";
  return "caution";
}

/** Looks up a single ingredient in the Clarity safety database. */
export async function lookupIngredientSafety(name) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return { ingredient: name, source: "unavailable", hit: false };

  const url = new URL(CLARITY_URL);
  url.searchParams.set("q", name);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "x-rapidapi-host": CLARITY_HOST,
        "x-rapidapi-key": apiKey,
      },
    });
  } catch {
    return { ingredient: name, source: "unavailable", hit: false };
  }

  if (!response.ok) {
    return { ingredient: name, source: "unavailable", hit: false };
  }

  const data = await response.json().catch(() => null);
  if (!data || data.kind !== "hit" || !data.result) {
    return { ingredient: name, source: "clarity_db", hit: false };
  }

  const r = data.result;
  const pregnancyText = typeof r.pregnancy === "string" ? r.pregnancy : null;
  const lactationText = typeof r.lactation === "string" ? r.lactation : null;

  const reasoning =
    [pregnancyText, lactationText]
      .filter((t) => t && t.length > 20)
      .sort((a, b) => b.length - a.length)[0] ||
    (r.citation ? r.citation : `${r.name}: ${r.verdict || "no summary available"}.`);

  return {
    ingredient: name,
    canonicalName: r.name || name,
    source: "clarity_db",
    hit: true,
    pregnancy: normalizeStatusText(pregnancyText || r.verdict),
    breastfeeding: normalizeStatusText(lactationText || r.verdict),
    reasoning,
    evidenceTier: r.evidence?.tier ?? null,
    citation: r.citation ?? null,
  };
}

/** Looks up many ingredients concurrently. */
export async function lookupIngredientsSafety(names) {
  return Promise.all(names.map((name) => lookupIngredientSafety(name)));
}

export { VALID_STATUSES };
