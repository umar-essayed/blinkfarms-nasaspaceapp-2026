'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotationStrategy, RotationSeason, Language } from '@/lib/types';

interface CropRotationPlannerProps {
  strategies: RotationStrategy[];
  selectedStrategyId: 'balanced' | 'water_saving' | 'current';
  onSelectStrategy: (id: 'balanced' | 'water_saving' | 'current') => void;
  areaFeddan: number;
  fieldName: string;
  lang: Language;
  onOpenWizard?: () => void;
  onOpenScienceModal?: (tab?: 'diagnostic' | 'satellites' | 'equations' | 'topsis', eqId?: number, targetMetric?: any) => void;
  whatIfWaterCutPercent?: number;
  setWhatIfWaterCutPercent?: (val: number) => void;
  whatIfHeatwaveC?: number;
  setWhatIfHeatwaveC?: (val: number) => void;
}

export default function CropRotationPlanner({
  strategies,
  selectedStrategyId,
  onSelectStrategy,
  areaFeddan,
  fieldName,
  lang,
  onOpenWizard,
  onOpenScienceModal,
  whatIfWaterCutPercent = 0,
  setWhatIfWaterCutPercent,
  whatIfHeatwaveC = 0,
  setWhatIfHeatwaveC,
}: CropRotationPlannerProps) {
  const router = useRouter();
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState<number>(0);

  const activeStrategy =
    strategies.find((s) => s.id === selectedStrategyId) || strategies[0];

  // Flatten all seasons sequentially
  const allSeasons: { season: RotationSeason; yearNum: number; seasonType: 'winter' | 'summer'; index: number }[] = [];
  let globalSeasonIdx = 0;
  activeStrategy?.years?.forEach((y) => {
    if (y.seasons?.[0]) {
      allSeasons.push({ season: y.seasons[0], yearNum: y.year, seasonType: 'winter', index: globalSeasonIdx++ });
    }
    if (y.seasons?.[1]) {
      allSeasons.push({ season: y.seasons[1], yearNum: y.year, seasonType: 'summer', index: globalSeasonIdx++ });
    }
  });

  const nextSeason = allSeasons[0]?.season;
  const recommendedCropName = lang === 'ar' ? (nextSeason?.crop.nameAr || 'ذرة شامية') : (nextSeason?.crop.nameEn || 'White Maize');
  const cultivarName = lang === 'ar'
    ? (nextSeason?.selectedCultivar?.nameAr || nextSeason?.crop.egyptianProfile?.certifiedCultivars?.[0]?.nameAr || 'هجين معتمد')
    : (nextSeason?.selectedCultivar?.nameEn || nextSeason?.crop.egyptianProfile?.certifiedCultivars?.[0]?.nameEn || 'Certified Hybrid');

  const cropId = nextSeason?.crop.id?.toLowerCase() || '';
  const cropEmoji =
    cropId.includes('corn') || cropId.includes('maize') ? '🌽' :
    cropId.includes('wheat') ? '🌾' :
    cropId.includes('beet') ? '🥔' :
    cropId.includes('sorghum') || cropId.includes('panicum') ? '🌾' :
    cropId.includes('barley') ? '🌾' :
    cropId.includes('bean') || cropId.includes('clover') || cropId.includes('alfalfa') ? '🌱' :
    cropId.includes('sunflower') ? '🌻' :
    cropId.includes('soybean') ? '🫘' : '🌿';

  const totalEgpPerFeddan = Math.round((activeStrategy?.totalNetProfitUsdHa || 2400) * (49 / 2.3809));
  const profitPerFeddanK = (totalEgpPerFeddan / 1000).toFixed(0);
  const waterSavedPct = Math.min(100, Math.max(0, activeStrategy?.totalWaterSavedPercent || 0));
  const soilHealthScore = activeStrategy?.soilHealthIndexScore || 88;

  const agronomicVerdict = lang === 'ar'
    ? selectedStrategyId === 'water_saving'
      ? 'أفضل خيار للصمود المائي ويوفر 35% من مياه الري بدون إجهاد للمحصول.'
      : selectedStrategyId === 'current'
      ? 'تكرار نفس المحصول يستنزف خصوبة الأرض ويرفع تكلفة التسميد 40%.'
      : 'يعوّض مخزون نيتروجين الأرض، ويفكك الطبقات المنضغطة بأعلى عائد مالي.'
    : selectedStrategyId === 'water_saving'
    ? 'Maximizes water resilience, saving 35% irrigation with zero crop stress.'
    : selectedStrategyId === 'current'
    ? 'Continuous monoculture depletes soil nutrients and raises fertilizer costs.'
    : 'Fixes bio-nitrogen, loosens subsoil compaction, and secures top profit.';

  // Selected season blueprint details
  const currentInspectSeason = allSeasons[selectedSeasonIdx] || allSeasons[0];
  const inspectCrop = currentInspectSeason?.season?.crop;
  const inspectProfile = inspectCrop?.egyptianProfile;
  const inspectCultivar = lang === 'ar'
    ? (currentInspectSeason?.season?.selectedCultivar?.nameAr || inspectProfile?.certifiedCultivars?.[0]?.nameAr || 'صنف معتمد')
    : (currentInspectSeason?.season?.selectedCultivar?.nameEn || inspectProfile?.certifiedCultivars?.[0]?.nameEn || 'Certified Seed');
  const inspectCropName = lang === 'ar' ? (inspectCrop?.nameAr || 'محصول الحقل') : (inspectCrop?.nameEn || 'Crop');

  const handleAskAgronomist = (customCropName?: string, customCultivar?: string) => {
    const targetCrop = customCropName || recommendedCropName;
    const targetCultivar = customCultivar || cultivarName;
    const promptText = lang === 'ar'
      ? `يا باشمهندس، النظام رشحلي زراعة ${targetCrop} (${targetCultivar}) لأرضي في ${fieldName} (${areaFeddan} فدان). قولي إيه أنسب ميعاد لبدر التقاوي وبرنامج التسميد والري؟`
      : `Based on the smart rotation recommendation for my farm in ${fieldName} (${areaFeddan} feddans), the system suggested ${targetCrop} (${targetCultivar}). What are the optimal sowing window, fertilizer schedule, and water quota?`;

    router.push(`/chat?prompt=${encodeURIComponent(promptText)}&crop=${encodeURIComponent(targetCrop)}`);
  };

  return (
    <section aria-label="Crop Rotation" className="w-full space-y-6 font-sans select-none pb-12">

      {/* =========================================================================
          1. CLEAN TOP STRIP: STRATEGY SWITCHER (AIRY & SIMPLE)
         ========================================================================= */}
      <div className="rounded-3xl bg-white border border-[#384536]/10 p-4 sm:p-5 shadow-[0_4px_24px_rgba(56,69,54,0.04)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#243023] flex items-center gap-1.5">
                <span>🔄</span>
                <span>{lang === 'ar' ? 'الدورة الزراعية الذكية' : 'Crop Succession'}</span>
              </h2>
              <span className="text-xs font-bold text-[#384536] bg-[#EDE6D9] px-2.5 py-0.5 rounded-full">
                {fieldName} • {areaFeddan} {lang === 'ar' ? 'فدان' : 'fed'}
              </span>
            </div>
            <p className="text-xs text-[#7E907C] mt-0.5">
              {lang === 'ar' ? 'خطط تعاقب المحاصيل المحسوبة بناءً على أرصاد ناسا وخصائص تربتك' : 'Succession plans modeled from NASA observations & soil state'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Strategy Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#EDE6D9] border border-[#384536]/10">
              {[
                { id: 'balanced', labelAr: 'متوازن ⚖️', labelEn: 'Balanced' },
                { id: 'water_saving', labelAr: 'موفّر 💧', labelEn: 'Water' },
                { id: 'current', labelAr: 'معتاد 🔄', labelEn: 'Standard' },
              ].map((strat) => {
                const isSelected = selectedStrategyId === strat.id;
                return (
                  <button
                    key={strat.id}
                    onClick={() => onSelectStrategy(strat.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#384536] text-[#FAF7F2] shadow-sm'
                        : 'text-[#576855] hover:text-[#243023]'
                    }`}
                  >
                    {lang === 'ar' ? strat.labelAr : strat.labelEn}
                  </button>
                );
              })}
            </div>

            {/* Re-Tune Wizard Button */}
            {onOpenWizard && (
              <button
                onClick={onOpenWizard}
                className="p-2 rounded-2xl bg-[#EDE6D9] hover:bg-[#384536] hover:text-[#FAF7F2] text-[#243023] text-xs font-bold transition-all shrink-0 active:scale-95 shadow-xs"
                title={lang === 'ar' ? 'تعديل محددات الأرض ونوع التربة' : 'Reconfigure Soil & Preferences'}
              >
                ⚙️
              </button>
            )}
          </div>
        </div>

        {/* Optional Climate Stress Test Pills */}
        {(setWhatIfWaterCutPercent && setWhatIfHeatwaveC) && (
          <div className="pt-3 border-t border-[#384536]/8 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#576855] font-bold text-xs shrink-0">
              🧪 {lang === 'ar' ? 'اختبار الصمود المناخي:' : 'Climate Test:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  setWhatIfWaterCutPercent(0);
                  setWhatIfHeatwaveC(0);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  whatIfWaterCutPercent === 0 && whatIfHeatwaveC === 0
                    ? 'bg-[#384536] text-[#FAF7F2]'
                    : 'bg-[#FAF7F2] text-[#576855] border border-[#384536]/10 hover:text-[#243023]'
                }`}
              >
                {lang === 'ar' ? 'معتدل 🌤️' : 'Baseline'}
              </button>

              <button
                onClick={() => setWhatIfWaterCutPercent(whatIfWaterCutPercent > 0 ? 0 : 25)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  whatIfWaterCutPercent > 0
                    ? 'bg-[#2F6E3E] text-white shadow-sm'
                    : 'bg-[#FAF7F2] text-[#576855] border border-[#384536]/10 hover:text-[#243023]'
                }`}
              >
                {lang === 'ar' ? 'نقص مياه 25% 💧' : '-25% Water'}
              </button>

              <button
                onClick={() => setWhatIfHeatwaveC(whatIfHeatwaveC > 0 ? 0 : 3.0)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  whatIfHeatwaveC > 0
                    ? 'bg-[#A8382B] text-white shadow-sm'
                    : 'bg-[#FAF7F2] text-[#576855] border border-[#384536]/10 hover:text-[#243023]'
                }`}
              >
                {lang === 'ar' ? 'موجة حارة 🔥' : 'Heatwave'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          2. HERO RECOMMENDATION CARD: BEAUTIFUL, CLEAN & AIRY
         ========================================================================= */}
      <div className="rounded-3xl bg-white border border-[#384536]/10 p-5 sm:p-7 shadow-[0_4px_24px_rgba(56,69,54,0.04)] space-y-6">
        
        {/* Header: Recommended Crop with Icon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF7F2] border border-[#384536]/10 flex items-center justify-center text-4xl shadow-xs shrink-0">
              {cropEmoji}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#384536]">
                  {lang === 'ar' ? 'المحصول المرشح للعروة القادمة' : 'Next Recommended Crop'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDE6D9] text-[#576855]">
                  {allSeasons[0]?.seasonType === 'winter' ? (lang === 'ar' ? 'عروة شتوية ❄️' : 'Winter') : (lang === 'ar' ? 'عروة صيفية ☀️' : 'Summer')}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-[#243023] mt-0.5">
                {recommendedCropName}
              </h3>
              <p className="text-xs text-[#7E907C] font-semibold mt-0.5">
                {cultivarName} • {areaFeddan} {lang === 'ar' ? 'فدان' : 'feddans'}
              </p>
            </div>
          </div>

          {/* Quick Rationale Callout */}
          <div className="max-w-xs text-xs text-[#576855] bg-[#FAF7F2] p-3 rounded-2xl border border-[#384536]/8 leading-relaxed">
            <span className="font-bold text-[#384536] block mb-0.5">💡 {lang === 'ar' ? 'سبب الترشيح:' : 'Why:'}</span>
            {agronomicVerdict}
          </div>
        </div>

        {/* 3 Metric Pillars: Spacious & Uncluttered */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
          
          <div className="rounded-2xl bg-[#FAF7F2] p-4 border border-[#384536]/8 space-y-1">
            <span className="text-xs font-bold text-[#576855] block">💰 {lang === 'ar' ? 'صافي الربح المتوقع' : 'Estimated Profit'}</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#2F6E3E]">
              +{profitPerFeddanK}k
              <span className="text-xs font-sans font-bold text-[#576855] mr-1.5 rtl:mr-1.5 rtl:ml-0">
                {lang === 'ar' ? 'ج/فدان' : 'EGP/fed'}
              </span>
            </div>
            <p className="text-[11px] text-[#7E907C]">
              {lang === 'ar' ? `إجمالي ~${Math.round(Number(profitPerFeddanK) * areaFeddan)} ألف ج للمزرعة` : `Farm ~${Math.round(Number(profitPerFeddanK) * areaFeddan)}k EGP`}
            </p>
          </div>

          <div className="rounded-2xl bg-[#FAF7F2] p-4 border border-[#384536]/8 space-y-1">
            <span className="text-xs font-bold text-[#576855] block">💧 {lang === 'ar' ? 'ترشيد المياه' : 'Water Saved'}</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#384536]">
              {waterSavedPct > 0 ? (lang === 'ar' ? `وفر ${waterSavedPct}%` : `Save ${waterSavedPct}%`) : (lang === 'ar' ? 'معتاد' : 'Standard')}
            </div>
            <p className="text-[11px] text-[#7E907C]">
              {waterSavedPct > 0 ? (lang === 'ar' ? `وفر ${activeStrategy?.totalWaterSavedM3Feddan || 750} م³/فدان` : `Saves ${activeStrategy?.totalWaterSavedM3Feddan || 750} m³/fed`) : (lang === 'ar' ? 'استهلاك طبيعي' : 'Baseline')}
            </p>
          </div>

          <div className="rounded-2xl bg-[#FAF7F2] p-4 border border-[#384536]/8 space-y-1">
            <span className="text-xs font-bold text-[#576855] block">🌱 {lang === 'ar' ? 'مؤشر خصوبة التربة' : 'Soil Health'}</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#384536]">
              {soilHealthScore}%
            </div>
            <p className="text-[11px] text-[#7E907C]">
              {lang === 'ar' ? 'تفكيك الكتمة وزيادة الخصوبة' : 'Soil aeration & bio-N'}
            </p>
          </div>

        </div>

        {/* CTAs: Consult Advisor + NASA Math */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => handleAskAgronomist()}
            className="sm:col-span-3 py-3.5 px-6 rounded-2xl bg-[#384536] hover:bg-[#253024] active:scale-[0.99] text-[#FAF7F2] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>💬</span>
            <span>{lang === 'ar' ? `استشر المرشد الذكي في زراعة ${recommendedCropName}` : `Consult AI on Planting ${recommendedCropName}`}</span>
            <span>➔</span>
          </button>

          {onOpenScienceModal && (
            <button
              onClick={() => onOpenScienceModal('topsis')}
              className="py-3.5 px-4 rounded-2xl bg-[#EDE6D9] hover:bg-[#E3D9C9] text-[#384536] text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
              title={lang === 'ar' ? 'النموذج الرياضي TOPSIS' : 'TOPSIS Model'}
            >
              <span>🔬</span>
              <span>{lang === 'ar' ? 'نموذج ناسا' : 'NASA Math'}</span>
            </button>
          )}
        </div>

      </div>

      {/* =========================================================================
          3. INTERACTIVE 3-YEAR / 6-SEASON ROADMAP & CROP BLUEPRINT
         ========================================================================= */}
      <div className="rounded-3xl bg-white border border-[#384536]/10 p-5 sm:p-6 shadow-[0_4px_24px_rgba(56,69,54,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#243023] flex items-center gap-2">
              <span>📅</span>
              <span>{lang === 'ar' ? 'خطة تعاقب المحاصيل لـ ٣ سنوات (٦ مواسم)' : '3-Year Succession Roadmap (6 Seasons)'}</span>
            </h3>
            <p className="text-xs text-[#7E907C] mt-0.5">
              {lang === 'ar' ? 'اضغط على أي عروة للاطلاع على دليل التسميد، التقاوي، ومواعيد الزراعة' : 'Click any season to view sowing dates, cultivars & fertilizer plan'}
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#384536] bg-[#EDE6D9] px-2.5 py-1 rounded-full self-start sm:self-auto">
            {lang === 'ar' ? 'مبني على خوارزمية TOPSIS' : 'TOPSIS Engine'}
          </span>
        </div>

        {/* 3 Years Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {activeStrategy?.years?.map((yr) => {
            const winterSeason = yr.seasons?.[0];
            const summerSeason = yr.seasons?.[1];
            const winterIdx = allSeasons.findIndex(s => s.season === winterSeason);
            const summerIdx = allSeasons.findIndex(s => s.season === summerSeason);

            const isWinterSelected = selectedSeasonIdx === winterIdx;
            const isSummerSelected = selectedSeasonIdx === summerIdx;

            const winterName = lang === 'ar' ? (winterSeason?.crop.nameAr || 'محصول شتوي') : (winterSeason?.crop.nameEn || 'Winter Crop');
            const summerName = lang === 'ar' ? (summerSeason?.crop.nameAr || 'محصول صيفي') : (summerSeason?.crop.nameEn || 'Summer Crop');

            return (
              <div
                key={yr.year}
                className="p-3.5 rounded-2xl border border-[#384536]/10 bg-[#FAF7F2] space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] bg-[#384536] text-[#FAF7F2]">
                    {lang === 'ar' ? `السنة ${yr.year}` : `Year ${yr.year}`}
                  </span>
                  <span className="font-mono text-[#2F6E3E]">
                    +{Math.round((yr.netIncomeUsdHa || 800) * (49 / 2.3809) / 1000)}k {lang === 'ar' ? 'ج/ف' : 'EGP/fed'}
                  </span>
                </div>

                {/* Season Buttons */}
                <div className="space-y-1.5 text-xs">
                  {winterSeason && (
                    <button
                      onClick={() => setSelectedSeasonIdx(winterIdx)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-start transition-all ${
                        isWinterSelected
                          ? 'bg-[#384536] text-[#FAF7F2] border-[#384536] shadow-sm font-bold'
                          : 'bg-white hover:bg-[#EDE6D9]/50 text-[#243023] border-[#384536]/10'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>❄️</span>
                        <span>{winterName}</span>
                      </span>
                      <span className={`text-[10px] ${isWinterSelected ? 'text-[#EDE6D9]' : 'text-[#7E907C]'}`}>
                        {lang === 'ar' ? 'شتوي' : 'Winter'}
                      </span>
                    </button>
                  )}

                  {summerSeason && (
                    <button
                      onClick={() => setSelectedSeasonIdx(summerIdx)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-start transition-all ${
                        isSummerSelected
                          ? 'bg-[#384536] text-[#FAF7F2] border-[#384536] shadow-sm font-bold'
                          : 'bg-white hover:bg-[#EDE6D9]/50 text-[#243023] border-[#384536]/10'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>☀️</span>
                        <span>{summerName}</span>
                      </span>
                      <span className={`text-[10px] ${isSummerSelected ? 'text-[#EDE6D9]' : 'text-[#7E907C]'}`}>
                        {lang === 'ar' ? 'صيفي' : 'Summer'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Season Detail Blueprint Card */}
        {currentInspectSeason && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#EDE6D9]/50 border border-[#384536]/15 space-y-3.5 mt-2 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#384536]/10 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#7E907C] block uppercase tracking-wider">
                  {lang === 'ar' ? 'الدليل الإرشادي للعروة المختارة' : 'Agronomic Blueprint'}
                </span>
                <h4 className="text-base sm:text-lg font-black text-[#243023] flex items-center gap-2">
                  <span>{currentInspectSeason.seasonType === 'winter' ? '❄️' : '☀️'}</span>
                  <span>{inspectCropName}</span>
                  <span className="text-xs font-bold text-[#384536] bg-white px-2.5 py-0.5 rounded-full border border-[#384536]/10">
                    {inspectCultivar}
                  </span>
                </h4>
              </div>

              <button
                onClick={() => handleAskAgronomist(inspectCropName, inspectCultivar)}
                className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#384536] hover:bg-[#253024] text-[#FAF7F2] text-xs font-bold active:scale-95 transition-all shadow-xs"
              >
                {lang === 'ar' ? `استشر المرشد في ${inspectCropName} ➔` : `Ask Advisor ➔`}
              </button>
            </div>

            {/* 4 Pillars of Agronomic Blueprint */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-white border border-[#384536]/10 space-y-1">
                <span className="text-[10px] font-bold text-[#7E907C] block">📅 {lang === 'ar' ? 'ميعاد الزراعة' : 'Sowing Window'}</span>
                <span className="font-bold text-[#243023] block leading-tight">
                  {lang === 'ar' ? (inspectProfile?.sowingWindows?.deltaAr || 'منتصف الموسم') : (inspectProfile?.sowingWindows?.optimalRangeEn || 'Mid Season')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#384536]/10 space-y-1">
                <span className="text-[10px] font-bold text-[#7E907C] block">🌾 {lang === 'ar' ? 'أفضل صنف معتمد' : 'Certified Seeds'}</span>
                <span className="font-bold text-[#384536] block leading-tight">
                  {inspectCultivar}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#384536]/10 space-y-1">
                <span className="text-[10px] font-bold text-[#7E907C] block">💧 {lang === 'ar' ? 'المقنن المائي' : 'Water Need'}</span>
                <span className="font-bold text-[#243023] block leading-tight">
                  ~{currentInspectSeason.season ? Math.round(currentInspectSeason.season.seasonalWaterNeedM3Ha / 2.38) : 2400} {lang === 'ar' ? 'م³/فدان' : 'm³/fed'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#384536]/10 space-y-1">
                <span className="text-[10px] font-bold text-[#7E907C] block">🌱 {lang === 'ar' ? 'التسميد والتربة' : 'Soil Impact'}</span>
                <span className="font-bold text-[#2F6E3E] block leading-tight">
                  {currentInspectSeason.season?.soilNitrogenDeltaKgHa && currentInspectSeason.season.soilNitrogenDeltaKgHa > 0
                    ? `+${currentInspectSeason.season.soilNitrogenDeltaKgHa} ${lang === 'ar' ? 'كجم N/هكتار' : 'kg N/ha'}`
                    : currentInspectSeason.season?.ureaBagsSavedPerFeddan && currentInspectSeason.season.ureaBagsSavedPerFeddan > 0
                    ? (lang === 'ar' ? `وفر ${currentInspectSeason.season.ureaBagsSavedPerFeddan} شيكارة يوريا` : `Saves ${currentInspectSeason.season.ureaBagsSavedPerFeddan} urea bags`)
                    : (lang === 'ar' ? 'وفر تسميدي متوازن' : 'Balanced Fertility')}
                </span>
              </div>
            </div>

            {/* Transition Reason callout */}
            {currentInspectSeason.season?.transitionReasonAr && (
              <p className="text-xs text-[#576855] bg-white p-2.5 rounded-xl border border-[#384536]/8 leading-relaxed">
                <span className="font-bold text-[#384536]">💡 {lang === 'ar' ? 'الأثر الزراعي:' : 'Agronomic Impact:'}</span>{' '}
                {lang === 'ar' ? currentInspectSeason.season.transitionReasonAr : currentInspectSeason.season.transitionReasonEn}
              </p>
            )}
          </div>
        )}
      </div>

    </section>
  );
}
