from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional


class RiskLevel(str, Enum):
    avoid = "avoid"
    caution = "caution"
    safe = "safe"


class IngredientStatus(str, Enum):
    avoid = "avoid"
    caution = "caution"
    safe = "safe"
    pending = "pending"


class ScanStatus(str, Enum):
    processing = "processing"
    partial = "partial"
    complete = "complete"
    failed = "failed"


class Condition(str, Enum):
    gestational_diabetes = "gestational_diabetes"
    hypertension = "hypertension"
    anemia = "anemia"
    thyroid = "thyroid"


class Profile(BaseModel):
    trimester: int = Field(ge=1, le=3, default=2)
    conditions: list[Condition] = []
    allergies: list[str] = []


class ExtractionResult(BaseModel):
    found_ingredients: bool
    product_name: Optional[str] = None
    ingredients: list[str] = []


class IngredientVerdict(BaseModel):
    name: str
    aliases: list[str] = []
    risk_level: RiskLevel
    why: str
    max_amount: Optional[str] = None
    condition_flags: dict[str, str] = {}


class MatchResult(BaseModel):
    raw: str
    canonical: str
    amount: Optional[str] = None
    verdict: Optional[IngredientVerdict] = None


class ReportIngredient(BaseModel):
    name: str
    raw: str
    status: IngredientStatus
    why: Optional[str] = None
    max_amount: Optional[str] = None
    personal_note: Optional[str] = None
    source: str


class Report(BaseModel):
    product_name: Optional[str]
    verdict: str
    summary: Optional[str] = None
    pending_count: int = 0
    ingredients: list[ReportIngredient] = []


class ScanResponse(BaseModel):
    scan_id: str
    status: ScanStatus
    report: Optional[Report] = None
    error: Optional[str] = None
