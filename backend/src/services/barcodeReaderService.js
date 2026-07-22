const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_VISION_MODEL || "anthropic/claude-sonnet-4.5";

const SYSTEM_PROMPT = `You read barcode numbers from photos. The photo shows a product barcode (UPC/EAN), usually with the digits printed below the bars.

Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly:
{ "barcode": string | null, "visible": boolean }

If you cannot clearly read the full digit sequence, set "barcode" to null and "visible" to false. Do not guess missing digits.`;

export class BarcodeReadError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "BarcodeReadError";
    this.cause = cause;
  }
}

export async function readBarcodeFromImage(imageBuffer, mimeType) {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) {
    throw new BarcodeReadError("OPENROUTER_KEY is not configured");
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
              { type: "text", text: "Read the barcode number in this photo." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    throw new BarcodeReadError("Could not reach the vision model provider", err);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new BarcodeReadError(`Vision model request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new BarcodeReadError("Vision model returned no content");
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  let parsed;
  try {
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch (err) {
    throw new BarcodeReadError("Could not parse barcode model response as JSON", err);
  }

  return {
    barcode: typeof parsed.barcode === "string" ? parsed.barcode.replace(/\s+/g, "") : null,
    visible: Boolean(parsed.visible),
  };
}
