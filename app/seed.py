import csv
import json
import sys
from pathlib import Path

from app import db
from app.models import IngredientVerdict, RiskLevel


def main():
    db.init_db()
    csv_path = Path(__file__).parent.parent / "data" / "seed_ingredients.csv"
    if not csv_path.exists():
        print(f"Warning: seed file not found at {csv_path}")
        sys.exit(0)

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            verdict = IngredientVerdict(
                name=row["name"],
                aliases=json.loads(row["aliases"]),
                risk_level=RiskLevel(row["risk_level"]),
                why=row["why"],
                max_amount=row["max_amount"] or None,
                condition_flags=json.loads(row["condition_flags"]),
            )
            db.insert_ingredient(verdict, source="seed")

    print("Seed complete.")


if __name__ == "__main__":
    main()
