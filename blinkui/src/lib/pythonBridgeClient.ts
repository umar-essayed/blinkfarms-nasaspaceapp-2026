// ==============================================================================
// BlinkFarms — Python Scientific Core High-Performance Bridge Client
// Ultra-fast HTTP client connecting Next.js with FastAPI Engine (Port 8000)
// Conforming strictly to NASA Earth Observation biophysical data models
// ==============================================================================

import {
  FlashDroughtTelemetry,
  UnifiedFarmVitals,
  RotationStrategy,
  FieldMemoryState,
  UserPriorities,
  SoilDiagnostic,
  DailyTrajectoryPoint,
  Language,
} from './types';
import { DEFAULT_PRIORITIES } from './fieldPresets';

export const PYTHON_ENGINE_URL =
  process.env.NEXT_PUBLIC_PYTHON_ENGINE_URL ||
  process.env.PYTHON_ENGINE_URL ||
  'http://127.0.0.1:8000';

export interface PythonTelemetryParams {
  lat: number;
  lon: number;
  cropId?: string;
  soilType?: string;
  fieldId?: string;
  fieldNameAr?: string;
  fieldNameEn?: string;
  areaFeddan?: number;
  areaHa?: number;
  polygonBoundary?: [number, number][];
  subParcels?: any[];
  lang?: Language;
  simulateShock?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface PythonTelemetryResponse {
  success: boolean;
  coordinates: [number, number];
  crop_id: string;
  soil_type: string;
  metrics: {
    ndvi: number;
    savi: number;
    canopy_temp_c: number;
    ambient_air_c: number;
    canopy_fever_c: number;
    eta_mm_day: number;
    pet_mm_day: number;
    esi: number;
    delta_esi_7d: number;
    is_flash_drought_alert: boolean;
    alert_status: string;
    theta_root_30m: number;
    theta_fc: number;
    theta_wp: number;
    prescribed_irrigation_mm: number;
    prescribed_volume_m3_ha: number;
  };
  soil_diagnostic: SoilDiagnostic;
  dailyTrajectory45d: DailyTrajectoryPoint[];
  historyDays: DailyTrajectoryPoint[];
  telemetry: FlashDroughtTelemetry;
  unifiedVitals: UnifiedFarmVitals;
  provenance?: {
    data_source: string;
    nasa_observation_date: string | null;
    nasa_parameters: string[];
    derived_biophysical_fluxes: string[];
    earthdata_collection: string;
    api_authenticated: boolean;
  };
  error?: string;
}

export interface PythonSimulationParams {
  lat: number;
  lon: number;
  priorities?: UserPriorities;
  fieldMemory?: FieldMemoryState;
  whatIfWaterCutPercent?: number;
  whatIfHeatwaveC?: number;
  areaFeddan?: number;
  polygonBoundary?: [number, number][];
  subParcels?: any[];
  lang?: Language;
  allowedCategories?: string[];
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface PythonSimulationResponse {
  success: boolean;
  region: string;
  strategies: RotationStrategy[];
  error?: string;
}

export interface PythonHealthResponse {
  healthy: boolean;
  status?: string;
  engine?: string;
  version?: string;
  nasa_sensors?: string[];
  live_nasa_ingestion?: boolean;
  error?: string;
}

/**
 * Checks connectivity and health of the Python FastAPI Microservice
 */
export async function checkPythonEngineHealth(timeoutMs: number = 2000): Promise<PythonHealthResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${PYTHON_ENGINE_URL}/api/v1/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { healthy: false, error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const data = await res.json();
    return {
      healthy: data.status === 'healthy',
      status: data.status,
      engine: data.engine,
      version: data.version,
      nasa_sensors: data.nasa_sensors,
      live_nasa_ingestion: data.live_nasa_ingestion,
    };
  } catch (err: any) {
    clearTimeout(timer);
    return {
      healthy: false,
      error: err.name === 'AbortError' ? 'Timeout reaching Python engine' : err.message,
    };
  }
}

/**
 * Fetches real-time biophysical telemetry and 45-day trajectory from Python core
 */
export async function fetchTelemetryFromPython(
  params: PythonTelemetryParams
): Promise<PythonTelemetryResponse> {
  const timeoutMs = params.timeoutMs ?? 5000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Combine external abort signal if supplied
  if (params.signal) {
    params.signal.addEventListener('abort', () => controller.abort());
  }

  const payload = {
    lat: params.lat,
    lon: params.lon,
    crop_id: params.cropId || 'wheat_giza171',
    soil_type: params.soilType || 'alluvial_clay',
    field_id: params.fieldId,
    field_name_ar: params.fieldNameAr,
    field_name_en: params.fieldNameEn,
    area_feddan: params.areaFeddan,
    area_ha: params.areaHa || (params.areaFeddan ? params.areaFeddan / 2.38095 : 25.0),
    polygon_boundary: params.polygonBoundary,
    sub_parcels: params.subParcels,
    lang: params.lang || 'ar',
    simulate_shock: Boolean(params.simulateShock),
  };

  try {
    const res = await fetch(`${PYTHON_ENGINE_URL}/api/v1/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Python Engine returned status ${res.status} (${res.statusText})`);
    }

    const data: PythonTelemetryResponse = await res.json();
    return data;
  } catch (err: any) {
    clearTimeout(timer);
    throw new Error(
      `[PythonBridge] Failed to fetch telemetry: ${
        err.name === 'AbortError' ? 'Request timed out after ' + timeoutMs + 'ms' : err.message
      }`
    );
  }
}

/**
 * Fetches full multi-criteria crop rotation simulation and TOPSIS sequence from Python core
 */
export async function fetchSimulationFromPython(
  params: PythonSimulationParams
): Promise<PythonSimulationResponse> {
  const timeoutMs = params.timeoutMs ?? 6000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (params.signal) {
    params.signal.addEventListener('abort', () => controller.abort());
  }

  const payload = {
    lat: params.lat,
    lon: params.lon,
    priorities: params.priorities || DEFAULT_PRIORITIES,
    field_memory: params.fieldMemory,
    what_if_water_cut_percent: params.whatIfWaterCutPercent ?? 0.0,
    what_if_heatwave_c: params.whatIfHeatwaveC ?? 0.0,
    area_feddan: params.areaFeddan ?? 15.0,
    polygon_boundary: params.polygonBoundary,
    sub_parcels: params.subParcels,
    lang: params.lang || 'ar',
    allowed_categories: params.allowedCategories,
  };

  try {
    const res = await fetch(`${PYTHON_ENGINE_URL}/api/v1/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Python Engine returned status ${res.status} (${res.statusText})`);
    }

    const data: PythonSimulationResponse = await res.json();
    return data;
  } catch (err: any) {
    clearTimeout(timer);
    throw new Error(
      `[PythonBridge] Failed to fetch simulation: ${
        err.name === 'AbortError' ? 'Request timed out after ' + timeoutMs + 'ms' : err.message
      }`
    );
  }
}

/**
 * Executes fast What-If scenario simulation on Python Engine
 */
export async function fetchWhatIfSimulationFromPython(params: {
  lat?: number;
  lon?: number;
  baseCropId?: string;
  alternateCropId?: string;
  waterCutPercent?: number;
  heatwaveC?: number;
  areaFeddan?: number;
  soilType?: string;
}): Promise<any> {
  const res = await fetch(`${PYTHON_ENGINE_URL}/api/v1/simulate/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: params.lat ?? 30.85,
      lon: params.lon ?? 31.05,
      base_crop_id: params.baseCropId || 'wheat',
      alternate_crop_id: params.alternateCropId,
      water_cut_percent: params.waterCutPercent ?? 0.0,
      heatwave_c: params.heatwaveC ?? 0.0,
      area_feddan: params.areaFeddan ?? 15.0,
      soil_type: params.soilType || 'alluvial_clay',
    }),
  });
  if (!res.ok) throw new Error(`What-if simulation failed: ${res.statusText}`);
  return res.json();
}

/**
 * Computes prescriptive smart irrigation vs traditional flood comparison
 */
export async function fetchSmartIrrigationFromPython(params: {
  thetaFc?: number;
  thetaCurrent?: number;
  thetaWp?: number;
  zrM?: number;
  areaFeddan?: number;
  irrigationSystem?: string;
  pumpingCostEgpM3?: number;
}): Promise<any> {
  const res = await fetch(`${PYTHON_ENGINE_URL}/api/v1/irrigation/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      theta_fc: params.thetaFc ?? 0.32,
      theta_current: params.thetaCurrent ?? 0.22,
      theta_wp: params.thetaWp ?? 0.14,
      z_r_m: params.zrM ?? 1.2,
      area_feddan: params.areaFeddan ?? 15.0,
      irrigation_system: params.irrigationSystem || 'drip',
      pumping_cost_egp_m3: params.pumpingCostEgpM3 ?? 2.50,
    }),
  });
  if (!res.ok) throw new Error(`Irrigation optimization failed: ${res.statusText}`);
  return res.json();
}

/**
 * Fetches transparent 4-pillar Field Intelligence Score
 */
export async function fetchFieldIntelligenceFromPython(params?: any): Promise<any> {
  const p = params || {};
  const res = await fetch(`${PYTHON_ENGINE_URL}/api/v1/field-intelligence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ndvi: p.ndvi ?? 0.76,
      savi: p.savi ?? 0.60,
      fc: p.fc ?? 0.72,
      esi: p.esi ?? 0.68,
      canopy_fever_c: p.canopyFeverC ?? 1.2,
      theta_root_m3_m3: p.thetaRoot ?? 0.24,
      theta_fc: p.thetaFc ?? 0.32,
      theta_wp: p.thetaWp ?? 0.14,
      ec_salinity_dsm: p.ecSalinity ?? 1.8,
      hardpan_detected: p.hardpanDetected ?? false,
      soc_g_kg: p.socGKg ?? 8.0,
      flash_drought_count_3yr: p.flashDroughtCount ?? 1,
      mean_temp_anomaly_c: p.tempAnomaly ?? 0.8,
    }),
  });
  if (!res.ok) throw new Error(`Field intelligence score failed: ${res.statusText}`);
  return res.json();
}

/**
 * Fetches Explainable AI decision rationale for a crop
 */
export async function fetchCropRationaleFromPython(cropId: string, soil?: string, ec?: number): Promise<any> {
  const s = soil || 'alluvial_clay';
  const e = ec ?? 1.8;
  const res = await fetch(`${PYTHON_ENGINE_URL}/api/v1/xai/rationale/${cropId}?soil=${s}&ec=${e}`);
  if (!res.ok) throw new Error(`Crop rationale failed: ${res.statusText}`);
  return res.json();
}

/**
 * Ingests 5 years (10 seasons) of historical NASA telemetry and builds the 16D Field Memory Dataset
 */
export async function ingest5YearFieldHistoryFromPython(params: {
  fieldId: string;
  lat: number;
  lon: number;
  polygonBoundary?: [number, number][];
  areaFeddan?: number;
  soilType?: string;
  irrigationSystem?: string;
  cropCategoryPreference?: string;
  primaryPriority?: string;
}): Promise<any> {
  const res = await fetch(`${PYTHON_ENGINE_URL}/api/v1/field-memory/ingest-5yr-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      field_id: params.fieldId,
      lat: params.lat,
      lon: params.lon,
      polygon_boundary: params.polygonBoundary,
      area_feddan: params.areaFeddan ?? 15.0,
      soil_type: params.soilType || 'clay_loam',
      irrigation_system: params.irrigationSystem || 'drip',
      crop_category_preference: params.cropCategoryPreference || 'all',
      primary_priority: params.primaryPriority || 'water',
    }),
  });
  if (!res.ok) throw new Error(`5-year field history ingestion failed: ${res.statusText}`);
  return res.json();
}
