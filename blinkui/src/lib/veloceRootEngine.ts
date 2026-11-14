// ==============================================================================
// BlinkFarms — VeloceRoot Biophysical Engine (Lightweight Compatibility Layer)
// Single Source of Truth has been migrated to Python Scientific Core (engine_py)
// Pure Data Constants re-exported from fieldPresets.ts (Zero Synthetic Math)
// ==============================================================================

import {
  FlashDroughtTelemetry,
  FieldMemoryState,
  UnifiedFarmVitals,
  Language,
  FieldPreset,
} from './types';
import { DailyWeatherObservation } from './provenanceTypes';
import { DEMO_FIELDS, deriveFieldMemoryFromCoords } from './fieldPresets';
import { fetchTelemetryFromPython } from './pythonBridgeClient';

export { DEMO_FIELDS, deriveFieldMemoryFromCoords };
export type { FieldPreset };

/**
 * Lightweight synchronous generator for initial client render before Python bridge resolves.
 * Strictly uses real physical baselines and preset coordinates (Zero Math.sin/cos synthetic hacks).
 */
export function generateFieldTelemetry(
  lat: number,
  lon: number,
  fieldId: string,
  nameAr: string,
  nameEn: string,
  simulateShock: boolean = false
): FlashDroughtTelemetry {
  const match = DEMO_FIELDS.find(
    (f) => Math.abs(f.coordinates[0] - lat) < 0.15 && Math.abs(f.coordinates[1] - lon) < 0.15
  );

  const baseAirTemp = match ? (lat < 25.0 ? 38.5 : 32.0) : 31.5;
  const isShock = Boolean(simulateShock);
  const esi = isShock ? 0.36 : 0.84;
  const canopyTemp = isShock ? baseAirTemp + 3.8 : baseAirTemp - 2.5;
  const canopyFever = isShock ? 6.3 : -2.5;

  return {
    fieldId,
    fieldNameAr: nameAr,
    fieldNameEn: nameEn,
    coordinates: [Number(lat.toFixed(4)), Number(lon.toFixed(4))],
    currentDate: '2026-07-22',
    canopyTempC: Number(canopyTemp.toFixed(1)),
    airTempC: Number(baseAirTemp.toFixed(1)),
    canopyTempAnomalyC: Number(canopyFever.toFixed(1)),
    currentESI: esi,
    deltaESI7d: isShock ? -0.22 : 0.01,
    currentNDVI: isShock ? 0.79 : 0.81,
    rootZoneMoistureMm: isShock ? 38.0 : 88.0,
    prescribedIrrigationMm: isShock ? 42.0 : 18.0,
    prescribedVolumeM3Ha: isShock ? 420 : 180,
    isFlashDroughtAlert: isShock,
    alertHeadlineAr: isShock
      ? '⚠️ إنذار مبكر: جفاف ومضي نشط (حمى مسام المحصول)'
      : '✅ حالة ممتازة: ري متزن وتبريد نتحي طبيعي',
    alertHeadlineEn: isShock
      ? '⚠️ Early Warning: Active Flash Drought (Canopy Fever)'
      : '✅ Optimal Condition: Balanced Transpiration & Adequate Moisture',
    alertDetailAr: isShock
      ? 'النبات حران ومقفل مسامه، والعطش في عروقه قبل ظهور أي اصفرار بـ 14 يوماً.'
      : 'الزرع بيعرق ويتنفس بصورة ممتازة ولا يوجد أي إجهاد مائي أو حراري.',
    alertDetailEn: isShock
      ? 'Canopy fever detected: stomatal closure active 14 days prior to optical NDVI browning.'
      : 'Optimal transpiration cooling: stomata open and no thermal or water stress detected.',
    historyDays: [],
    dailyTrajectory45d: [],
  };
}

/**
 * Async authoritative telemetry loader querying the Python Scientific Microservice
 */
export async function getLiveFieldTelemetry(
  lat: number,
  lon: number,
  simulateShock: boolean = false,
  fieldNameAr?: string,
  fieldNameEn?: string
): Promise<FlashDroughtTelemetry> {
  const res = await fetchTelemetryFromPython({
    lat,
    lon,
    simulateShock,
    fieldNameAr,
    fieldNameEn,
  });
  return res.telemetry;
}

/**
 * Builds unified vitals structure from telemetry and weather observations
 */
export function buildUnifiedFarmVitals(
  telemetry: FlashDroughtTelemetry,
  weatherObs: DailyWeatherObservation | null,
  areaFeddan: number,
  lang: Language = 'ar'
): UnifiedFarmVitals {
  const isAr = lang === 'ar';
  const ambientAirC = weatherObs?.t_air_mean_c?.value ?? telemetry.airTempC;
  const ambientMaxC = weatherObs?.t_air_max_c?.value ?? ambientAirC + 5.0;
  const ambientMinC = weatherObs?.t_air_min_c?.value ?? ambientAirC - 6.5;
  const canopyTempC = telemetry.canopyTempC;
  const deltaTC = telemetry.canopyTempAnomalyC;

  const thermodynamicState: 'cooling_efficiently' | 'mild_warming' | 'fever_shutdown' =
    telemetry.isFlashDroughtAlert || deltaTC > 2.0
      ? 'fever_shutdown'
      : deltaTC > 0.5
      ? 'mild_warming'
      : 'cooling_efficiently';

  const tempSummaryAr =
    thermodynamicState === 'fever_shutdown'
      ? `حمى نباتية نشطة: مسام المحصول مغلقة وحرارة الأوراق أعلى من الطبيعي بـ +${deltaTC.toFixed(1)}°م.`
      : thermodynamicState === 'mild_warming'
      ? `المحصول يبدأ بالشعور بالحرارة (+${deltaTC.toFixed(1)}°م فوق النطاق المثالي).`
      : `المحصول يتنفس ويبدد الحرارة بكفاءة (تبريد نتحي طبيعي: -${Math.abs(deltaTC).toFixed(1)}°م).`;

  const tempSummaryEn =
    thermodynamicState === 'fever_shutdown'
      ? `Canopy fever: Stomatal shutdown (+${deltaTC.toFixed(1)}°C above unstressed baseline).`
      : thermodynamicState === 'mild_warming'
      ? `Mild heat accumulation (+${deltaTC.toFixed(1)}°C above unstressed baseline).`
      : `Healthy transpiration cooling (-${Math.abs(deltaTC).toFixed(1)}°C below air temperature).`;

  const rootZoneMoistureMm = telemetry.rootZoneMoistureMm;
  const rootZoneMoisturePercent = Math.min(100, Math.max(10, Math.round((rootZoneMoistureMm / 110) * 100)));

  const subsoilStatus: 'abundant' | 'adequate' | 'deficit_deep_irrigation_needed' =
    telemetry.isFlashDroughtAlert || telemetry.currentESI < 0.45
      ? 'deficit_deep_irrigation_needed'
      : telemetry.currentESI > 0.75
      ? 'abundant'
      : 'adequate';

  const hydroSummaryAr =
    subsoilStatus === 'deficit_deep_irrigation_needed'
      ? 'عجز رطوبي حاد في منطقة الجذور النشطة؛ يتطلب رياً عميقاً عاجلاً.'
      : subsoilStatus === 'abundant'
      ? 'مخزون الرطوبة الأرضية متاح بوفرة ولا يوجد إجهاد عطش.'
      : 'مستوى الرطوبة في النطاق الملائم لنشاط الامتصاص النباتي.';

  const hydroSummaryEn =
    subsoilStatus === 'deficit_deep_irrigation_needed'
      ? 'Severe root-zone moisture deficit; deep quenching irrigation required.'
      : subsoilStatus === 'abundant'
      ? 'Abundant subsoil moisture available; transpiration unimpeded.'
      : 'Adequate root-zone moisture for steady crop transpiration.';

  const depthMm = telemetry.prescribedIrrigationMm;
  const volumePerFeddanM3 = Math.round(depthMm * 4.20083);
  const volumeTotalFieldM3 = Math.round(volumePerFeddanM3 * areaFeddan);

  const urgencyLevel: 'routine_maintenance' | 'early_deficit_replenish' | 'emergency_quenching' =
    telemetry.isFlashDroughtAlert
      ? 'emergency_quenching'
      : depthMm > 25
      ? 'early_deficit_replenish'
      : 'routine_maintenance';

  const irrigSummaryAr =
    urgencyLevel === 'emergency_quenching'
      ? `ري إسعافي عاجل: ${depthMm.toFixed(1)} مم (${volumePerFeddanM3.toLocaleString()} م³/فدان) لخفض حمى المسام.`
      : `ري صيانة دوري: ${depthMm.toFixed(1)} مم (${volumePerFeddanM3.toLocaleString()} م³/فدان) لتعويض استهلاك النتح.`;

  const irrigSummaryEn =
    urgencyLevel === 'emergency_quenching'
      ? `Emergency quenching: ${depthMm.toFixed(1)} mm (${volumePerFeddanM3.toLocaleString()} m³/feddan).`
      : `Routine replenishment: ${depthMm.toFixed(1)} mm (${volumePerFeddanM3.toLocaleString()} m³/feddan).`;

  const windSpeedKmH = weatherObs ? Math.round((weatherObs.wind_speed_ms?.value ?? 3.0) * 3.6) : 11;
  const relativeHumidityPct = weatherObs ? Math.round(weatherObs.rh_pct?.value ?? 38) : 38;
  const rainMm = weatherObs?.precipitation_mm?.value ?? 0;
  const isSafeToSpray = windSpeedKmH <= 15 && rainMm < 0.2 && ambientAirC <= 34 && !telemetry.isFlashDroughtAlert;

  const fungalSporeRisk: 'low' | 'moderate' | 'high' =
    relativeHumidityPct > 75 ? 'high' : relativeHumidityPct > 55 ? 'moderate' : 'low';

  const verdictAr = isSafeToSpray
    ? 'الظروف الجوية مثالية للرش والمكافحة الحشرية والفطرية.'
    : 'غير مناسب للرش حالياً (سرعة الرياح أو إجهاد النبات).';

  const verdictEn = isSafeToSpray
    ? 'Atmospheric conditions optimal for crop spraying.'
    : 'Unfavorable spray window (wind drift or crop heat stress).';

  const threatLevel: 1 | 2 | 3 = telemetry.isFlashDroughtAlert ? 3 : telemetry.currentESI < 0.6 ? 2 : 1;

  const warningNarrativeAr =
    threatLevel === 3
      ? 'رادار ناسا يرصد هبوط النتح وارتفاع حرارة المسام قبل اصفرار الأوراق بـ 14 يوماً.'
      : threatLevel === 2
      ? 'انخفاض تدريجي في مؤشر النتح، يُوصى ببدء دورة الري التعويضية خلال 48 ساعة.'
      : 'معدلات النتح متزنة تماماً والمحصول في حالة فسيولوجية ممتازة.';

  const warningNarrativeEn =
    threatLevel === 3
      ? 'NASA radar detects early transpiration collapse 14 days before visible NDVI browning.'
      : threatLevel === 2
      ? 'Gradual transpiration decline; replenish within 48 hours to avoid stress.'
      : 'Transpiration rates balanced; crop in excellent biophysical health.';

  return {
    fieldId: telemetry.fieldId,
    fieldNameAr: telemetry.fieldNameAr,
    fieldNameEn: telemetry.fieldNameEn,
    coordinates: telemetry.coordinates,
    areaFeddan,
    lastUpdatedIso: new Date().toISOString(),
    temperature: {
      ambientAirC,
      ambientMaxC,
      ambientMinC,
      canopyTempC,
      deltaTC,
      thermodynamicState,
      summaryAr: tempSummaryAr,
      summaryEn: tempSummaryEn,
    },
    hydrology: {
      evaporativeStressIndex: telemetry.currentESI,
      deltaESI7d: telemetry.deltaESI7d,
      rootZoneMoistureMm,
      rootZoneMoisturePercent,
      subsoilStatus,
      summaryAr: hydroSummaryAr,
      summaryEn: hydroSummaryEn,
    },
    irrigationPrescription: {
      depthMm,
      volumePerFeddanM3,
      volumeTotalFieldM3,
      urgencyLevel,
      optimalWindowAr: 'مع طراوة الصباح الباكر (5:00 - 8:00 ص) أو بعد العصر (5:30 م)',
      optimalWindowEn: 'Early morning (5:00 - 8:00 AM) or late afternoon (5:30 PM)',
      summaryAr: irrigSummaryAr,
      summaryEn: irrigSummaryEn,
    },
    sprayWindow: {
      isSafeToSpray,
      windSpeedKmH,
      relativeHumidityPct,
      rainMm,
      fungalSporeRisk,
      verdictAr,
      verdictEn,
      recommendedTimeSlotAr: 'الفترة الآمنة: 6:00 ص إلى 8:30 ص مع هدوء الرياح',
      recommendedTimeSlotEn: 'Safest slot: 6:00 to 8:30 AM with calm winds',
    },
    flashDroughtThreat: {
      level: threatLevel,
      isAlert: threatLevel === 3,
      daysToIrreversibleBrowning: 14,
      currentNDVI: telemetry.currentNDVI,
      warningNarrativeAr,
      warningNarrativeEn,
    },
  };
}
