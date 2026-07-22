# PLACEHOLDER — Abdullah's agent overwrites this file. Do not edit.
import asyncio
import json

from app import db
from app.matching import match_ingredients
from app.models import (
    IngredientStatus,
    IngredientVerdict,
    Profile,
    RiskLevel,
    ScanStatus,
)
from app.report import build_report

SUMMARY = (
    "Skip this one — the caffeine alone is your full daily limit, "
    "and the sugar load matters for you."
)


async def run_research(scan_id: str) -> None:
    await asyncio.sleep(4)

    row = db.get_scan(scan_id)
    if not row:
        return

    profile = Profile(**json.loads(row["profile_json"]))
    raw_list = json.loads(row["ingredients_json"])
    product_name = row.get("product_name")

    initial_matches = match_ingredients(raw_list)
    unknown_canonicals = {m.canonical for m in initial_matches if m.verdict is None}

    for match in initial_matches:
        if match.verdict is None:
            verdict = IngredientVerdict(
                name=match.canonical,
                risk_level=RiskLevel.caution,
                why="Limited safety data during pregnancy.",
                condition_flags={},
            )
            db.insert_ingredient(verdict, source="agent")

    matches = match_ingredients(raw_list)
    report = build_report(product_name, matches, profile)

    updated = []
    for ing in report.ingredients:
        if ing.name in unknown_canonicals:
            updated.append(
                ing.model_copy(
                    update={
                        "status": IngredientStatus.caution,
                        "why": "Limited safety data during pregnancy.",
                        "source": "agent",
                    }
                )
            )
        else:
            updated.append(ing)

    report = report.model_copy(
        update={
            "ingredients": updated,
            "pending_count": 0,
            "summary": SUMMARY,
            "verdict": _compute_verdict(updated),
        }
    )

    db.update_scan(
        scan_id,
        status=ScanStatus.complete.value,
        report_json=report.model_dump_json(),
    )


def _compute_verdict(ingredients) -> str:
    order = {"avoid": 3, "caution": 2, "safe": 1}
    worst = "safe"
    worst_order = 0
    for ing in ingredients:
        if ing.status == IngredientStatus.pending:
            continue
        o = order.get(ing.status.value, 0)
        if o > worst_order:
            worst_order = o
            worst = ing.status.value
    return worst
