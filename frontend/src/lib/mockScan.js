/** Demo catalog for shelf scans until the real safety backend lands. */

export const DEMO_PRODUCTS = [
  {
    barcode: "3017624010701",
    name: "Nutella",
    brand: "Ferrero",
    category: "food",
  },
  {
    barcode: "3700032900014",
    name: "CeraVe Moisturizing Cream",
    brand: "CeraVe",
    category: "skincare",
  },
  {
    barcode: "0030049001502",
    name: "Tylenol Extra Strength",
    brand: "Tylenol",
    category: "medicine",
  },
  {
    barcode: "071249074556",
    name: "Retinol Serum",
    brand: "Demo Beauty",
    category: "skincare",
  },
  {
    barcode: "022898914285",
    name: "Ibuprofen 200mg",
    brand: "Generic",
    category: "medicine",
  },
];

const CATALOG = {
  "3017624010701": {
    name: "Nutella",
    brand: "Ferrero",
    category: "food",
    ingredients: [
      { name: "Sugar", risk: "low" },
      { name: "Palm oil", risk: "low" },
      { name: "Hazelnuts", risk: "low" },
      { name: "Cocoa", risk: "low" },
      { name: "Skim milk powder", risk: "low" },
    ],
    byStage: {
      t1: {
        verdict: "caution",
        summary: "Generally fine in small amounts; watch portion size early on.",
        reasons: [
          "High sugar load — keep servings modest in the first trimester.",
          "No ingredients flagged as pregnancy-avoid in clinical food lists.",
        ],
        sources: ["Open Food Facts", "Expecta food rules (demo)"],
      },
      t2: {
        verdict: "caution",
        summary: "Okay as an occasional treat; not a daily staple.",
        reasons: [
          "Calorie-dense spread — moderation still recommended.",
          "No pregnancy-specific avoid ingredients detected.",
        ],
        sources: ["Open Food Facts", "Expecta food rules (demo)"],
      },
      t3: {
        verdict: "caution",
        summary: "Same guidance late pregnancy: occasional is fine.",
        reasons: [
          "No trimester-specific avoid flags on listed ingredients.",
          "Balance with protein and fiber-rich foods when possible.",
        ],
        sources: ["Open Food Facts", "Expecta food rules (demo)"],
      },
      nursing: {
        verdict: "safe",
        summary: "No breastfeeding concerns at typical serving sizes.",
        reasons: [
          "Ingredients are common pantry items with no lactation flags.",
          "Allergen note: contains milk and hazelnuts for the infant diet later.",
        ],
        sources: ["Open Food Facts", "Expecta food rules (demo)"],
      },
    },
  },
  "3700032900014": {
    name: "CeraVe Moisturizing Cream",
    brand: "CeraVe",
    category: "skincare",
    ingredients: [
      { name: "Ceramide NP", risk: "low" },
      { name: "Hyaluronic acid", risk: "low" },
      { name: "Glycerin", risk: "low" },
      { name: "Cholesterol", risk: "low" },
    ],
    byStage: {
      t1: {
        verdict: "safe",
        summary: "Barrier cream with no pregnancy-avoid actives flagged.",
        reasons: [
          "No retinoids, salicylic acid, or hydroquinone in the demo profile.",
          "Ceramides and HA are widely considered compatible in pregnancy.",
        ],
        sources: ["Open Beauty Facts", "Expecta skincare rules (demo)"],
      },
      t2: {
        verdict: "safe",
        summary: "Still a clear pass mid-pregnancy.",
        reasons: [
          "Formulation profile remains free of high-caution actives.",
        ],
        sources: ["Open Beauty Facts", "Expecta skincare rules (demo)"],
      },
      t3: {
        verdict: "safe",
        summary: "Compatible through late pregnancy.",
        reasons: [
          "No third-trimester-specific avoid ingredients detected.",
        ],
        sources: ["Open Beauty Facts", "Expecta skincare rules (demo)"],
      },
      nursing: {
        verdict: "safe",
        summary: "Fine while nursing; keep away from the baby's mouth area.",
        reasons: [
          "Topical moisturizers in this class have no lactation avoid flags.",
        ],
        sources: ["Open Beauty Facts", "Expecta skincare rules (demo)"],
      },
    },
  },
  "0030049001502": {
    name: "Tylenol Extra Strength",
    brand: "Tylenol",
    category: "medicine",
    ingredients: [{ name: "Acetaminophen", risk: "caution" }],
    byStage: {
      t1: {
        verdict: "caution",
        summary: "Often preferred over NSAIDs — still use the lowest effective dose.",
        reasons: [
          "Acetaminophen is commonly discussed as a first-line option, not risk-free.",
          "Confirm dose and duration with your clinician before regular use.",
        ],
        sources: ["openFDA label (demo)", "Expecta medicine rules (demo)"],
      },
      t2: {
        verdict: "caution",
        summary: "Same caution mid-pregnancy: short courses, clinical guidance.",
        reasons: [
          "Evidence supports careful, intermittent use — not unlimited daily dosing.",
        ],
        sources: ["openFDA label (demo)", "Expecta medicine rules (demo)"],
      },
      t3: {
        verdict: "caution",
        summary: "Still caution in late pregnancy; ask before frequent use.",
        reasons: [
          "Label and clinical sources advise clinician-directed use near term.",
        ],
        sources: ["openFDA label (demo)", "Expecta medicine rules (demo)"],
      },
      nursing: {
        verdict: "caution",
        summary: "Usually compatible with nursing at standard doses — verify for you.",
        reasons: [
          "Lactation references often list acetaminophen as compatible with monitoring.",
          "This is not a prescription substitute; check with a pharmacist if unsure.",
        ],
        sources: ["LactMed-style summary (demo)", "Expecta medicine rules (demo)"],
      },
    },
  },
  "071249074556": {
    name: "Retinol Serum",
    brand: "Demo Beauty",
    category: "skincare",
    ingredients: [
      { name: "Retinol", risk: "high" },
      { name: "Glycerin", risk: "low" },
      { name: "Niacinamide", risk: "low" },
    ],
    byStage: {
      t1: {
        verdict: "avoid",
        summary: "Retinoids are a hard avoid in pregnancy.",
        reasons: [
          "Retinol is linked to developmental risk; dermatology guidance is to stop.",
          "Swap to pregnancy-friendlier brightening options (e.g. azelaic acid) after asking your clinician.",
        ],
        sources: ["Expecta skincare rules (demo)", "Clinical consensus summary (demo)"],
      },
      t2: {
        verdict: "avoid",
        summary: "Still avoid mid-pregnancy.",
        reasons: ["Retinoid caution does not relax after the first trimester."],
        sources: ["Expecta skincare rules (demo)"],
      },
      t3: {
        verdict: "avoid",
        summary: "Avoid through delivery.",
        reasons: ["Topical retinoids remain on pregnancy avoid lists late term."],
        sources: ["Expecta skincare rules (demo)"],
      },
      nursing: {
        verdict: "caution",
        summary: "Many clinicians still prefer avoiding retinoids while nursing.",
        reasons: [
          "Transfer risk is debated; conservative guidance is often to pause.",
          "Ask a dermatologist or lactation-informed clinician before restarting.",
        ],
        sources: ["Expecta skincare rules (demo)"],
      },
    },
  },
  "022898914285": {
    name: "Ibuprofen 200mg",
    brand: "Generic",
    category: "medicine",
    ingredients: [{ name: "Ibuprofen", risk: "high" }],
    byStage: {
      t1: {
        verdict: "caution",
        summary: "NSAIDs are generally discouraged; ask before any use.",
        reasons: [
          "Ibuprofen is not the usual first choice in pregnancy.",
          "Acetaminophen is more often discussed as an alternative — still clinician-guided.",
        ],
        sources: ["openFDA label (demo)", "Expecta medicine rules (demo)"],
      },
      t2: {
        verdict: "caution",
        summary: "Avoid self-medicating with NSAIDs mid-pregnancy.",
        reasons: ["Clinical caution around NSAIDs continues through the second trimester."],
        sources: ["openFDA label (demo)"],
      },
      t3: {
        verdict: "avoid",
        summary: "Avoid NSAIDs late pregnancy unless a clinician directs otherwise.",
        reasons: [
          "Third-trimester NSAID use is associated with fetal circulation risks.",
          "Do not take this from the shelf without medical advice.",
        ],
        sources: ["openFDA label (demo)", "Expecta medicine rules (demo)"],
      },
      nursing: {
        verdict: "caution",
        summary: "Sometimes used short-term while nursing — confirm dose and timing.",
        reasons: [
          "Lactation sources often allow intermittent use; infant age and dose matter.",
        ],
        sources: ["LactMed-style summary (demo)"],
      },
    },
  },
};

function unknownProduct(barcode, stage) {
  return {
    barcode,
    name: "Unknown product",
    brand: null,
    category: "unknown",
    stage,
    verdict: "unknown",
    summary:
      "We couldn't match this barcode to enough ingredient data for a pregnancy or nursing verdict.",
    reasons: [
      "No product match in the demo catalog / local cache.",
      "When coverage is thin, Expecta refuses to invent a safe green light.",
      "Try a demo product, or paste an ingredients list once that path is wired.",
    ],
    ingredients: [],
    sources: ["Expecta coverage gap"],
    demo: true,
  };
}

export function mockScan({ barcode, stage }) {
  const code = String(barcode || "").trim();
  const entry = CATALOG[code];

  if (!entry) {
    return unknownProduct(code || "—", stage);
  }

  const stageBlock = entry.byStage[stage] || entry.byStage.t1;

  return {
    barcode: code,
    name: entry.name,
    brand: entry.brand,
    category: entry.category,
    stage,
    verdict: stageBlock.verdict,
    summary: stageBlock.summary,
    reasons: stageBlock.reasons,
    ingredients: entry.ingredients,
    sources: stageBlock.sources,
    demo: true,
  };
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
