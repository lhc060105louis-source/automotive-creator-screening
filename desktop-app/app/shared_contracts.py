"""Adapters between the KOL application and the repository-wide contracts."""

import json
import sys
from pathlib import Path

from app.models import Kol


def _add_repository_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "overseas_shared" / "__init__.py").is_file():
            root = str(parent)
            if root not in sys.path:
                sys.path.insert(0, root)
            return parent
    raise RuntimeError("Repository root containing overseas_shared was not found")


REPOSITORY_ROOT = _add_repository_root()

from overseas_shared import (  # noqa: E402
    Country,
    KOLRiskAlert,
    MaterialStatus,
    Priority,
    RegulationChange,
    RegType,
)


_INTERNAL_COUNTRY_ALIASES = {"GB": Country.UK, "UK": Country.UK}
_KNOWN_BRANDS = ("BYD", "XPENG", "NIO", "MG")
_REGULATION_HINTS = (
    ("虚假宣传", "虚假宣传/广告合规"),
    ("广告披露", "广告披露合规"),
    ("GDPR", "GDPR/数据隐私"),
    ("未成年", "未成年人广告合规"),
    ("环保", "环保声明合规"),
    ("技术", "技术声明合规"),
    ("竞品", "竞品排他合规"),
)


def to_shared_country(value: str) -> Country:
    """Convert an internal market string to the shared Country enum."""
    normalized = str(value).strip().upper()
    if normalized in _INTERNAL_COUNTRY_ALIASES:
        return _INTERNAL_COUNTRY_ALIASES[normalized]
    try:
        return Country(normalized)
    except ValueError as exc:
        raise ValueError(f"Unsupported shared country: {value}") from exc


def _kol_search_text(kol: Kol) -> str:
    assessment = kol.assessment_input
    values = [
        kol.name,
        kol.handle,
        kol.content_categories,
        assessment.commercial_inputs if assessment else {},
        assessment.risk_inputs if assessment else {},
    ]
    return json.dumps(values, ensure_ascii=False, default=str).upper()


def _brand_for(kol: Kol) -> str:
    text = _kol_search_text(kol)
    return next((brand for brand in _KNOWN_BRANDS if brand in text), "")


def _regulation_hint(flags: list[str]) -> str:
    joined = "\n".join(flags)
    return next((hint for token, hint in _REGULATION_HINTS if token in joined), "")


def build_kol_risk_alert(kol: Kol) -> KOLRiskAlert | None:
    """Build an outbound alert only for evidence-ready, high-risk assessments."""
    summary = kol.score_summary
    if (
        summary is None
        or summary.risk_status != "ready"
        or summary.risk_level != "high"
        or summary.risk_score is None
        or summary.risk_score < 61
    ):
        return None
    flags = kol.flags
    topic = flags[0] if flags else ""
    return KOLRiskAlert(
        brand=_brand_for(kol),
        country=to_shared_country(kol.country).value,
        creator_name=kol.name or kol.handle or "",
        platform=kol.platform,
        severity="high",
        topic=topic,
        regulation_hint=_regulation_hint(flags),
        detected_at="",
    )


def regulation_affects_kol(change: RegulationChange, kol: Kol) -> bool:
    """Return whether a shared regulation change requires this KOL's copy review."""
    kol_country = to_shared_country(kol.country)
    countries = {to_shared_country(value) for value in change.country}
    if countries and Country.EU not in countries and kol_country not in countries:
        return False

    text = _kol_search_text(kol)
    if change.affected_brands and not any(
        brand.strip().upper() in text for brand in change.affected_brands if brand.strip()
    ):
        return False
    if change.affected_scenarios and not any(
        scenario.strip().upper() in text
        for scenario in change.affected_scenarios
        if scenario.strip()
    ):
        return False
    return True


__all__ = [
    "Country",
    "KOLRiskAlert",
    "MaterialStatus",
    "Priority",
    "RegType",
    "RegulationChange",
    "build_kol_risk_alert",
    "regulation_affects_kol",
    "to_shared_country",
]
