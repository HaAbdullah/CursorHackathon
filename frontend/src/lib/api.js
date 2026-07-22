import { delay, mockScan } from "./mockScan.js";

/**
 * Tries the real backend first; falls back to the local demo catalog.
 * Contract we expect from backend teammates:
 *   POST /api/scan { barcode, stage }
 *   → { barcode, name, brand, category, stage, verdict, summary, reasons, ingredients, sources }
 */
export async function scanProduct({ barcode, stage }) {
  try {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode, stage }),
    });

    if (res.ok) {
      const data = await res.json();
      return { ...data, demo: false };
    }
  } catch {
    // Backend offline — use mock.
  }

  await delay(700);
  return mockScan({ barcode, stage });
}
