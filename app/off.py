import re

import httpx

from app.models import ExtractionResult

OFF_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
TIMEOUT = 5.0


async def lookup_barcode(barcode: str) -> ExtractionResult:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(OFF_URL.format(barcode=barcode))
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return ExtractionResult(found_ingredients=False, product_name=None)

    if data.get("status") != 1:
        return ExtractionResult(found_ingredients=False, product_name=None)

    product = data.get("product", {})
    product_name = product.get("product_name")
    ingredients_text = product.get("ingredients_text") or ""

    if not ingredients_text.strip():
        return ExtractionResult(
            found_ingredients=False,
            product_name=product_name,
        )

    parts = re.split(r"[,;]", ingredients_text)
    ingredients = [p.strip() for p in parts if p.strip()]

    if not ingredients:
        return ExtractionResult(
            found_ingredients=False,
            product_name=product_name,
        )

    return ExtractionResult(
        found_ingredients=True,
        product_name=product_name,
        ingredients=ingredients,
    )
