'use client';

import React, { useState } from 'react';
import { FlashDroughtTelemetry, UnifiedFarmVitals, Language } from '@/lib/types';
import { DiagnosticTargetMetric } from './NasaScienceLabModal';

interface FarmerMorningVitalsProps {
  telemetry: FlashDroughtTelemetry;
  vitals?: UnifiedFarmVitals;
  areaFeddan: number;
  lang: Language;
  onOpenScienceModal?: (tab?: 'diagnostic' | 'satellites' | 'equations' | 'topsis', eqId?: number, targetMetric?: DiagnosticTargetMetric) => void;
}

export default function FarmerMorningVitals({
  telemetry,
  vitals,
  areaFeddan,
  lang,
  onOpenScienceModal,
}: FarmerMorningVitalsProps) {
  const [showDetailedGauges, setShowDetailedGauges] = useState(true);

  // Irrigation Prescription
  const prescribedMm = vitals?.irrigationPrescription.depthMm ?? (telemetry.prescribedIrrigationMm || 17.2);
  const m3PerFeddan = vitals?.irrigationPrescription.volumePerFeddanM3 ?? Math.round(prescribedMm * 4.20083);

  // Spray Safety
  const isSpraySafe = vitals?.sprayWindow.isSafeToSpray ?? (!telemetry.isFlashDroughtAlert);
  const windKmH = vitals?.sprayWindow.windSpeedKmH ?? 9;

  // Canopy Temp vs Air Temp
  const canopyTempC = vitals?.temperature.canopyTempC ?? telemetry.canopyTempC;
  const airTempC = telemetry.airTempC || 31;
  const tempDiffC = Math.round((canopyTempC - airTempC) * 10) / 10;

  // Root Moisture
  const rootMoisturePct = vitals?.hydrology.rootZoneMoisturePercent ?? Math.min(100, Math.round(((telemetry.rootZoneMoistureMm || 48) / 70) * 100));

  // Overall Health Score
  const healthScore = Math.min(99, Math.max(45, Math.round(
    (telemetry.currentESI * 45) + (rootMoisturePct * 0.35) + 20
  )));

  const isShock = telemetry.isFlashDroughtAlert;

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  return (
    <section aria-label="Farm Daily Decisions" className="w-full font-sans select-none">
      
      {/* =========================================================================
          HERO STATUS CARD: CLEAN, FIT, NO OVERFLOW
         ========================================================================= */}
      <div className="rounded-3xl bg-white border border-[#384536]/10 p-4 sm:p-5 lg:p-6 shadow-[0_4px_24px_rgba(56,69,54,0.04)] space-y-3.5">
        
        {/* Top Header: Health & Status Statement */}
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[#384536]/8">
          <div className="flex items-center gap-3 min-w-0">
            {/* Health Activity Ring */}
            <div className="relative w-13 h-13 shrink-0 flex items-center justify-center">
              <svg className="w-13 h-13 transform -rotate-90">
                <circle
                  cx="26"
                  cy="26"
                  r={22}
                  stroke="#EDE6D9"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="26"
                  cy="26"
                  r={22}
                  stroke={healthScore >= 75 ? '#384536' : healthScore >= 55 ? '#B87314' : '#A8382B'}
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 22}
                  strokeDashoffset={2 * Math.PI * 22 - (healthScore / 100) * 2 * Math.PI * 22}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="absolute font-mono font-black text-sm text-[#243023]">
                {healthScore}%
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-[#576855]">
                  {lang === 'ar' ? 'صحة الحقل والتربة' : 'Field Health'}
                </span>
                {onOpenScienceModal && (
                  <button
                    onClick={() => onOpenScienceModal('diagnostic', 11, 'health')}
                    className="text-[9px] text-[#576855] bg-[#EDE6D9] px-1.5 py-0.5 rounded-full hover:bg-[#384536] hover:text-white transition-colors"
                  >
                    {lang === 'ar' ? 'المعادلات' : 'Eqs'}
                  </button>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-black text-[#243023] mt-0.5 truncate">
                {healthScore >= 75
                  ? (lang === 'ar' ? 'حالة الحقل ممتازة ومستقرة' : 'Optimal Field Health')
                  : (lang === 'ar' ? 'الحقل تحت المراقبة' : 'Field Under Stress')}
              </h2>
            </div>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDE6D9] text-[10px] font-bold text-[#384536]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2F6E3E] animate-pulse"></span>
              <span className="hidden sm:inline">{lang === 'ar' ? 'NASA متزامن' : 'NASA Sync'}</span>
              <span className="sm:hidden">{lang === 'ar' ? 'متزامن' : 'Sync'}</span>
            </span>
          </div>
        </div>

        {/* 3 Core Decisions: Compact Horizontal Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5">
          
          {/* Card 1: Irrigation */}
          <div className="rounded-2xl bg-[#FAF7F2] p-3 border border-[#384536]/8 flex items-center justify-between gap-2 hover:border-[#384536]/20 transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0">💧</span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#576855] truncate">
                  {lang === 'ar' ? 'قرار الري اليوم' : 'Irrigation Quota'}
                </div>
                <div className="text-[10px] text-[#7E907C] font-medium truncate">
                  {lang === 'ar' ? `عمق ${prescribedMm} ملم` : `${prescribedMm} mm depth`}
                </div>
              </div>
            </div>
            <div className="text-end shrink-0">
              <div className="text-lg sm:text-xl font-black font-mono text-[#243023]">
                {m3PerFeddan} <span className="text-[11px] font-sans font-bold text-[#576855]">{lang === 'ar' ? 'م³/ف' : 'm³/fed'}</span>
              </div>
              <span className="text-[9px] text-[#2F6E3E] bg-[#2F6E3E]/10 px-1.5 py-0.5 rounded font-bold">
                {lang === 'ar' ? '٦:٠٠ ص' : '6:00 AM'}
              </span>
            </div>
          </div>

          {/* Card 2: Spray Safety */}
          <div className="rounded-2xl bg-[#FAF7F2] p-3 border border-[#384536]/8 flex items-center justify-between gap-2 hover:border-[#384536]/20 transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0">💨</span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#576855] truncate">
                  {lang === 'ar' ? 'نافذة الرش' : 'Spray Safety'}
                </div>
                <div className="text-[10px] text-[#7E907C] font-medium truncate">
                  {windKmH} {lang === 'ar' ? 'كم/س' : 'km/h'}
                </div>
              </div>
            </div>
            <div className="text-end shrink-0">
              <div className={`text-sm sm:text-base font-black ${isSpraySafe ? 'text-[#2F6E3E]' : 'text-[#A8382B]'}`}>
                {isSpraySafe ? (lang === 'ar' ? 'آمن ومثالي' : 'Safe') : (lang === 'ar' ? 'مؤجل للرياح' : 'Delayed')}
              </div>
              <span className="text-[9px] text-[#7E907C] font-medium">
                {lang === 'ar' ? 'حتى 10 ص' : 'Until 10 AM'}
              </span>
            </div>
          </div>

          {/* Card 3: Canopy Temperature */}
          <div className="rounded-2xl bg-[#FAF7F2] p-3 border border-[#384536]/8 flex items-center justify-between gap-2 hover:border-[#384536]/20 transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0">🌿</span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#576855] truncate">
                  {lang === 'ar' ? 'حرارة الخضري' : 'Canopy Temp'}
                </div>
                <div className="text-[10px] text-[#7E907C] font-medium truncate">
                  {lang === 'ar' ? 'تبريد ذاتي نشط' : 'Transpiration'}
                </div>
              </div>
            </div>
            <div className="text-end shrink-0">
              <div className="text-lg sm:text-xl font-black font-mono text-[#243023]">
                {canopyTempC}° <span className="text-[11px] font-sans font-bold text-[#576855]">{lang === 'ar' ? 'مئوية' : '°C'}</span>
              </div>
              <span className="text-[9px] text-[#2F6E3E] bg-[#2F6E3E]/10 px-1.5 py-0.5 rounded font-bold">
                {tempDiffC <= 0 ? (lang === 'ar' ? `أبرد ${Math.abs(tempDiffC)}°` : `${tempDiffC}°C`) : `+${tempDiffC}°C`}
              </span>
            </div>
          </div>

        </div>

        {/* Deep Science Gauges (Spacious & Clean) */}
        <div className="pt-2 border-t border-[#384536]/8 space-y-2">
          {/* Gauge 1: Root Moisture */}
          <div className="bg-[#FAF7F2] p-2.5 rounded-2xl border border-[#384536]/8 space-y-1">
            <div className="flex justify-between items-center text-xs font-bold text-[#576855]">
              <span>🌱 {lang === 'ar' ? 'رطوبة الجذور' : 'Root Moisture'}</span>
              <span className="font-mono text-[#243023] font-black">{rootMoisturePct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#EDE6D9] overflow-hidden">
              <div className="h-full bg-[#384536] rounded-full transition-all duration-500" style={{ width: `${rootMoisturePct}%` }} />
            </div>
            <div className="flex justify-between text-[9px] text-[#7E907C]">
              <span>{lang === 'ar' ? 'عطش' : 'Dry'}</span>
              <span className="text-[#2F6E3E] font-bold">{lang === 'ar' ? 'مثالي' : 'Optimal'}</span>
              <span>{lang === 'ar' ? 'تشبع' : 'Saturated'}</span>
            </div>
          </div>

          {/* Gauge 2 & 3: Side-by-Side */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#FAF7F2] p-2 rounded-2xl border border-[#384536]/8 space-y-1">
              <div className="flex justify-between items-center text-[11px] font-bold text-[#576855]">
                <span>💨 {lang === 'ar' ? 'الرش' : 'Spray'}</span>
                <span className="text-[#2F6E3E] text-[9px] font-bold">{lang === 'ar' ? '10 ص' : '10 AM'}</span>
              </div>
              <div className="grid grid-cols-6 gap-0.5 h-1.5">
                <div className="rounded bg-[#2F6E3E]" />
                <div className="rounded bg-[#2F6E3E]" />
                <div className="rounded bg-[#B87314]" />
                <div className="rounded bg-[#EDE6D9]" />
                <div className="rounded bg-[#EDE6D9]" />
                <div className="rounded bg-[#2F6E3E]/60" />
              </div>
              <div className="flex justify-between text-[9px] text-[#7E907C] font-mono">
                <span>6ص</span>
                <span>10ص</span>
                <span>6م</span>
              </div>
            </div>

            <div className="bg-[#FAF7F2] p-2 rounded-2xl border border-[#384536]/8 space-y-1">
              <div className="flex justify-between items-center text-[11px] font-bold text-[#576855]">
                <span>🛡️ {lang === 'ar' ? 'الجفاف' : 'Drought'}</span>
                <span className={`text-[9px] font-bold ${isShock ? 'text-[#A8382B]' : 'text-[#2F6E3E]'}`}>
                  {isShock ? '⚠️ تحذير' : '🟢 14 يوم'}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-0.5 h-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <div
                    key={d}
                    className={`rounded ${isShock && d <= 3 ? 'bg-[#A8382B]' : 'bg-[#384536]'}`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-[#7E907C]">
                <span>{lang === 'ar' ? 'اليوم' : 'Today'}</span>
                <span>{lang === 'ar' ? '+14يوم' : '+14d'}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </section>
  );
}