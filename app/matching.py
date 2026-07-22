import json
import re
from typing import Optional

from app import db
from app.models import IngredientVerdict, MatchResult, RiskLevel

AMOUNT_RE = re.compile(
    r"\(?\s*(\d+(?:\.\d+)?)\s*(mg|g|mcg|µg|ml|%)\s*\)?",
    re.IGNORECASE,
)
PREFIX_RE = re.compile(r"^(contains|ingredients:)\s*", re.IGNORECASE)


def normalize(raw: str) -> tuple[str, Optional[str]]:
    text = raw.lower().strip()
    amount = None

    match = AMOUNT_RE.search(text)
    if match:
        amount = f"{match.group(1)} {match.group(2).lower()}"
        text = AMOUNT_RE.sub("", text).strip()

    text = PREFIX_RE.sub("", text)
    text = text.strip(" .,;:-")

    return text, amount


def match_ingredients(raw_list: list[str]) -> list[MatchResult]:
    rows = db.get_all_ingredients()
    verdicts: list[IngredientVerdict] = []
    for row in rows:
        verdicts.append(
            IngredientVerdict(
                name=row["name"],
                aliases=json.loads(row["aliases"]),
                risk_level=RiskLevel(row["risk_level"]),
                why=row["why"],
                max_amount=row["max_amount"],
                condition_flags=json.loads(row["condition_flags"]),
            )
        )

    results: list[MatchResult] = []
    for raw in raw_list:
        canonical, amount = normalize(raw)
        verdict = None
        for v in verdicts:
            if canonical == v.name or canonical in v.aliases:
                verdict = v
                break
        results.append(
            MatchResult(raw=raw, canonical=canonical, amount=amount, verdict=verdict)
        )

    return results
