// ==============================================================================
// BlinkFarms — Definitive Global Crop Master Knowledge Base (v3.6)
// Unified FAO-56 / AquaCrop & Egyptian ARC Master Crop Database
// Loaded Directly from Categorized JSON Schema (48 Crops across 8 Categories)
// ==============================================================================

import { Crop, AgronomicCategory, AgronomicCategoryId } from './types';
import { EGYPTIAN_CROP_PROFILES } from './egyptianCropProfiles';
import rawData from './fao_categorized_crops.json';

export interface RawCropData {
  id: string;
  name_ar: string;
  name_en: string;
  category: AgronomicCategoryId;
  botanical_family: string;
  growth_habit: 'annual' | 'perennial_forage' | 'permanent_orchard';
  season: 'winter' | 'summer' | 'perennial';
  certified_variety_ar: string;
  kc_ini: number;
  kc_mid: number;
  kc_end: number;
  stage_days: [number, number, number, number];
  water_need_mm: number;
  root_depth_m: number;
  depletion_p: number;
  ky: number;
  wp_star: number;
  hi_base: number;
  t_base: number;
  t_max_optimal: number;
  t_crit_flowering: number;
  salinity_threshold_dsm: number;
  salinity_slope_pct: number;
  n_fixation_kg_ha: number;
  nematode_susceptibility: 'low' | 'medium' | 'high';
  residue_ton_ha: number;
  potential_yield_ton_feddan: number;
  price_egp_ton: number;
  price_usd_ton: number;
  baseline_cost_egp_feddan: number;
  market_suitability: number;
}

export const AGRONOMIC_CATEGORIES: AgronomicCategory[] = (rawData as any).categories;
export const AGRONOMIC_CATEGORIES_BY_ID: Record<string, AgronomicCategory> = Object.fromEntries(
  AGRONOMIC_CATEGORIES.map((cat) => [cat.id, cat])
);

export const CROP_DATABASE: Record<string, Crop> = {};

function sumStageDays(arr: [number, number, number, number]): number {
  return (arr[0] || 0) + (arr[1] || 0) + (arr[2] || 0) + (arr[3] || 0);
}

const familyNameMap: Record<string, { ar: string; en: string }> = {
  poaceae: { ar: 'نجيليات (حبوب وأعلاف)', en: 'Poaceae (Grasses & Grains)' },
  fabaceae: { ar: 'بقوليات (تثبيت نيتروجين)', en: 'Fabaceae (Legumes)' },
  solanaceae: { ar: 'باذنجانيات', en: 'Solanaceae (Nightshades)' },
  cucurbitaceae: { ar: 'قرعيات', en: 'Cucurbitaceae (Gourds & Melons)' },
  brassicaceae: { ar: 'صليبيات', en: 'Brassicaceae (Mustards & Crucifers)' },
  alliaceae: { ar: 'ثوميات وبصليات', en: 'Alliaceae (Alliums)' },
  chenopodiaceae: { ar: 'رمرامية (بنجريات)', en: 'Chenopodiaceae' },
  convolvulaceae: { ar: 'محموديات (بطاطا)', en: 'Convolvulaceae' },
  pedaliaceae: { ar: 'سمسميات', en: 'Pedaliaceae (Sesame)' },
  malvaceae: { ar: 'خبازيات (ألياف)', en: 'Malvaceae (Mallows & Cotton)' },
  linaceae: { ar: 'كتانيات', en: 'Linaceae (Flax)' },
  rutaceae: { ar: 'سذابية (موالح)', en: 'Rutaceae (Citrus)' },
  oleaceae: { ar: 'زيتونية', en: 'Oleaceae (Olives)' },
  arecaceae: { ar: 'نخيلية', en: 'Arecaceae (Palms)' },
  vitaceae: { ar: 'كرمية (عنب)', en: 'Vitaceae (Grapes)' },
  anacardiaceae: { ar: 'بطمية (مانجو)', en: 'Anacardiaceae (Mangoes)' },
  lythraceae: { ar: 'خثرية (رمان)', en: 'Lythraceae (Pomegranate)' },
  musaceae: { ar: 'موزية', en: 'Musaceae (Bananas)' },
  amaranthaceae: { ar: 'قطيفية (كينوا)', en: 'Amaranthaceae' },
  asteraceae: { ar: 'نجمية (مركبة)', en: 'Asteraceae (Composites)' },
  lamiaceae: { ar: 'شفوية (نعناعيات)', en: 'Lamiaceae (Mints)' }
};

const rawCrops: RawCropData[] = (rawData as any).crops;

for (const raw of rawCrops) {
  const isPerennial = raw.growth_habit !== 'annual';
  const c3_c4: 'C3' | 'C4' = ['maize', 'sorghum', 'panicum', 'silage_corn', 'sudangrass', 'sugarcane'].includes(raw.id)
    ? 'C4'
    : 'C3';

  const famInfo = familyNameMap[raw.botanical_family] || {
    ar: raw.botanical_family,
    en: raw.botanical_family
  };

  const cropObj: Crop = {
    id: raw.id,
    nameAr: raw.name_ar,
    nameEn: raw.name_en,
    family: raw.botanical_family,
    familyNameAr: famInfo.ar,
    familyNameEn: famInfo.en,
    season: raw.season,
    category: raw.category,
    growthHabit: raw.growth_habit,
    isPerennial,
    c3_c4pathway: c3_c4,
    wpNormalizedGm2: raw.wp_star,
    harvestIndexBase: raw.hi_base,
    tBaseC: raw.t_base,
    tCritFloweringC: raw.t_crit_flowering,
    gddRequired: sumStageDays(raw.stage_days) * 12,
    nFixationKgHa: raw.n_fixation_kg_ha,
    nDemandKgHa: raw.n_fixation_kg_ha > 0 ? 30 : Math.round(raw.water_need_mm * 0.28),
    residueOrganicMatterScore: Math.min(10, Math.round(raw.residue_ton_ha * 2.2)),
    kcIni: raw.kc_ini,
    kcMid: raw.kc_mid,
    kcEnd: raw.kc_end,
    ky: raw.ky,
    depletionP: raw.depletion_p,
    rootDepthMaxM: raw.root_depth_m,
    tBase: raw.t_base,
    tOpt: raw.t_max_optimal - 4.0,
    tMax: raw.t_crit_flowering + 4.0,
    gddMaturity: sumStageDays(raw.stage_days) * 12,
    waterRequirementMm: raw.water_need_mm,
    salinityToleranceDsM: raw.salinity_threshold_dsm,
    nitrogenFixationKgHa: raw.n_fixation_kg_ha,
    residueBiomassTonHa: raw.residue_ton_ha,
    waterloggingTolerance: ['rice', 'sugarcane'].includes(raw.id)
      ? 'high'
      : ['wheat', 'clover_berseem'].includes(raw.id)
      ? 'medium'
      : 'low',
    nematodeSusceptibility: raw.nematode_susceptibility,
    avgCostPerHa: Math.round((raw.baseline_cost_egp_feddan * 2.38095) / 48.0),
    avgRevenuePerHa: Math.round(((raw.potential_yield_ton_feddan * raw.price_egp_ton) * 2.38095) / 48.0),
    marketLiquidity: raw.market_suitability >= 0.90 ? 'high' : 'medium',
    egyptianProfile: EGYPTIAN_CROP_PROFILES[raw.id]
  };

  CROP_DATABASE[raw.id] = cropObj;
}

// Attach Egyptian profiles if defined with different keys
for (const [cropId, profile] of Object.entries(EGYPTIAN_CROP_PROFILES)) {
  if (CROP_DATABASE[cropId] && !CROP_DATABASE[cropId].egyptianProfile) {
    CROP_DATABASE[cropId].egyptianProfile = profile;
  }
}

// Aliases for legacy code compatibility
CROP_DATABASE.durum_wheat = CROP_DATABASE.wheat;
CROP_DATABASE.winter_wheat = CROP_DATABASE.wheat;
CROP_DATABASE.spring_wheat = CROP_DATABASE.wheat;
CROP_DATABASE.faba = CROP_DATABASE.faba_bean;
CROP_DATABASE.potatoes = CROP_DATABASE.potato;
CROP_DATABASE.beet = CROP_DATABASE.sugar_beet;
CROP_DATABASE.berseem_clover = CROP_DATABASE.clover_berseem;
CROP_DATABASE.corn = CROP_DATABASE.maize;
CROP_DATABASE.groundnut = CROP_DATABASE.peanut;

export const CROP_LIST: Crop[] = Object.values(CROP_DATABASE);

export function getCrop(id: string): Crop | undefined {
  return CROP_DATABASE[id];
}

export function getCropsByCategory(categoryId: AgronomicCategoryId): Crop[] {
  return CROP_LIST.filter((c) => c.category === categoryId);
}

export function filterCrops(params: {
  category?: AgronomicCategoryId;
  season?: 'winter' | 'summer' | 'perennial';
  maxSalinityEc?: number;
  nematodeSafeOnly?: boolean;
}): Crop[] {
  return CROP_LIST.filter((c) => {
    if (params.category && c.category !== params.category) return false;
    if (params.season && c.season !== params.season && c.season !== 'perennial') return false;
    if (params.maxSalinityEc !== undefined && c.salinityToleranceDsM < params.maxSalinityEc) return false;
    if (params.nematodeSafeOnly && c.nematodeSusceptibility === 'high') return false;
    return true;
  });
}
