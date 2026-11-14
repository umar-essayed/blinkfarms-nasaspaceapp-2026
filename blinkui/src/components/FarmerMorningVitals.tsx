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
  const [showDetailedGauges, setShowDetailedGauges] = useState(false);

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
    <section aria-label="Farm Daily Decisions" className="w-full space-y-4 font-sans select-none">
      
      {/* =========================================================================
          HERO STATUS CARD: CLEAN, SPACIOUS, UNCLUTTERED
         ========================================================================= */}
      <div className="rounded-3xl bg-white border border-[#384536]/10 p-5 sm:p-7 shadow-[0_4px_24px_rgba(56,69,54,0.04)] space-y-6">
        
        {/* Top Header: Health & Status Statement */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#384536]/8">
          <div className="flex items-center gap-4">
            {/* Health Activity Ring */}
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="#EDE6D9"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke={healthScore >= 75 ? '#384536' : healthScore >= 55 ? '#B87314' : '#A8382B'}
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="absolute font-mono font-black text-lg text-[#243023]">
                {healthScore}%
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#576855]">
                  {lang === 'ar' ? 'صحة المحصول والتربة' : 'Field Health'}
                </span>
                {onOpenScienceModal && (
                  <button
                    onClick={() => onOpenScienceModal('diagnostic', 11, 'health')}
                    className="text-[10px] text-[#576855] bg-[#EDE6D9] px-2 py-0.5 rounded-full hover:bg-[#384536] hover:text-white transition-colors"
                  >
                    {lang === 'ar' ? 'المعادلات' : 'Equations'}
                  </button>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#243023] mt-0.5">
                {healthScore >= 75
                  ? (lang === 'ar' ? 'حالة الحقل ممتازة ومستقرة' : 'Optimal Field Health')
                  : (lang === 'ar' ? 'الحقل تحت المراقبة' : 'Field Under Stress')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EDE6D9] text-xs font-bold text-[#384536]">
              <span className="w-2 h-2 rounded-full bg-[#2F6E3E] animate-pulse"></span>
              {lang === 'ar' ? 'أرصاد NASA متزامنة' : 'NASA Sync Active'}
            </span>
          </div>
        </div>

        {/* 3 Core Decisions: Generous Spacing, Clean Typography */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          
          {/* Card 1: Irrigation */}
          <div className="rounded-2xl bg-[#FAF7F2] p-4 border border-[#384536]/8 flex flex-col justify-between space-y-2 hover:border-[#384536]/20 transition-all">
            <div className="flex items-center justify-between text-xs font-bold text-[#576855]">
              <span className="flex items-center gap-1.5">
                <span>💧</span>
                <span>{lang === 'ar' ? 'قرار الري اليوم' : 'Irrigation Quota'}</span>
              </span>
              <span className="text-[10px] text-[#2F6E3E] bg-[#2F6E3E]/10 px-2 py-0.5 rounded-md">
                {lang === 'ar' ? '٦:٠٠ ص' : '6:00 AM'}
              </span>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#243023]">
                {m3PerFeddan}
                <span className="text-xs font-sans font-bold text-[#576855] mr-1.5 rtl:mr-1.5 rtl:ml-0">
                  {lang === 'ar' ? 'م³ / فدان' : 'm³ / fed'}
                </span>
              </div>
              <p className="text-[11px] text-[#7E907C] mt-0.5">
                {lang === 'ar' ? `يعادل عمق ${prescribedMm} ملم ري` : `Equals ${prescribedMm} mm depth`}
              </p>
            </div>
          </div>

          {/* Card 2: Spray Safety */}
          <div className="rounded-2xl bg-[#FAF7F2] p-4 border border-[#384536]/8 flex flex-col justify-between space-y-2 hover:border-[#384536]/20 transition-all">
            <div className="flex items-center justify-between text-xs font-bold text-[#576855]">
              <span className="flex items-center gap-1.5">
                <span>💨</span>
                <span>{lang === 'ar' ? 'نافذة الرش' : 'Spray Safety'}</span>
              </span>
              <span className="text-[10px] font-mono text-[#576855]">
                {windKmH} {lang === 'ar' ? 'كم/س' : 'km/h'}
              </span>
            </div>
            <div>
              <div className={`text-2xl sm:text-3xl font-black ${isSpraySafe ? 'text-[#2F6E3E]' : 'text-[#A8382B]'}`}>
                {isSpraySafe ? (lang === 'ar' ? 'آمن ومثالي' : 'Safe') : (lang === 'ar' ? 'مؤجل للرياح' : 'Delayed')}
              </div>
              <p className="text-[11px] text-[#7E907C] mt-0.5">
                {lang === 'ar' ? 'أفضل ميعاد حتى العاشرة صباحاً' : 'Optimal window until 10 AM'}
              </p>
            </div>
          </div>

          {/* Card 3: Canopy Temperature */}
          <div className="rounded-2xl bg-[#FAF7F2] p-4 border border-[#384536]/8 flex flex-col justify-between space-y-2 hover:border-[#384536]/20 transition-all">
            <div className="flex items-center justify-between text-xs font-bold text-[#576855]">
              <span className="flex items-center gap-1.5">
                <span>🌿</span>
                <span>{lang === 'ar' ? 'حرارة المجموع الخضري' : 'Canopy Temp'}</span>
              </span>
              <span className="text-[10px] text-[#2F6E3E] bg-[#2F6E3E]/10 px-2 py-0.5 rounded-md font-bold">
                {tempDiffC <= 0 ? (lang === 'ar' ? `أبرد ${Math.abs(tempDiffC)}°` : `${tempDiffC}°C`) : `+${tempDiffC}°C`}
              </span>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#243023]">
                {canopyTempC}°
                <span className="text-xs font-sans font-bold text-[#576855] mr-1.5 rtl:mr-1.5 rtl:ml-0">
                  {lang === 'ar' ? 'مئوية' : '°C'}
                </span>
              </div>
              <p className="text-[11px] text-[#7E907C] mt-0.5">
                {lang === 'ar' ? 'تبريد ذاتي نشط ومسامات مفتوحة' : 'Active transpiration cooling'}
              </p>
            </div>
          </div>

        </div>

        {/* Toggleable Deep Science Gauges (Keeps the screen clean by default!) */}
        <div className="pt-2 border-t border-[#384536]/8">
          <button
            onClick={() => setShowDetailedGauges(!showDetailedGauges)}
            className="w-full py-2 flex items-center justify-between text-xs font-bold text-[#576855] hover:text-[#243023] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span>📊</span>
              <span>{lang === 'ar' ? 'عرض تفاصيل الرطوبة وساعات الرش ورادار الجفاف' : 'Show Moisture & Climate Gauges'}</span>
            </span>
            <span className="text-[11px] font-semibold text-[#384536]">
              {showDetailedGauges ? (lang === 'ar' ? 'إخفاء ▲' : 'Hide ▲') : (lang === 'ar' ? 'توسيع ▼' : 'Expand ▼')}
            </span>
          </button>

          {showDetailedGauges && (
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn border-t border-[#384536]/8 mt-2">
              
              {/* Gauge 1: Root Moisture */}
              <div className="space-y-1.5 bg-[#FAF7F2] p-3 rounded-2xl border border-[#384536]/8">
                <div className="flex justify-between text-xs font-bold text-[#576855]">
                  <span>🌱 {lang === 'ar' ? 'رطوبة الجذور' : 'Root Moisture'}</span>
                  <span className="font-mono text-[#243023]">{rootMoisturePct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#EDE6D9] overflow-hidden">
                  <div className="h-full bg-[#384536] rounded-full" style={{ width: `${rootMoisturePct}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-[#7E907C]">
                  <span>عطش</span>
                  <span className="text-[#2F6E3E] font-bold">مثالي</span>
                  <span>تشبع</span>
                </div>
              </div>

              {/* Gauge 2: Spray Window */}
              <div className="space-y-1.5 bg-[#FAF7F2] p-3 rounded-2xl border border-[#384536]/8">
                <div className="flex justify-between text-xs font-bold text-[#576855]">
                  <span>💨 {lang === 'ar' ? 'شريط الرش' : 'Spray Hours'}</span>
                  <span className="text-[#2F6E3E] text-[10px] font-bold">حتى 10 ص</span>
                </div>
                <div className="grid grid-cols-6 gap-1 h-2">
                  <div className="rounded bg-[#2F6E3E]" />
                  <div className="rounded bg-[#2F6E3E]" />
                  <div className="rounded bg-[#B87314]" />
                  <div className="rounded bg-[#EDE6D9]" />
                  <div className="rounded bg-[#EDE6D9]" />
                  <div className="rounded bg-[#2F6E3E]/60" />
                </div>
                <div className="flex justify-between text-[10px] text-[#7E907C] font-mono">
                  <span>6 ص</span>
                  <span>10 ص</span>
                  <span>6 م</span>
                </div>
              </div>

              {/* Gauge 3: Flash Drought */}
              <div className="space-y-1.5 bg-[#FAF7F2] p-3 rounded-2xl border border-[#384536]/8">
                <div className="flex justify-between text-xs font-bold text-[#576855]">
                  <span>🛡️ {lang === 'ar' ? 'رادار الجفاف' : 'Drought'}</span>
                  <span className={`text-[10px] font-bold ${isShock ? 'text-[#A8382B]' : 'text-[#2F6E3E]'}`}>
                    {isShock ? 'تحذير ⚠️' : 'أمان 14 يوم 🟢'}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1 h-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <div
                      key={d}
                      className={`rounded ${isShock && d <= 3 ? 'bg-[#A8382B]' : 'bg-[#384536]'}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-[#7E907C]">
                  <span>اليوم</span>
                  <span>+14 يوم</span>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

    </section>
  );
}