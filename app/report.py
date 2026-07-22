from app.models import (
    IngredientStatus,
    MatchResult,
    Profile,
    Report,
    ReportIngredient,
)


STATUS_ORDER = {
    IngredientStatus.avoid: 3,
    IngredientStatus.caution: 2,
    IngredientStatus.safe: 1,
    IngredientStatus.pending: 0,
}


def _personal_note(verdict, profile: Profile) -> str | None:
    notes = []
    for condition in profile.conditions:
        key = condition.value
        if key in verdict.condition_flags:
            notes.append(verdict.condition_flags[key])
    trimester_key = f"trimester_{profile.trimester}"
    if trimester_key in verdict.condition_flags:
        notes.append(verdict.condition_flags[trimester_key])
    return "; ".join(notes) if notes else None


def build_report(
    product_name: str | None,
    matches: list[MatchResult],
    profile: Profile,
) -> Report:
    ingredients: list[ReportIngredient] = []
    pending_count = 0
    worst_status = None
    worst_order = -1

    for match in matches:
        if match.verdict is None:
            pending_count += 1
            ingredients.append(
                ReportIngredient(
                    name=match.canonical,
                    raw=match.raw,
                    status=IngredientStatus.pending,
                    why=None,
                    max_amount=None,
                    personal_note=None,
                    source="pending",
                )
            )
        else:
            status = IngredientStatus(match.verdict.risk_level.value)
            order = STATUS_ORDER[status]
            if order > worst_order:
                worst_order = order
                worst_status = status
            ingredients.append(
                ReportIngredient(
                    name=match.verdict.name,
                    raw=match.raw,
                    status=status,
                    why=match.verdict.why,
                    max_amount=match.verdict.max_amount,
                    personal_note=_personal_note(match.verdict, profile),
                    source="database",
                )
            )

    if pending_count == len(matches) and pending_count > 0:
        verdict = "pending"
    elif worst_status is None:
        verdict = "safe"
    else:
        verdict = worst_status.value

    return Report(
        product_name=product_name,
        verdict=verdict,
        summary=None,
        pending_count=pending_count,
        ingredients=ingredients,
    )
