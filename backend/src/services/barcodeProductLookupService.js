const OFF_URL = "https://world.openfoodfacts.org/api/v2/product";

export class ProductLookupError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "ProductLookupError";
    this.cause = cause;
  }
}

/** Looks up a product by barcode (UPC/EAN) via Open Food Facts. */
export async function lookupProductByBarcode(barcode) {
  let response;
  try {
    response = await fetch(`${OFF_URL}/${encodeURIComponent(barcode)}.json`);
  } catch (err) {
    throw new ProductLookupError("Could not reach the product database", err);
  }

  if (response.status === 404) {
    return { found: false, productName: null, ingredients: [] };
  }
  if (!response.ok) {
    throw new ProductLookupError(`Product lookup failed (${response.status})`);
  }

  const data = await response.json();
  if (data.status !== 1 || !data.product) {
    return { found: false, productName: null, ingredients: [] };
  }

  const p = data.product;
  // Open Food Facts' ingredient tree can collapse a compound seasoning to a
  // single parent node. Prefer the complete transcribed label text so safety
  // checks still see subingredients such as sugar or caffeine.
  const labelText = p.ingredients_text_en || p.ingredients_text || "";
  const ingredients = splitIngredientsText(labelText).length > 0
    ? splitIngredientsText(labelText)
    : flattenIngredientTree(p.ingredients || []);

  return {
    found: true,
    productName: p.product_name || p.generic_name || null,
    ingredients,
  };
}

function flattenIngredientTree(nodes) {
  const ingredients = [];
  for (const node of nodes) {
    if (node?.text) ingredients.push(node.text);
    if (Array.isArray(node?.ingredients)) ingredients.push(...flattenIngredientTree(node.ingredients));
  }
  return ingredients.filter(Boolean);
}

function splitIngredientsText(text) {
  if (!text) return [];
  return text
    .split(/[,;]|\(|\)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}
