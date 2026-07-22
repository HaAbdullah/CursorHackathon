# PLACEHOLDER — Abdullah's agent overwrites this file. Do not edit.
from app.models import ExtractionResult


async def extract_from_photos(images: list[bytes]) -> ExtractionResult:
    return ExtractionResult(
        found_ingredients=True,
        product_name="VoltFuel berry drink",
        ingredients=[
            "Carbonated water",
            "Sugar (27g)",
            "Caffeine (200mg)",
            "Taurine",
            "Ginseng extract",
            "Niacin",
            "Sucralose",
        ],
    )


async def extract_via_search(product_name: str) -> ExtractionResult:
    return ExtractionResult(
        found_ingredients=True,
        product_name="VoltFuel berry drink",
        ingredients=[
            "Carbonated water",
            "Sugar (27g)",
            "Caffeine (200mg)",
            "Taurine",
            "Ginseng extract",
            "Niacin",
            "Sucralose",
        ],
    )
