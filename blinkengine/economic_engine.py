# ==============================================================================
# BlinkFarms — Economic Feasibility & Market Suitability Engine (S_econ v3.0)
# Mathematically Rigorous Formulation: Sign-Aware Risk Adjustment & Zero Double-Counting
# NASA Space Apps Challenge 2026: Field Shift
# ==============================================================================

from typing import Dict, Any, List, Optional
import numpy as np

# ------------------------------------------------------------------------------
# 1. Official Crop Economic Profiles (Egyptian Ministry of Ag & FAOSTAT Baseline)
# ------------------------------------------------------------------------------
CROP_ECONOMIC_PROFILES: Dict[str, Dict[str, Any]] = {
    "wheat": {
        "id": "wheat",
        "nameAr": "القمح (خبز وديورم)",
        "nameEn": "Wheat (Bread & Durum)",
        "producerPricePerTonEgp": 13333.0,     # ~2000 EGP per Ardab (150kg) = 13,333 EGP/ton
        "producerPricePerTonUsd": 277.8,
        "standardYieldYmTonPerFeddan": 3.75,   # ~25 Ardab/feddan max standard yield
        "standardYieldYmTonPerHa": 8.93,
        "baselineInputCostPerFeddanEgp": 14500.0,  # Fixed baseline cost (seeds, land prep, plowing, base labor)
        "marketSuitabilityIndex": 1.00,        # Strategic national grain reserve (Zero marketing risk)
        "importSubstitutionScore": 1.00,       # Egypt imports >10M tons/yr; 100% absorption guaranteed
        "strategicClassification": "strategic_staple"
    },
    "durum_wheat": {
        "id": "durum_wheat",
        "nameAr": "قمح الديورم (المكرونة)",
        "nameEn": "Durum Wheat",
        "producerPricePerTonEgp": 14000.0,     # Premium over bread wheat for pasta quality
        "producerPricePerTonUsd": 291.7,
        "standardYieldYmTonPerFeddan": 3.75,
        "standardYieldYmTonPerHa": 8.93,
        "baselineInputCostPerFeddanEgp": 14800.0,
        "marketSuitabilityIndex": 1.00,
        "importSubstitutionScore": 0.98,
        "strategicClassification": "strategic_staple"
    },
    "maize": {
        "id": "maize",
        "nameAr": "الذرة الصفراء (حبوب)",
        "nameEn": "Yellow Grain Maize",
        "producerPricePerTonEgp": 13570.0,     # ~1900 EGP per Ardab (140kg) = ~13,570 EGP/ton
        "producerPricePerTonUsd": 282.7,
        "standardYieldYmTonPerFeddan": 4.20,   # ~30 Ardab/feddan
        "standardYieldYmTonPerHa": 10.00,
        "baselineInputCostPerFeddanEgp": 18500.0,  # Heavy synthetic N requirement (4-5 bags urea)
        "marketSuitabilityIndex": 0.98,        # Vast domestic poultry & cattle feed market
        "importSubstitutionScore": 0.95,
        "strategicClassification": "feed_grain"
    },
    "sugar_beet": {
        "id": "sugar_beet",
        "nameAr": "بنجر السكر",
        "nameEn": "Sugar Beet",
        "producerPricePerTonEgp": 2400.0,      # Contract factory price with sugar quality bonuses
        "producerPricePerTonUsd": 50.0,
        "standardYieldYmTonPerFeddan": 36.0,   # 32-40 tons raw beet per feddan
        "standardYieldYmTonPerHa": 85.7,
        "baselineInputCostPerFeddanEgp": 17000.0,
        "marketSuitabilityIndex": 0.96,        # Contract farming with sugar processing factories
        "importSubstitutionScore": 0.92,
        "strategicClassification": "industrial_cash"
    },
    "soybean": {
        "id": "soybean",
        "nameAr": "فول الصويا الصيفي",
        "nameEn": "Summer Soybean",
        "producerPricePerTonEgp": 28000.0,     # High-value protein/oil seed
        "producerPricePerTonUsd": 583.3,
        "standardYieldYmTonPerFeddan": 1.80,   # 1.5 - 2.0 ton/feddan
        "standardYieldYmTonPerHa": 4.28,
        "baselineInputCostPerFeddanEgp": 12500.0,  # Inoculated seed saves synthetic N
        "marketSuitabilityIndex": 0.95,        # Crucial poultry protein meal deficit in Egypt
        "importSubstitutionScore": 0.98,
        "strategicClassification": "legume_oilseed"
    },
    "clover_berseem": {
        "id": "clover_berseem",
        "nameAr": "البرسيم البلدي المسقاوي",
        "nameEn": "Egyptian Berseem Clover",
        "producerPricePerTonEgp": 1800.0,      # Green fodder per cut (4 seasonal cuts total ~32 tons)
        "producerPricePerTonUsd": 37.5,
        "standardYieldYmTonPerFeddan": 35.0,   # 30-38 tons total green mass
        "standardYieldYmTonPerHa": 83.3,
        "baselineInputCostPerFeddanEgp": 9500.0,   # Low N demand, profuse biological tillering
        "marketSuitabilityIndex": 0.94,        # Immediate local livestock market and dairy farms
        "importSubstitutionScore": 0.88,
        "strategicClassification": "forage_legume"
    },
    "sorghum": {
        "id": "sorghum",
        "nameAr": "الذرة الرفيعة",
        "nameEn": "Grain Sorghum",
        "producerPricePerTonEgp": 11000.0,
        "producerPricePerTonUsd": 229.2,
        "standardYieldYmTonPerFeddan": 3.00,   # ~22 Ardab/feddan
        "standardYieldYmTonPerHa": 7.14,
        "baselineInputCostPerFeddanEgp": 10500.0,  # Low water and lower nitrogen requirements
        "marketSuitabilityIndex": 0.88,        # Upper Egypt bread flour blend & feed
        "importSubstitutionScore": 0.82,
        "strategicClassification": "drought_hardy_cereal"
    },
    "barley": {
        "id": "barley",
        "nameAr": "الشعير الشتوي",
        "nameEn": "Winter Barley",
        "producerPricePerTonEgp": 10500.0,
        "producerPricePerTonUsd": 218.8,
        "standardYieldYmTonPerFeddan": 2.70,   # ~18 Ardab/feddan
        "standardYieldYmTonPerHa": 6.43,
        "baselineInputCostPerFeddanEgp": 8500.0,
        "marketSuitabilityIndex": 0.89,        # Feed, malting, saline reclamation staple
        "importSubstitutionScore": 0.80,
        "strategicClassification": "saline_tolerant_cereal"
    },
    "sunflower": {
        "id": "sunflower",
        "nameAr": "عباد الشمس الزيتي",
        "nameEn": "Oilseed Sunflower",
        "producerPricePerTonEgp": 26000.0,     # Premium contract price per ton
        "producerPricePerTonUsd": 541.7,
        "standardYieldYmTonPerFeddan": 1.45,
        "standardYieldYmTonPerHa": 3.45,
        "baselineInputCostPerFeddanEgp": 10000.0,
        "marketSuitabilityIndex": 0.92,        # Domestic edible oil extraction shortage
        "importSubstitutionScore": 0.96,
        "strategicClassification": "oilseed"
    },
    "faba_bean": {
        "id": "faba_bean",
        "nameAr": "الفول البلدي الشتوي",
        "nameEn": "Broad / Faba Bean",
        "producerPricePerTonEgp": 32000.0,     # High-value household dietary staple
        "producerPricePerTonUsd": 666.7,
        "standardYieldYmTonPerFeddan": 1.60,   # ~10-11 Ardab/feddan
        "standardYieldYmTonPerHa": 3.80,
        "baselineInputCostPerFeddanEgp": 12000.0,
        "marketSuitabilityIndex": 0.97,        # Essential daily consumption (high import deficit)
        "importSubstitutionScore": 0.97,
        "strategicClassification": "grain_legume"
    },
    "alfalfa": {
        "id": "alfalfa",
        "nameAr": "البرسيم الحجازي",
        "nameEn": "Perennial Alfalfa",
        "producerPricePerTonEgp": 4500.0,      # Dried hay bales (high export & domestic demand)
        "producerPricePerTonUsd": 93.8,
        "standardYieldYmTonPerFeddan": 14.0,   # Multi-cut hay dry matter per feddan/year
        "standardYieldYmTonPerHa": 33.3,
        "baselineInputCostPerFeddanEgp": 16000.0,
        "marketSuitabilityIndex": 0.95,        # Deep taproot biodrilling + premium dairy feed
        "importSubstitutionScore": 0.90,
        "strategicClassification": "perennial_legume"
    },
    "panicum": {
        "id": "panicum",
        "nameAr": "حشيشة البانيكام المعمرة",
        "nameEn": "Panicum Maximum Forage",
        "producerPricePerTonEgp": 1500.0,
        "producerPricePerTonUsd": 31.3,
        "standardYieldYmTonPerFeddan": 28.0,
        "standardYieldYmTonPerHa": 66.7,
        "baselineInputCostPerFeddanEgp": 8000.0,
        "marketSuitabilityIndex": 0.86,
        "importSubstitutionScore": 0.78,
        "strategicClassification": "forage_grass"
    },
    "peanut": {
        "id": "peanut",
        "nameAr": "الفول السوداني (محصول تصديري رملي)",
        "nameEn": "Summer Peanut / Groundnut",
        "producerPricePerTonEgp": 35000.0,     # Premium export pod price (~35,000 EGP/ton)
        "producerPricePerTonUsd": 729.2,
        "standardYieldYmTonPerFeddan": 1.80,   # ~1.5 - 2.1 tons dry jumbo pods/feddan
        "standardYieldYmTonPerHa": 4.28,
        "baselineInputCostPerFeddanEgp": 13500.0,  # Certified seed, gypsum, rhizobia inoculant
        "marketSuitabilityIndex": 0.94,        # High confectionery and EU export demand
        "importSubstitutionScore": 0.90,
        "strategicClassification": "export_oilseed_legume"
    }
}

EGP_PER_USD = 48.0
FEDDAN_TO_HA = 0.42     # 1 Feddan = 0.42 Hectares (1 Ha = 2.38 Feddans)
UREA_BAG_PRICE_EGP = 950.0  # 50kg bag of 46% Urea = 23kg N (41.30 EGP/kg N)
WATER_PUMPING_COST_PER_M3_EGP = 2.50 # Diesel/Electric deep well pumping cost per m3

def convert_n_kg_ha_to_urea_bags_feddan(n_kg_ha: float, effective_credit_ratio: float = 1.0) -> float:
    """
    Converts biological nitrogen from kg N/ha to 50kg Urea bags (46% N) per feddan:
    N_feddan (kg N / feddan) = N_ha (kg N / ha) * 0.42 ha/feddan
    1 bag of 46% Urea (50 kg) contains 50 * 0.46 = 23.0 kg elemental N (41.30 EGP/kg N).
    Urea bags saved per feddan = (N_feddan * effective_credit_ratio) / 23.0
    """
    if n_kg_ha <= 0.0:
        return 0.0
    n_feddan = n_kg_ha * FEDDAN_TO_HA
    return float(round((n_feddan * effective_credit_ratio) / 23.0, 2))

# ------------------------------------------------------------------------------
# 2. Triple-Metric Economic Feasibility Function (S_econ v3.0)
# ------------------------------------------------------------------------------
def calc_single_crop_economics(
    crop_id: str,
    yield_ratio_ya_ym: float,
    area_feddan: float = 1.0,
    urea_bags_saved_per_feddan: float = 0.0,
    water_saved_m3_per_feddan: float = 0.0
) -> Dict[str, Any]:
    """
    Computes rigorous farm-level economics using the corrected v3.0 formulation:
    1. Pure Net Profit:
       NetProfit = (Y_a * Price_producer) - C_input_baseline + SavedFertilizer + SavedPumping
    2. Sign-Aware Market Risk Adjustment:
       If NetProfit >= 0: Profit_adj = NetProfit * M_suitability
       If NetProfit < 0:  Profit_adj = NetProfit / M_suitability (Amplifies loss penalty!)
    3. Yield efficiency ratio (Y_a / Y_m) is decoupled as a purely agronomic metric.
    """
    cid = crop_id.lower()
    profile = None
    for k, v in CROP_ECONOMIC_PROFILES.items():
        if k == cid or k in cid:
            profile = v
            break
    if profile is None:
        try:
            from master_crop_database import get_crop
            m_crop = get_crop(cid)
            if m_crop:
                profile = {
                    "id": m_crop["id"],
                    "nameAr": m_crop["name_ar"],
                    "nameEn": m_crop["name_en"],
                    "producerPricePerTonEgp": float(m_crop["price_egp_ton"]),
                    "producerPricePerTonUsd": float(m_crop["price_usd_ton"]),
                    "standardYieldYmTonPerFeddan": float(m_crop["potential_yield_ton_feddan"]),
                    "standardYieldYmTonPerHa": float(m_crop["potential_yield_ton_feddan"] / FEDDAN_TO_HA),
                    "baselineInputCostPerFeddanEgp": float(m_crop["baseline_cost_egp_feddan"]),
                    "marketSuitabilityIndex": float(m_crop["market_suitability"]),
                    "importSubstitutionScore": 0.90,
                    "strategicClassification": m_crop["category"]
                }
        except ImportError:
            pass
    if profile is None:
        profile = CROP_ECONOMIC_PROFILES["wheat"]

    clamped_yield_ratio = float(np.clip(yield_ratio_ya_ym, 0.10, 1.10))
    ym_feddan = profile["standardYieldYmTonPerFeddan"]
    ym_ha = profile["standardYieldYmTonPerHa"]

    # Actual simulated yield Y_a (ton/feddan and ton/ha)
    ya_feddan = clamped_yield_ratio * ym_feddan
    ya_ha = clamped_yield_ratio * ym_ha

    price_egp = profile["producerPricePerTonEgp"]
    price_usd = profile["producerPricePerTonUsd"]
    c_baseline_feddan = profile["baselineInputCostPerFeddanEgp"]
    m_suitability = float(np.clip(profile["marketSuitabilityIndex"], 0.40, 1.00))

    # Gross revenue
    gross_revenue_feddan_egp = ya_feddan * price_egp

    # Operational savings
    n_savings_egp = max(0.0, urea_bags_saved_per_feddan * UREA_BAG_PRICE_EGP)
    water_savings_egp = max(0.0, water_saved_m3_per_feddan * WATER_PUMPING_COST_PER_M3_EGP)

    # 1. PURE NET PROFIT (EGP / feddan)
    # Strictly avoids double-counting: baseline input cost remains constant, savings are explicitly credited
    net_profit_feddan_egp = gross_revenue_feddan_egp - c_baseline_feddan + n_savings_egp + water_savings_egp

    # 2. SIGN-AWARE MARKET RISK ADJUSTMENT
    if net_profit_feddan_egp >= 0:
        profit_adj_feddan_egp = net_profit_feddan_egp * m_suitability
    else:
        # Loss penalty amplification: dividing negative profit by M <= 1.0 enlarges the loss!
        profit_adj_feddan_egp = net_profit_feddan_egp / m_suitability

    # Conversion to Ha and USD
    # 1 Feddan = 0.42 Ha -> per Ha value = value_per_feddan / 0.42
    net_profit_ha_usd = (net_profit_feddan_egp / FEDDAN_TO_HA) / EGP_PER_USD
    profit_adj_ha_usd = (profit_adj_feddan_egp / FEDDAN_TO_HA) / EGP_PER_USD

    return {
        "crop_id": profile["id"],
        "name_ar": profile["nameAr"],
        "name_en": profile["nameEn"],
        "producer_price_per_ton_egp": price_egp,
        "producer_price_per_ton_usd": price_usd,
        "standard_yield_ym_ton_feddan": ym_feddan,
        "actual_yield_ya_ton_feddan": float(round(ya_feddan, 2)),
        "actual_yield_ya_ton_ha": float(round(ya_ha, 2)),
        "yield_efficiency_ratio": float(round(clamped_yield_ratio, 3)),
        "market_suitability_index": m_suitability,
        "import_substitution_score": profile["importSubstitutionScore"],
        "gross_revenue_per_feddan_egp": float(round(gross_revenue_feddan_egp)),
        "baseline_input_cost_per_feddan_egp": float(round(c_baseline_feddan)),
        "fertilizer_savings_egp": float(round(n_savings_egp)),
        "water_pumping_savings_egp": float(round(water_savings_egp)),
        "net_profit_per_feddan_egp": float(round(net_profit_feddan_egp)),
        "profit_adjusted_per_feddan_egp": float(round(profit_adj_feddan_egp)),
        "net_profit_per_ha_usd": float(round(net_profit_ha_usd)),
        "profit_adjusted_per_ha_usd": float(round(profit_adj_ha_usd)),
        "total_farm_net_profit_egp": float(round(net_profit_feddan_egp * area_feddan)),
        "total_farm_profit_adjusted_egp": float(round(profit_adj_feddan_egp * area_feddan))
    }

# ------------------------------------------------------------------------------
# 3. Multi-Season Sequence Economic Evaluator (v3.0)
# ------------------------------------------------------------------------------
def evaluate_sequence_economics(
    crops: List[Dict[str, Any]],
    yield_ratios: List[float],
    urea_bags_saved_total: float,
    water_saved_m3_total_feddan: float,
    area_feddan: float = 15.0
) -> Dict[str, Any]:
    """
    Evaluates cumulative 6-season (3-year) sequence economics without double counting.
    Applies sign-aware risk adjustment across seasons.
    """
    n_seasons = len(crops)
    seasonal_results = []
    tot_gross_egp = 0.0
    tot_cost_egp = 0.0
    tot_net_egp = 0.0
    tot_net_usd_ha = 0.0
    tot_adj_egp = 0.0
    tot_adj_usd_ha = 0.0
    suitability_weights = []

    per_season_urea_saved = urea_bags_saved_total / max(1.0, float(n_seasons))
    per_season_water_saved = water_saved_m3_total_feddan / max(1.0, float(n_seasons))

    for i in range(n_seasons):
        c = crops[i]
        yr = yield_ratios[i] if i < len(yield_ratios) else 0.85
        cid = c.get("id", "wheat")

        econ = calc_single_crop_economics(
            crop_id=cid,
            yield_ratio_ya_ym=yr,
            area_feddan=area_feddan,
            urea_bags_saved_per_feddan=per_season_urea_saved,
            water_saved_m3_per_feddan=per_season_water_saved
        )
        seasonal_results.append(econ)
        tot_gross_egp += econ["gross_revenue_per_feddan_egp"]
        tot_cost_egp += econ["baseline_input_cost_per_feddan_egp"]
        tot_net_egp += econ["net_profit_per_feddan_egp"]
        tot_adj_egp += econ["profit_adjusted_per_feddan_egp"]
        tot_net_usd_ha += econ["net_profit_per_ha_usd"]
        tot_adj_usd_ha += econ["profit_adjusted_per_ha_usd"]
        suitability_weights.append(econ["market_suitability_index"])

    mean_suitability = float(np.mean(suitability_weights))
    tot_urea_savings_egp = float(round(urea_bags_saved_total * UREA_BAG_PRICE_EGP))
    tot_water_pumping_savings_egp = float(round(water_saved_m3_total_feddan * WATER_PUMPING_COST_PER_M3_EGP))

    return {
        "seasons_evaluated": n_seasons,
        "seasonal_economics": seasonal_results,
        "cumulative_gross_revenue_egp_feddan": float(round(tot_gross_egp)),
        "cumulative_baseline_cost_egp_feddan": float(round(tot_cost_egp)),
        "cumulative_net_profit_egp_feddan": float(round(tot_net_egp)),
        "cumulative_profit_adjusted_egp_feddan": float(round(tot_adj_egp)),
        "cumulative_net_profit_usd_ha": float(round(tot_net_usd_ha)),
        "cumulative_profit_adjusted_usd_ha": float(round(tot_adj_usd_ha)),
        "total_farm_net_profit_egp": float(round(tot_net_egp * area_feddan)),
        "total_farm_profit_adjusted_egp": float(round(tot_adj_egp * area_feddan)),
        "total_urea_fertilizer_savings_egp": tot_urea_savings_egp,
        "total_water_pumping_savings_egp": tot_water_pumping_savings_egp,
        "average_market_suitability_index": float(round(mean_suitability, 3)),
        "market_risk_profile": "ultra_low" if mean_suitability >= 0.94 else ("moderate" if mean_suitability >= 0.85 else "volatile")
    }
