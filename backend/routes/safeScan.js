import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { extractIngredientsFromImage } from "../src/services/ingredientExtractionService.js";
import { lookupProductByBarcode } from "../src/services/barcodeProductLookupService.js";
import { getClarityVerdict } from "../src/services/clarityVerdictService.js";
import { getSafetyVerdict } from "../src/services/safetyVerdictService.js";

const router = Router();
const scans = new Map();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) return callback(new Error("Only image uploads are supported"));
    callback(null, true);
  },
});

const STATUS = {
  likely_safe: "safe",
  caution: "caution",
  avoid: "avoid",
  insufficient_data: "pending",
};

function parseProfile(value) {
  const fallback = { trimester: 2, conditions: [], allergies: [] };
  try {
    const parsed = JSON.parse(value || "");
    if (![1, 2, 3].includes(parsed.trimester)) return null;
    if (!Array.isArray(parsed.conditions) || !Array.isArray(parsed.allergies)) return null;
    return {
      trimester: parsed.trimester,
      conditions: parsed.conditions,
      allergies: parsed.allergies,
    };
  } catch {
    return value ? null : fallback;
  }
}

function profileNote(ingredient, profile) {
  if (profile.conditions.includes("gestational_diabetes") && /\bsugar\b/i.test(ingredient)) {
    return "High sugar load matters for glucose targets.";
  }
  return null;
}

function reportFromVerdict(productName, ingredients, verdict, profile) {
  const notesByName = new Map(
    verdict.ingredientNotes.map((note) => [note.ingredient.trim().toLowerCase(), note]),
  );

  const reportIngredients = ingredients.map((raw) => {
    const note = notesByName.get(raw.trim().toLowerCase());
    const status = note ? STATUS[note.pregnancy] || "pending" : "pending";
    return {
      name: note?.ingredient || raw.trim().toLowerCase(),
      raw,
      status,
      why: note?.reasoning || null,
      max_amount: null,
      personal_note: profileNote(note?.ingredient || raw, profile),
      source: status === "pending" ? "pending" : "database",
    };
  });

  const pending_count = reportIngredients.filter((ingredient) => ingredient.status === "pending").length;
  const verdictStatus = reportIngredients.reduce(
    (worst, ingredient) => (rank(ingredient.status) > rank(worst) ? ingredient.status : worst),
    pending_count === reportIngredients.length ? "pending" : "safe",
  );

  return {
    product_name: productName,
    verdict: verdictStatus,
    summary: pending_count ? null : verdict.pregnancy.summary || verdict.disclaimer || null,
    pending_count,
    ingredients: reportIngredients,
  };
}

function rank(status) {
  return { pending: 0, safe: 1, caution: 2, avoid: 3 }[status] || 0;
}

async function extractFromPhotos(photos) {
  const extracted = await Promise.all(
    photos.map((photo) => extractIngredientsFromImage(photo.buffer, photo.mimetype)),
  );
  const seen = new Set();
  const ingredients = extracted.flatMap((result) => result.ingredients).filter((ingredient) => {
    const key = ingredient.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    productName: extracted.find((result) => result.productName)?.productName || null,
    ingredients,
  };
}

async function researchPending(scanId) {
  const scan = scans.get(scanId);
  if (!scan || scan.status !== "partial") return;

  const pending = scan.report.ingredients.filter((ingredient) => ingredient.status === "pending");
  try {
    const resolution = await getSafetyVerdict(
      scan.report.product_name,
      pending.map((ingredient) => ingredient.raw),
    );
    const notes = new Map(
      resolution.ingredientNotes.map((note) => [note.ingredient.trim().toLowerCase(), note]),
    );
    const ingredients = scan.report.ingredients.map((ingredient) => {
      if (ingredient.status !== "pending") return ingredient;
      const note = notes.get(ingredient.raw.trim().toLowerCase());
      const status = note?.pregnancy === "avoid" ? "avoid" : note?.pregnancy === "likely_safe" ? "safe" : "caution";
      return {
        ...ingredient,
        name: note?.ingredient || ingredient.name,
        status,
        why: note?.reasoning || "Evidence is limited; use caution and ask your care team if you are unsure.",
        source: "agent",
      };
    });
    const overall = ingredients.reduce((worst, ingredient) => (rank(ingredient.status) > rank(worst) ? ingredient.status : worst), "safe");
    scan.status = "complete";
    scan.report = {
      ...scan.report,
      verdict: overall,
      summary: resolution.pregnancy.summary || resolution.disclaimer || "",
      pending_count: 0,
      ingredients,
    };
  } catch (error) {
    scan.status = "failed";
    scan.error = "Couldn't finish researching the unfamiliar ingredients. Try again in a moment.";
  }
}

router.post("/", upload.array("photos", 5), async (req, res) => {
  const profile = parseProfile(req.body.profile);
  const barcode = req.body.barcode?.trim();
  const photos = req.files || [];
  if (!profile) return res.status(400).json({ detail: "invalid profile" });
  if (!barcode && photos.length === 0) return res.status(400).json({ detail: "provide photos or barcode" });

  try {
    const input = barcode
      ? await lookupProductByBarcode(barcode)
      : await extractFromPhotos(photos);
    const productName = barcode ? input.productName : input.productName;
    const ingredients = barcode ? input.ingredients : input.ingredients;
    if (!ingredients?.length) {
      return res.json({
        scan_id: randomUUID(),
        status: "failed",
        report: null,
        error: "Couldn't read the label. Try a closer photo of the ingredients panel.",
      });
    }

    const verdict = await getClarityVerdict(productName, ingredients);
    const report = reportFromVerdict(productName, ingredients, verdict, profile);
    const scan = {
      scan_id: randomUUID(),
      status: report.pending_count ? "partial" : "complete",
      report,
      error: null,
    };
    scans.set(scan.scan_id, scan);
    if (scan.status === "partial") void researchPending(scan.scan_id);
    res.json(scan);
  } catch (error) {
    console.error("SafeScan contract request failed:", error.message || error);
    res.json({
      scan_id: randomUUID(),
      status: "failed",
      report: null,
      error: "Couldn't complete this check. Try again with a clear label photo or barcode.",
    });
  }
});

router.get("/:scanId", (req, res) => {
  const scan = scans.get(req.params.scanId);
  if (!scan) return res.status(404).json({ detail: "scan not found" });
  res.json(scan);
});

export default router;
