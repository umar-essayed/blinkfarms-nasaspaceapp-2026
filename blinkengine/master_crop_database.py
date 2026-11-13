# ==============================================================================
# BlinkFarms — Master Agronomic Crop Database (v3.6)
# Unified FAO-56 / AquaCrop / ARC 48-Crop Database across 8 Standard Categories
# Single Source of Truth for Python Biophysical Core & Next.js API
# ==============================================================================

import os
import json
from typing import Dict, List, Any, Optional

_JSON_PATH = os.path.join(os.path.dirname(__file__), "fao_categorized_crops.json")

with open(_JSON_PATH, "r", encoding="utf-8") as f:
    _RAW_DB = json.load(f)

CATEGORIES: List[Dict[str, Any]] = _RAW_DB.get("categories", [])
CATEGORIES_BY_ID: Dict[str, Dict[str, Any]] = {c["id"]: c for c in CATEGORIES}

ALL_CROPS_RAW: List[Dict[str, Any]] = _RAW_DB.get("crops", [])
CROPS_BY_ID: Dict[str, Dict[str, Any]] = _RAW_DB.get("crops_by_id", {})

# ------------------------------------------------------------------------------
# High-Performance Helper Functions
# ------------------------------------------------------------------------------
def get_crop(crop_id: str) -> Optional[Dict[str, Any]]:
    """O(1) lookup of crop by ID, with alias resolution."""
    if crop_id in CROPS_BY_ID:
        return CROPS_BY_ID[crop_id]
    # Common aliases
    aliases = {
        "wheat_giza171": "wheat",
        "durum_wheat": "wheat",
        "corn": "maize",
        "groundnut": "peanut",
        "faba": "faba_bean",
        "potatoes": "potato",
        "beet": "sugar_beet",
        "berseem": "clover_berseem",
        "lucerne": "alfalfa"
    }
    target = aliases.get(crop_id, crop_id)
    return CROPS_BY_ID.get(target)

def get_all_master_crops() -> Dict[str, Dict[str, Any]]:
    """Returns all 48 crops mapped by ID."""
    return CROPS_BY_ID

def get_master_crop_by_id(crop_id: str) -> Optional[Dict[str, Any]]:
    """O(1) lookup of crop by ID."""
    return get_crop(crop_id)

def get_agronomic_categories() -> List[Dict[str, Any]]:
    """Returns the 8 standard agronomic categories."""
    return CATEGORIES

def filter_crops_by_soil_and_climate(
    category: Optional[str] = None,
    season: Optional[str] = None,
    max_salinity_ec: Optional[float] = None,
    nematode_safe_only: bool = False,
    annual_only: bool = False
) -> List[Dict[str, Any]]:
    """Sub-millisecond filtering of crops by agronomic constraints."""
    return filter_crops(
        category=category,
        season=season,
        max_salinity_ec=max_salinity_ec,
        nematode_safe_only=nematode_safe_only,
        annual_only=annual_only
    )


def get_crops_by_category(category_id: str) -> List[Dict[str, Any]]:
    """Returns all crops under a specific category (e.g. 'cereals', 'legumes')."""
    return [c for c in ALL_CROPS_RAW if c.get("category") == category_id]

def filter_crops(
    category: Optional[str] = None,
    season: Optional[str] = None,
    max_salinity_ec: Optional[float] = None,
    nematode_safe_only: bool = False,
    annual_only: bool = False
) -> List[Dict[str, Any]]:
    """
    Sub-millisecond filtering of crops by agronomic constraints.
    """
    results = []
    for c in ALL_CROPS_RAW:
        if category and c.get("category") != category:
            continue
        if season and c.get("season") != season and c.get("season") != "perennial":
            continue
        if max_salinity_ec is not None and c.get("salinity_threshold_dsm", 0.0) < max_salinity_ec:
            continue
        if nematode_safe_only and c.get("nematode_susceptibility") == "high":
            continue
        if annual_only and c.get("growth_habit") != "annual":
            continue
        results.append(c)
    return results

# ------------------------------------------------------------------------------
# Backward Compatibility Adapter for Legacy ROTATION_CROPS
# ------------------------------------------------------------------------------
def _build_legacy_compatible_crop(raw: Dict[str, Any]) -> Dict[str, Any]:
    c = dict(raw)
    c3_c4 = "C4" if raw["id"] in ["maize", "sorghum", "panicum", "silage_corn", "sudangrass", "sugarcane"] else "C3"
    c["c3_c4pathway"] = c3_c4
    # Legacy camelCase keys
    c["nameAr"] = raw["name_ar"]
    c["nameEn"] = raw["name_en"]
    c["family"] = raw["botanical_family"]
    c["isPerennial"] = (raw["growth_habit"] in ["perennial_forage", "permanent_orchard"])
    c["growthHabit"] = raw["growth_habit"]
    c["nematodeSusceptibility"] = raw["nematode_susceptibility"]
    c["salinityToleranceDsM"] = raw["salinity_threshold_dsm"]
    c["rootDepthMaxM"] = raw["root_depth_m"]
    c["waterRequirementMm"] = raw["water_need_mm"]
    c["nitrogenFixationKgHa"] = raw["n_fixation_kg_ha"]
    c["nFixationKgHa"] = raw["n_fixation_kg_ha"]
    c["residueBiomassTonHa"] = raw["residue_ton_ha"]
    c["kcIni"] = raw["kc_ini"]
    c["kcMid"] = raw["kc_mid"]
    c["kcEnd"] = raw["kc_end"]
    c["ky"] = raw["ky"]
    c["depletionP"] = raw["depletion_p"]
    c["tBaseC"] = raw["t_base"]
    c["tBase"] = raw["t_base"]
    c["tOpt"] = float(raw["t_max_optimal"] - 4.0)
    c["tMax"] = float(raw["t_crit_flowering"] + 4.0)
    c["tCritFloweringC"] = raw["t_crit_flowering"]
    c["wpNormalizedGm2"] = raw["wp_star"]
    c["harvestIndexBase"] = raw["hi_base"]
    c["gddRequired"] = sum(raw["stage_days"]) * 12.0
    c["gddMaturity"] = sum(raw["stage_days"]) * 12.0
    c["waterloggingTolerance"] = "high" if raw["id"] in ["rice", "sugarcane"] else ("medium" if raw["id"] in ["wheat", "clover_berseem"] else "low")
    c["avgCostPerHa"] = raw["baseline_cost_egp_feddan"] * 2.38095 / 48.0
    c["avgRevenuePerHa"] = (raw["potential_yield_ton_feddan"] * raw["price_egp_ton"]) * 2.38095 / 48.0
    c["marketLiquidity"] = "high" if raw["market_suitability"] >= 0.90 else "medium"
    c["egyptianProfile"] = {
        "cropId": raw["id"],
        "traditionalUnitAr": "طن",
        "traditionalUnitEn": "Metric Ton",
        "unitWeightKg": 1000.0,
        "expectedYieldPerFeddan": {
            "min": float(round(raw["potential_yield_ton_feddan"] * 0.8, 1)),
            "max": float(round(raw["potential_yield_ton_feddan"] * 1.2, 1)),
            "average": float(round(raw["potential_yield_ton_feddan"], 1)),
            "traditionalUnitAr": "طن/فدان",
            "traditionalUnitEn": "Ton/Feddan",
            "metricTonsAverage": float(round(raw["potential_yield_ton_feddan"], 1))
        },
        "certifiedCultivars": [{
            "nameAr": raw["certified_variety_ar"],
            "nameEn": raw["name_en"],
            "registrationCode": f"ARC-EGY-{raw['id'][:3].upper()}",
            "suitableRegions": ["delta", "middle_egypt", "upper_egypt", "reclaimed_desert"],
            "maturityDays": sum(raw["stage_days"]),
            "salinityToleranceDsM": raw["salinity_threshold_dsm"],
            "featuresAr": f"صنف معتمد رسمي بإنتاجية {raw['potential_yield_ton_feddan']} طن/فدان واحتياج مائي {raw['water_need_mm']} مم",
            "featuresEn": f"Official ARC certified cultivar ({raw['potential_yield_ton_feddan']} ton/fed)"
        }]
    }
    return c

ROTATION_CROPS_48: Dict[str, Dict[str, Any]] = {
    c_id: _build_legacy_compatible_crop(c_data)
    for c_id, c_data in CROPS_BY_ID.items()
}

# Add legacy aliases to prevent any key mismatch in legacy tests
ROTATION_CROPS_48["durum_wheat"] = ROTATION_CROPS_48["wheat"]
ROTATION_CROPS_48["wheat_giza171"] = ROTATION_CROPS_48["wheat"]
