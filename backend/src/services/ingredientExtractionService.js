const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_VISION_MODEL || "anthropic/claude-sonnet-4.5";

const SYSTEM_PROMPT = `You are a product-label reader for a pregnancy and breastfeeding safety app.

You will be shown a photo of a food, drink, medicine, or skincare product. The photo may show an ingredients panel, the front of a package, or the product itself.

Rules:
- If an ingredients panel is visible, transcribe it exactly as printed, one ingredient per array entry, preserving the printed order.
- If an ingredients panel is not visible, identify the product, brand, or product category from the package image. Then provide a best-effort list of the usual ingredients for that identifiable product from your product knowledge. For a whole food, list the food itself (for example, "banana").
- Do not return an empty ingredients list merely because the label panel is out of frame. Only leave it empty when you cannot identify either the product or its category at all.
- Set "ingredientsVisible" to true only when ingredients were visibly read from the package. Set it to false when the list is inferred from product knowledge.
- In "notes", clearly say whether the list was read from the label or inferred from the pictured product. Do not invent a brand name when it is not visible.

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

  const dataUrl = `data:${normalizeMimeType(mimeType)};base64,${imageBuffer.toString("base64")}`;

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

function normalizeMimeType(mimeType) {
  if (mimeType === "image/jpg") return "image/jpeg";
  if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType)) return mimeType;
  return "image/jpeg";
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
