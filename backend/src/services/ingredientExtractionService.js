const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_VISION_MODEL || "anthropic/claude-sonnet-4.5";

// Pregnancy-safety verdicts depend on the exact ingredients printed on this
// specific product. The model must transcribe what it can see in the photo,
// never fill gaps from what it "knows" about the product in general —
// regional recipes vary (e.g. cane sugar vs. HFCS) and a remembered guess
// could produce a false "safe" verdict downstream.
const SYSTEM_PROMPT = `You are a product-label reader for a pregnancy and breastfeeding safety app.

You will be shown a photo of a food, drink, medicine, or skincare product. Read only what is visibly printed in the image.

Rules:
- Transcribe the ingredients list exactly as printed, one ingredient per array entry, preserving the printed order.
- Never supplement, correct, or complete the list using general knowledge of the product. If the photo doesn't show the full list, return only the part you can actually read.
- If no ingredients panel is visible or legible, set "ingredientsVisible" to false and leave "ingredients" empty.
- If a product name or brand is visible, include it; otherwise use null.

Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "productName": string | null,
  "ingredients": string[],
  "ingredientsVisible": boolean,
  "notes": string
}`;

export class IngredientExtractionError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "IngredientExtractionError";
    this.cause = cause;
  }
}

/**
 * Sends a product photo to a vision-capable LLM (via OpenRouter) and returns
 * the ingredients transcribed from the label, if any is visible.
 * @param {Buffer} imageBuffer
 * @param {string} mimeType e.g. "image/jpeg"
 */
export async function extractIngredientsFromImage(imageBuffer, mimeType) {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) {
    throw new IngredientExtractionError("OPENROUTER_KEY is not configured");
  }

  const dataUrl = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;

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
          {
            role: "user",
            content: [
              { type: "text", text: "Read this product photo and extract the ingredients." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    throw new IngredientExtractionError("Could not reach the vision model provider", err);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new IngredientExtractionError(
      `Vision model request failed (${response.status}): ${errText}`
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new IngredientExtractionError("Vision model returned no content");
  }

  return parseModelResponse(content);
}

function parseModelResponse(content) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : content;

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new IngredientExtractionError("Could not parse vision model response as JSON", err);
  }

  return {
    productName: typeof parsed.productName === "string" ? parsed.productName : null,
    ingredients: Array.isArray(parsed.ingredients)
      ? parsed.ingredients.filter((i) => typeof i === "string")
      : [],
    ingredientsVisible: Boolean(parsed.ingredientsVisible),
    notes: typeof parsed.notes === "string" ? parsed.notes : "",
  };
}
