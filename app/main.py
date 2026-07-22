import hashlib
import json
import os
import uuid
from typing import Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app import db
from app import extract, off, research
from app.matching import match_ingredients
from app.models import Profile, ScanResponse, ScanStatus
from app.report import build_report

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


@app.on_event("startup")
def startup():
    db.init_db()


@app.get("/health")
def health():
    fake_llm = os.getenv("FAKE_LLM", "0") == "1"
    return {"ok": True, "fake_llm": fake_llm}


def _cache_key(barcode: Optional[str], product_name: Optional[str]) -> str:
    if barcode:
        return barcode
    name = (product_name or "").lower()
    return hashlib.sha256(name.encode()).hexdigest()


def _scan_response(row: dict) -> ScanResponse:
    report = None
    if row.get("report_json"):
        from app.models import Report

        report = Report.model_validate_json(row["report_json"])
    return ScanResponse(
        scan_id=row["id"],
        status=ScanStatus(row["status"]),
        report=report,
        error=row.get("error"),
    )


@app.post("/scan", response_model=ScanResponse)
async def create_scan(
    background_tasks: BackgroundTasks,
    profile: str = Form(...),
    barcode: Optional[str] = Form(None),
    photos: Optional[list[UploadFile]] = File(default=None),
):
    if photos is None:
        photos = []

    if not barcode and not photos:
        raise HTTPException(status_code=400, detail="provide photos or barcode")

    try:
        profile_obj = Profile.model_validate_json(profile)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid profile")

    if photos and len(photos) > 5:
        raise HTTPException(status_code=400, detail="maximum 5 photos allowed")

    for photo in photos:
        if photo.content_type and photo.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="invalid photo format")

    input_type = "barcode" if barcode else "photos"
    extraction = None
    cache_hit = False
    ingredients: list[str] = []
    product_name: Optional[str] = None

    if barcode:
        cached = db.get_product_by_cache_key(barcode)
        if cached:
            cache_hit = True
            product_name = cached.get("name")
            ingredients = json.loads(cached["ingredients_json"])

    if not cache_hit:
        if barcode:
            extraction = await off.lookup_barcode(barcode)
        elif photos:
            images = [await p.read() for p in photos]
            extraction = await extract.extract_from_photos(images)

        if extraction:
            product_name = extraction.product_name
            if extraction.found_ingredients:
                ingredients = extraction.ingredients
            elif product_name:
                search_result = await extract.extract_via_search(product_name)
                if search_result.found_ingredients:
                    product_name = search_result.product_name or product_name
                    ingredients = search_result.ingredients

    if not ingredients:
        scan_id = uuid.uuid4().hex
        db.insert_scan(
            scan_id=scan_id,
            status=ScanStatus.failed.value,
            input_type=input_type,
            product_name=product_name,
            ingredients_json="[]",
            profile_json=profile_obj.model_dump_json(),
            error="could not read ingredients",
        )
        row = db.get_scan(scan_id)
        return _scan_response(row)

    if not cache_hit:
        key = _cache_key(barcode, product_name)
        db.upsert_product(key, product_name, barcode, ingredients)

    matches = match_ingredients(ingredients)
    report = build_report(product_name, matches, profile_obj)

    has_unknowns = report.pending_count > 0
    status = ScanStatus.partial if has_unknowns else ScanStatus.complete

    scan_id = uuid.uuid4().hex
    db.insert_scan(
        scan_id=scan_id,
        status=status.value,
        input_type=input_type,
        product_name=product_name,
        ingredients_json=json.dumps(ingredients),
        profile_json=profile_obj.model_dump_json(),
        report_json=report.model_dump_json(),
    )

    if has_unknowns:
        background_tasks.add_task(research.run_research, scan_id)

    row = db.get_scan(scan_id)
    return _scan_response(row)


@app.get("/scan/{scan_id}", response_model=ScanResponse)
def get_scan(scan_id: str):
    row = db.get_scan(scan_id)
    if not row:
        raise HTTPException(status_code=404, detail="scan not found")
    return _scan_response(row)
