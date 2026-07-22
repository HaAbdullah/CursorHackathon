import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

from app.models import IngredientVerdict

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "./safescan.db")

_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
_conn.row_factory = sqlite3.Row
_conn.execute("PRAGMA journal_mode=WAL")


def init_db() -> None:
    schema_path = Path(__file__).parent / "schema.sql"
    _conn.executescript(schema_path.read_text())
    _conn.commit()


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get_scan(scan_id: str) -> Optional[dict]:
    row = _conn.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone()
    return dict(row) if row else None


def update_scan(scan_id: str, **cols) -> None:
    cols["updated_at"] = now()
    keys = ", ".join(f"{k} = ?" for k in cols)
    values = list(cols.values()) + [scan_id]
    _conn.execute(f"UPDATE scans SET {keys} WHERE id = ?", values)
    _conn.commit()


def insert_ingredient(v: IngredientVerdict, source: str) -> None:
    _conn.execute(
        """INSERT OR IGNORE INTO ingredients
           (name, aliases, risk_level, why, max_amount, condition_flags, source, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            v.name,
            json.dumps(v.aliases),
            v.risk_level.value,
            v.why,
            v.max_amount,
            json.dumps(v.condition_flags),
            source,
            now(),
        ),
    )
    _conn.commit()


def get_product_by_cache_key(cache_key: str) -> Optional[dict]:
    row = _conn.execute(
        "SELECT * FROM products WHERE cache_key = ?", (cache_key,)
    ).fetchone()
    return dict(row) if row else None


def upsert_product(
    cache_key: str,
    name: Optional[str],
    barcode: Optional[str],
    ingredients: list[str],
) -> None:
    existing = get_product_by_cache_key(cache_key)
    ingredients_json = json.dumps(ingredients)
    if existing:
        _conn.execute(
            """UPDATE products SET name = ?, barcode = ?, ingredients_json = ?
               WHERE cache_key = ?""",
            (name, barcode, ingredients_json, cache_key),
        )
    else:
        _conn.execute(
            """INSERT INTO products (cache_key, name, barcode, ingredients_json, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (cache_key, name, barcode, ingredients_json, now()),
        )
    _conn.commit()


def get_all_ingredients() -> list[dict]:
    rows = _conn.execute("SELECT * FROM ingredients").fetchall()
    return [dict(r) for r in rows]


def insert_scan(
    scan_id: str,
    status: str,
    input_type: str,
    product_name: Optional[str],
    ingredients_json: str,
    profile_json: str,
    report_json: Optional[str] = None,
    error: Optional[str] = None,
) -> None:
    ts = now()
    _conn.execute(
        """INSERT INTO scans
           (id, status, input_type, product_name, ingredients_json, profile_json,
            report_json, error, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            scan_id,
            status,
            input_type,
            product_name,
            ingredients_json,
            profile_json,
            report_json,
            error,
            ts,
            ts,
        ),
    )
    _conn.commit()
