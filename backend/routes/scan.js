import { Router } from "express";
import multer from "multer";
import {
  extractIngredientsFromImage,
  IngredientExtractionError,
} from "../src/services/ingredientExtractionService.js";
import { getSafetyVerdict, SafetyVerdictError } from "../src/services/safetyVerdictService.js";
import { readBarcodeFromImage, BarcodeReadError } from "../src/services/barcodeReaderService.js";
import {
  lookupProductByBarcode,
  ProductLookupError,
} from "../src/services/barcodeProductLookupService.js";
import { getClarityVerdict } from "../src/services/clarityVerdictService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are supported"));
    }
    cb(null, true);
  },
});

const router = Router();

const STATUS_TO_VERDICT = {
  likely_safe: "safe",
  caution: "caution",
  avoid: "avoid",
  insufficient_data: "unknown",
};

// POST /api/scan — JSON { barcode, stage }, the pulled Expecta frontend's contract.
router.post("/", async (req, res) => {
  const { barcode, stage } = req.body || {};
  if (!barcode) {
    return res.status(400).json({ error: "barcode is required" });
  }

  try {
    const product = await lookupProductByBarcode(barcode);
    if (!product.found || product.ingredients.length === 0) {
      return res.status(404).json({ error: "Product not found", barcode });
    }

    const verdictData = await getClarityVerdict(product.productName, product.ingredients);
    const forNursing = stage === "nursing";
    const chosen = forNursing ? verdictData.breastfeeding : verdictData.pregnancy;

    res.json({
      barcode,
      name: product.productName || "Unknown product",
      brand: null,
      category: null,
      stage,
      verdict: STATUS_TO_VERDICT[chosen.status] || "unknown",
      summary: chosen.summary || verdictData.disclaimer,
      reasons: verdictData.ingredientNotes
        .filter((n) => n.reasoning)
        .map((n) => `${n.ingredient}: ${n.reasoning}`),
      ingredients: verdictData.ingredientNotes.map((n) => ({
        name: n.ingredient,
        risk: STATUS_TO_VERDICT[forNursing ? n.breastfeeding : n.pregnancy] || "unknown",
      })),
      sources: verdictData.ingredientNotes.filter((n) => n.citation).map((n) => n.citation),
    });
  } catch (err) {
    console.error("Barcode-string scan failed:", err.message || err);
    res.status(502).json({ error: "Scan failed" });
  }
});

// POST /api/scan/photo — photo of the label, straight through OpenRouter
// (vision extracts ingredients, then a text pass gives the verdict).
router.post("/photo", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "image file is required (field name: image)" });
  }

  try {
    const extracted = await extractIngredientsFromImage(req.file.buffer, req.file.mimetype);

    if (!extracted.ingredientsVisible || extracted.ingredients.length === 0) {
      return res.json({ ...extracted, verdict: null });
    }

    const verdict = await getSafetyVerdict(extracted.productName, extracted.ingredients);
    res.json({ ...extracted, verdict });
  } catch (err) {
    if (err instanceof IngredientExtractionError || err instanceof SafetyVerdictError) {
      console.error("Photo scan failed:", err.message, err.cause ?? "");
      return res.status(502).json({ error: "Failed to process product photo" });
    }
    console.error("Unexpected error during photo scan:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

// POST /api/scan/barcode — photo of the barcode, looked up against the
// Clarity ingredient-safety database.
router.post("/barcode", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "image file is required (field name: image)" });
  }

  try {
    const { barcode, visible } = await readBarcodeFromImage(req.file.buffer, req.file.mimetype);
    if (!visible || !barcode) {
      return res.status(422).json({ error: "Could not read a barcode in this photo" });
    }

    const product = await lookupProductByBarcode(barcode);
    if (!product.found || product.ingredients.length === 0) {
      return res.status(404).json({
        error: "Product not found or has no listed ingredients",
        barcode,
      });
    }

    const verdict = await getClarityVerdict(product.productName, product.ingredients);
    res.json({
      barcode,
      productName: product.productName,
      ingredients: product.ingredients,
      verdict,
    });
  } catch (err) {
    if (err instanceof BarcodeReadError || err instanceof ProductLookupError) {
      console.error("Barcode scan failed:", err.message, err.cause ?? "");
      return res.status(502).json({ error: "Failed to process barcode scan" });
    }
    console.error("Unexpected error during barcode scan:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;
