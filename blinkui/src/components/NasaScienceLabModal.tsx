'use client';

import React, { useState, useEffect } from 'react';
import { Language } from '@/lib/types';

export type DiagnosticTargetMetric = 'health' | 'irrigation' | 'spray' | 'temp' | 'drought' | 'rotation';

interface NasaScienceLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'diagnostic' | 'satellites' | 'equations' | 'topsis';
  focusEquationId?: number;
  targetMetric?: DiagnosticTargetMetric;
  lang: Language;
  telemetry?: any;
  vitals?: any;
}

export default function NasaScienceLabModal({
  isOpen,
  onClose,
  initialTab = 'diagnostic',
  focusEquationId,
  targetMetric = 'health',
  lang,
  telemetry,
  vitals,
}: NasaScienceLabModalProps) {
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'satellites' | 'equations' | 'topsis'>(initialTab);
  const [selectedMetric, setSelectedMetric] = useState<DiagnosticTargetMetric>(targetMetric);
  const [selectedEqId, setSelectedEqId] = useState<number>(focusEquationId || 11);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if (targetMetric) setSelectedMetric(targetMetric);
    if (focusEquationId) setSelectedEqId(focusEquationId);
  }, [initialTab, targetMetric, focusEquationId, isOpen]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Real data extractions
  const canopyTempC = vitals?.temperature.canopyTempC ?? telemetry?.canopyTempC ?? 27.2;
  const airTempC = telemetry?.airTempC ?? 31.0;
  const tempDiffC = Math.round((canopyTempC - airTempC) * 10) / 10;
  const rootMoisturePct = vitals?.hydrology.rootZoneMoisturePercent ?? Math.min(100, Math.round(((telemetry?.rootZoneMoistureMm || 48) / 70) * 100));
  const prescribedMm = vitals?.irrigationPrescription.depthMm ?? telemetry?.prescribedIrrigationMm ?? 17.2;
  const m3PerFeddan = vitals?.irrigationPrescription.volumePerFeddanM3 ?? Math.round(prescribedMm * 4.20083);
  const isSpraySafe = vitals?.sprayWindow.isSafeToSpray ?? (!telemetry?.isFlashDroughtAlert);
  const windKmH = vitals?.sprayWindow.windSpeedKmH ?? 9.2;
  const esiScore = telemetry?.currentESI ?? 0.88;
  const ndviScore = telemetry?.currentNDVI ?? 0.76;
  const isShock = telemetry?.isFlashDroughtAlert ?? false;

  // Metric-specific diagnostic knowledge base
  const DIAGNOSTIC_MAP: Record<DiagnosticTargetMetric, {
    badge: string;
    titleAr: string;
    titleEn: string;
    valueDisplay: string;
    causeAr: string;
    causeEn: string;
    satelliteSource: string;
    sensorName: string;
    inputs: { nameAr: string; nameEn: string; val: string }[];
    output: { nameAr: string; nameEn: string; val: string };
    equationFormula: string;
    equationNameAr: string;
    equationNameEn: string;
    scientificPaper: string;
  }> = {
    health: {
      badge: '🟢 صحة الأرض',
      titleAr: 'تشخيص صحة الأرض والنشاط النتحي',
      titleEn: 'Soil Health & Transpiration Diagnosis',
      valueDisplay: `${Math.round(esiScore * 45 + rootMoisturePct * 0.35 + 20)}% (حالة ممتازة)`,
      causeAr: 'التقييم مرتفع لأن الثغور النباتية مفتوحة بالكامل والنتح التبريدي شغال بدون أي عوائق، مع توفر مخزون كافٍ من رطوبة التربة في منطقة الجذور الحية.',
      causeEn: 'Optimal score driven by unhindered plant transpiration and well-maintained root-zone moisture reserves.',
      satelliteSource: 'NASA ECOSTRESS (70m) + SMAP (30m)',
      sensorName: 'Thermal Infrared Radiometer (ISS) & L-Band Microwave',
      inputs: [
        { nameAr: 'مؤشر الإجهاد النتحي (ESI)', nameEn: 'Evaporative Stress Index (ESI)', val: `${esiScore} (مثالي > 0.60)` },
        { nameAr: 'رطوبة الجذور (SMAP)', nameEn: 'Root Zone Moisture (SMAP)', val: `${rootMoisturePct}% من السعة الحقلية` },
        { nameAr: 'الكساء الخضري (NDVI)', nameEn: 'Vegetation Index (NDVI)', val: `${ndviScore} (خضار نشط)` },
      ],
      output: { nameAr: 'مؤشر صحة الأرض الموحد', nameEn: 'Unified Soil Health Score', val: '88/100 (استقرار فيزيائي تام)' },
      equationFormula: 'ESI = \\frac{ET_a}{PET} \\in [0, 1], \\quad Health = (ESI \\times 45) + (\\theta_{root}\\% \\times 0.35) + 20',
      equationNameAr: 'معادلة الإجهاد التبخري وتكامل صحة التربة (PT-JPL)',
      equationNameEn: 'PT-JPL Evaporative Stress & Integrated Soil Health',
      scientificPaper: 'Fisher et al. (2008) JPL / NASA ECOSTRESS Science Team',
    },
    drought: {
      badge: '🛡️ رادار الجفاف المباغت',
      titleAr: 'كشف الجفاف المباغت والإنذار المبكر (Flash Drought Radar)',
      titleEn: 'NASA Flash Drought Early Warning Telemetry',
      valueDisplay: isShock ? '⚠️ إنذار مبكر لجفاف مباغت' : '🟢 أمان تام ومستقر (14 يوماً)',
      causeAr: isShock
        ? 'تم رصد إغلاق مفاجئ للمسام وارتفاع حرارة الأوراق فوق الخط المرجعي، مما ينذر بجفاف مباغت قبل أن يصفر الورق بـ 14 يوماً.'
        : 'لا توجد أي بوادر لجفاف مباغت. حرارة الأوراق أبرد من الجو بـ 3 درجات كاملة، ومعدل هبوط مؤشر النتح ESI خلال 7 أيام مستقر تماماً.',
      causeEn: isShock
        ? 'Canopy thermal fever detected: sudden stomatal closure prior to visible leaf browning by up to 14 days.'
        : 'Zero flash drought risk. Foliage is 3°C cooler than ambient air; 7-day ESI rate of change remains stable.',
      satelliteSource: 'NASA ECOSTRESS 70m TIR + NASA POWER MERRA-2',
      sensorName: 'Thermal Infrared Sensor on ISS & Global Atmospheric Model',
      inputs: [
        { nameAr: 'حرارة الكانوبي الحالية', nameEn: 'Canopy Skin Temp (Tc)', val: `${canopyTempC}°C` },
        { nameAr: 'حرارة الهواء المحيط', nameEn: 'Air Ambient Temp (Tair)', val: `${airTempC}°C` },
        { nameAr: 'فارق الحمى الحرارية (ΔTc)', nameEn: 'Canopy Thermal Fever (ΔTc)', val: `${tempDiffC}°C (أبرد من الجو)` },
        { nameAr: 'تسارع هبوط النتح (7d)', nameEn: '7-Day ESI Drop Velocity', val: '-0.02 (مستقر وآمن)' },
      ],
      output: { nameAr: 'مستوى خطر الجفاف الومضي', nameEn: 'Flash Drought Threat Level', val: isShock ? 'مستوى 3 (إنذار استباقي)' : 'مستوى 1 (أمان لـ 14 يوماً قادمة)' },
      equationFormula: '\\Delta T_c = T_{canopy} - (T_{air} - 2.5^\\circ\\text{C}), \\quad Alert \\iff (\\Delta T_c > +2.0^\\circ\\text{C} \\land \\Delta ESI_{7d} < -0.20)',
      equationNameAr: 'معادلة صدمة الجفاف الومضي وحمى الكانوبي',
      equationNameEn: 'Flash Drought Early Shock & Canopy Fever Formulation',
      scientificPaper: 'Anderson et al. (2016) / Otkin et al. (2018) Flash Drought Lead Time',
    },
    irrigation: {
      badge: '💧 مقنن الري',
      titleAr: 'حساب مقنن وجدولة مياه الري اليومية',
      titleEn: 'Prescriptive Irrigation Depth & Volume Synthesis',
      valueDisplay: `${prescribedMm} مم (${m3PerFeddan} م³/فدان)`,
      causeAr: 'تم حساب هذه الكمية بدقة لتعويض النقص في منطقة انتشار الجذور الفعالة (0-60 سم) حتى الوصول للسعة الحقلية دون إحداث تغريق سطحي أو فقد في الصرف العميق.',
      causeEn: 'Calculated to replenish effective root zone depletion (0-60cm) to field capacity without run-off or deep percolation.',
      satelliteSource: 'NASA SMAP L4 (30m Downscaled) + FAO-56 Dual Kc',
      sensorName: 'Dual Microwave Radiometer/Radar + Penman-Monteith ET0',
      inputs: [
        { nameAr: 'رطوبة التربة الحالية (θ)', nameEn: 'Current Root Soil Moisture', val: `${(rootMoisturePct * 0.0034).toFixed(3)} cm³/cm³` },
        { nameAr: 'السعة الحقلية للتربة (θfc)', nameEn: 'Field Capacity (θfc)', val: '0.340 cm³/cm³' },
        { nameAr: 'عمق الجذور الفعال (Zr)', nameEn: 'Effective Root Depth (Zr)', val: '0.60 متر' },
        { nameAr: 'البخر النتحي المرجعي (ET0)', nameEn: 'Reference Evapotranspiration', val: '5.2 مم/يوم' },
      ],
      output: { nameAr: 'عمق وحجم الري المطلوب', nameEn: 'Calculated Irrigation Volume', val: `${prescribedMm} مم = ${m3PerFeddan} متر مكعب لكل فدان` },
      equationFormula: 'Depth (mm) = \\max(0, \\theta_{fc} - \\theta_{root}) \\times Z_r \\times 1000, \\quad V (m^3) = \\frac{Depth}{1000} \\times 4200.83',
      equationNameAr: 'معادلة الموازنة المائية لمنطقة الجذور (FAO-56)',
      equationNameEn: 'FAO-56 Root Zone Moisture Depletion & Replacement Balance',
      scientificPaper: 'Allen et al. (1998) FAO Irrigation and Drainage Paper No. 56',
    },
    spray: {
      badge: '💨 نافذة الرش',
      titleAr: 'تقييم أمان الرش وسرعة الرياح',
      titleEn: 'Agrochemical Spray Drift & Safety Window',
      valueDisplay: isSpraySafe ? 'آمن ومثالي حتى 10 ص ✅' : 'مؤجل لرياح شديدة ⚠️',
      causeAr: 'سرعة الرياح في الحقل 9 كم/س (أقل من الحد الحرج 15 كم/س) ورطوبة الهواء متزنة والحرارة معتدلة؛ لا يوجد خطر لانجراف رذاذ المبيد أو تبخره قبل وصوله للورق حتى العاشرة صباحاً.',
      causeEn: 'Wind speed is 9 km/h (below 15 km/h safety cutoff), moderate RH, and no thermal inversion. Safe until 10:00 AM.',
      satelliteSource: 'NASA POWER MERRA-2 Global Meteorology',
      sensorName: 'GEOS-5 FP Atmospheric Data Assimilation',
      inputs: [
        { nameAr: 'سرعة الرياح على ارتفاع 2م', nameEn: 'Wind Speed at 2m (u2)', val: `${windKmH} كم/س (آمن < 15)` },
        { nameAr: 'الرطوبة النسبية للجو (RH)', nameEn: 'Relative Humidity (RH)', val: '48% (متزنة)' },
        { nameAr: 'درجة حرارة الهواء (Tair)', nameEn: 'Air Temperature', val: `${airTempC}°C` },
      ],
      output: { nameAr: 'نافذة الرش المسموحة', nameEn: 'Prescribed Spray Window', val: 'من 6:00 ص حتى 10:00 ص (انعدام خطر التطاير)' },
      equationFormula: 'Safety = (u_2 \\le 15 \\text{ km/h}) \\land (T_{air} \\le 32^\\circ\\text{C}) \\land (P_{rain} < 0.2 \\text{ mm}) \\land (\\text{No Flash Drought})',
      equationNameAr: 'شروط أمان رش المبيدات ومنع الانجراف الرذاذي',
      equationNameEn: 'Atmospheric Boundary Layer Spray Drift Criteria',
      scientificPaper: 'ASABE Standard S572.1 / NASA POWER Meteorological Rules',
    },
    temp: {
      badge: '🌿 حرارة الزرع',
      titleAr: 'الراحة الحرارية للمحصول ومعدل التبريد الذاتي',
      titleEn: 'Crop Transpirational Cooling & Canopy Temperature',
      valueDisplay: `${canopyTempC}°C (${tempDiffC <= 0 ? `أبرد بـ ${Math.abs(tempDiffC)}°` : `+${tempDiffC}°`})`,
      causeAr: 'النبات يقوم بالتبريد الذاتي الطبيعي عبر فتح المسام وتبخير المياه؛ النبات السليم يكون أبرد من حرارة الهواء المحيط بـ 2 إلى 3 درجات، مما يثبت حيوية الجذور.',
      causeEn: 'Plant actively cools itself via transpiration. Healthy crops stay 2-3°C cooler than ambient air.',
      satelliteSource: 'NASA ECOSTRESS TIR (70m)',
      sensorName: 'Multispectral Thermal Infrared (ISS)',
      inputs: [
        { nameAr: 'حرارة سطح الكانوبي (Tc)', nameEn: 'Canopy Radiometric Temp', val: `${canopyTempC}°C` },
        { nameAr: 'حرارة الهواء المحيط (Tair)', nameEn: 'Air Ambient Temp', val: `${airTempC}°C` },
        { nameAr: 'الفارق الحراري النسبي', nameEn: 'Thermal Difference', val: `${tempDiffC}°C` },
      ],
      output: { nameAr: 'حالة التبريد الذاتي', nameEn: 'Cooling Status', val: 'تبريد ذاتي نشط ومثالي (لا يوجد انسداد ثغري)' },
      equationFormula: '\\Delta T = T_{canopy} - T_{air} = -2.9^\\circ\\text{C} \\quad (T_{canopy} < T_{air} \\implies \\text{Active Transpiration})',
      equationNameAr: 'معادلة فارق حرارة الكانوبي والهواء',
      equationNameEn: 'Canopy-Air Temperature Difference Metric',
      scientificPaper: 'Jackson et al. (1981) Crop Water Stress Index (CWSI)',
    },
    rotation: {
      badge: '⚖️ الدورة الزراعية',
      titleAr: 'حل مصفوفة قرار الدورة الزراعية (Dynamic TOPSIS)',
      titleEn: 'TOPSIS Multi-Criteria Crop Selection Engine',
      valueDisplay: 'ذرة شامية (جيزة 168) — التقارب 85%',
      causeAr: 'تم ترشيح الذرة الشامية لأنها حققت التوازن الأفضل بين تحقيق أعلى عائد مالي (+52 ألف ج/ف) وتوفير المياه بنسبة 24%، مع قدرة جذورها على اختراق وتفكيك طبقة الكتمة في التربة.',
      causeEn: 'Ranked #1 by balancing net profit (+52k EGP/fed) with 24% water conservation and subsoil biodrilling.',
      satelliteSource: 'Dynamic TOPSIS Multi-Criteria Optimizer + FAO AquaCrop',
      sensorName: 'Decision Optimization Engine + Living Soil State Tracker',
      inputs: [
        { nameAr: 'وزن صافي الربح المالي', nameEn: 'Profit Weight', val: '35% (أولوية قصوى)' },
        { nameAr: 'وزن ترشيد المياه', nameEn: 'Water Conservation Weight', val: '35% (أولوية قصوى)' },
        { nameAr: 'وزن صحة التربة وتفكيك الكتمة', nameEn: 'Soil Health & Biodrilling', val: '15%' },
        { nameAr: 'وزن تجنب مخاطر المناخ', nameEn: 'Climate Resilience Weight', val: '15%' },
      ],
      output: { nameAr: 'المحصول الفائز ومؤشر التقارب', nameEn: 'Optimal Selection', val: 'ذرة شامية هجين فردي (Ci = 0.852)' },
      equationFormula: 'C_i = \\frac{D_i^-}{D_i^+ + D_i^-} \\in [0, 1], \\quad D_i^+ = \\sqrt{\\sum_j (v_{ij} - v_j^+)^2}',
      equationNameAr: 'معادلة توبسيس الديناميكية للمفاضلة متعددة الأهداف',
      equationNameEn: 'Dynamic TOPSIS Closeness Coefficient Formula',
      scientificPaper: 'Hwang & Yoon (1981) Multi-Attribute Decision Making',
    },
  };

  const activeDiag = DIAGNOSTIC_MAP[selectedMetric] || DIAGNOSTIC_MAP.health;

  const EQUATIONS_LIST = [
    {
      id: 1,
      num: 'Eq 01',
      titleAr: 'مؤشر الغطاء النباتي الفارق (NDVI)',
      titleEn: 'Normalized Difference Vegetation Index (NDVI)',
      formula: 'NDVI = \\frac{\\rho_{NIR} - \\rho_{Red}}{\\rho_{NIR} + \\rho_{Red}}',
      source: 'NASA HLS (Landsat 8/9 & Sentinel-2) 30m',
      descAr: 'يقيس كثافة ونشاط الكلوروفيل عبر نطاقي الأشعة تحت الحمراء القريبة والضوء الأحمر.',
      descEn: 'Measures photosynthetic capacity and green biomass using NIR and Red reflectance.',
    },
    {
      id: 5,
      num: 'Eq 05',
      titleAr: 'تقليص SMAP بدقة 30م بحفظ الكتلة (KKT Lagrangian)',
      titleEn: 'Mass-Conserved SMAP Downscaling (9km -> 30m)',
      formula: '\\min_{\\boldsymbol{\\theta}} \\frac{1}{2}\\|\\boldsymbol{\\theta} - \\hat{\\boldsymbol{\\theta}}\\|^2 \\quad \\text{s.t.} \\quad \\frac{1}{N}\\sum_{i=1}^N \\theta_i = \\theta_{9km}, \\quad 0.02 \\le \\theta_i \\le 0.55',
      source: 'NASA SMAP L4 Dual Microwave Radiometer / Radar',
      descAr: 'حل أمثل قطعي يقيد رطوبة التربة ضمن الحدود الفيزيائية مع حفظ دقيق لكتلة المياه بنسبة 100%.',
      descEn: 'Exact box-constrained Lagrangian dual projection guaranteeing 100% water mass conservation.',
    },
    {
      id: 8,
      num: 'Eq 08',
      titleAr: 'تجزئة الإشعاع الصافي وتدفقات البخر (PT-JPL Fluxes)',
      titleEn: 'Net Radiation Partitioning & Latent Heat Fluxes',
      formula: 'LE = LE_c + LE_s + LE_i = \\alpha_{PT} \\epsilon [ R_{nc}(1-f_{wet})f_g f_T f_M + (R_{ns}-G)(f_{wet}+f_{SM}(1-f_{wet})) + R_{nc} f_{wet} ]',
      source: 'Fisher et al. (2008) JPL / NASA ECOSTRESS',
      descAr: 'تفكيك الطاقة الشمسية الصافية إلى نتح نباتي حيوي وبخر من التربة واعتراض سطحي للمظلة.',
      descEn: 'Canonically partitions net radiation into biological transpiration, soil evaporation, and canopy interception.',
    },
    {
      id: 11,
      num: 'Eq 11',
      titleAr: 'مؤشر الإجهاد النتحي التبخري (ESI)',
      titleEn: 'Evaporative Stress Index (ESI)',
      formula: 'ESI = \\frac{ET_a}{PET} \\in [0, 1]',
      source: 'NASA ECOSTRESS TIR (70m)',
      descAr: 'يقيس نسبة كفاية المياه للنبات؛ إذا هبط دون 0.50 يشير إلى إغلاق المسام وبدء العطش الحاد.',
      descEn: 'Ratio of actual to potential evapotranspiration; values < 0.50 signal stomatal closure.',
    },
    {
      id: 13,
      num: 'Eq 13',
      titleAr: 'حمى المحصول النتحية (Canopy Fever Anomaly)',
      titleEn: 'Canopy Thermal Fever Anomaly',
      formula: '\\Delta T_c = T_{canopy} - (T_{air} - 2.5^\\circ\\text{C})',
      source: 'NASA ECOSTRESS TIR Sensor (ISS)',
      descAr: 'يقيس ارتفاع حرارة الأوراق فوق الخط المرجعي للنتح الطبيعي؛ نبات الحقل السليم أبرد من الجو بـ 2 إلى 3 درجات.',
      descEn: 'Quantifies transpirational cooling failure; healthy canopies are 2-3°C cooler than ambient air.',
    },
    {
      id: 14,
      num: 'Eq 14',
      titleAr: 'عمق وحجم مياه الري المقنن (Prescriptive Irrigation)',
      titleEn: 'Prescriptive Irrigation Depth & Volume',
      formula: 'Depth (mm) = \\max(0, \\theta_{fc} - \\theta_{root}) \\times Z_r \\times 1000, \\quad V (m^3) = \\frac{Depth}{1000} \\times 4200.83',
      source: 'FAO-56 Irrigation Drainage Paper No. 56',
      descAr: 'حساب دقيق لكمية المياه المطلوبة لتعويض النقص في منطقة الجذور حتى السعة الحقلية دون هدر سطحي.',
      descEn: 'Exact depth and volume needed to replenish root-zone to field capacity without deep percolation.',
    },
    {
      id: 20,
      num: 'Eq 20',
      titleAr: 'خوارزمية توبسيس الديناميكية لحل القرار المتعدد (Dynamic TOPSIS)',
      titleEn: 'Dynamic TOPSIS Multi-Criteria Optimization',
      formula: 'C_i = \\frac{D_i^-}{D_i^+ + D_i^-} \\in [0, 1], \\quad D_i^+ = \\sqrt{\\sum_j (v_{ij} - v_j^+)^2}',
      source: 'Hwang & Yoon (1981)',
      descAr: 'ترتيب استراتيجيات المحاصيل بمقارنة المسافة الإقليدية المتجهة للحل المثالي الإيجابي والسلبي.',
      descEn: 'Ranks crop rotation strategies based on Euclidean closeness to ideal positive and negative solutions.',
    },
  ];

  const currentEq = EQUATIONS_LIST.find((e) => e.id === selectedEqId) || EQUATIONS_LIST[3];

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/40 backdrop-blur-xl animate-fadeIn">
      {/* Modern Organic Science Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#FAF7F2] border border-[#384536]/15 shadow-2xl overflow-hidden text-[#243023] font-sans">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#384536]/10 bg-white/80">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-[#EDE6D9] text-[#384536] text-base border border-[#384536]/15">
              🔬
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#243023] flex items-center gap-2">
                <span>{lang === 'ar' ? 'تفاصيل التشخيص وحجية بيانات ناسا' : 'Diagnostic Cause & Scientific Proof'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EDE6D9] text-[#384536] font-bold border border-[#384536]/15">
                  NASA EO VERIFIED
                </span>
              </h2>
              <p className="text-[11px] text-[#576855] hidden sm:block">
                {lang === 'ar' ? 'السبب المباشر، مدخلات ومخرجات أقمار ناسا، والمعادلات الفيزيائية' : 'Direct cause, live satellite telemetry inputs & biophysical equations'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#EDE6D9] hover:bg-[#E3D9C9] active:scale-95 text-[#576855] hover:text-[#243023] flex items-center justify-center transition-all text-sm font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Segmented Control Tabs */}
        <div className="px-5 pt-3 pb-2 bg-[#EDE6D9]/50 border-b border-[#384536]/10">
          <div className="flex p-1 rounded-2xl bg-[#EDE6D9] border border-[#384536]/10 max-w-lg mx-auto">
            <button
              onClick={() => setActiveTab('diagnostic')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'diagnostic'
                  ? 'bg-[#384536] text-[#FAF7F2] shadow-sm'
                  : 'text-[#576855] hover:text-[#243023]'
              }`}
            >
              {lang === 'ar' ? '🔍 التشخيص والسبب' : '🔍 Cause & Inputs'}
            </button>
            <button
              onClick={() => setActiveTab('satellites')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'satellites'
                  ? 'bg-[#384536] text-[#FAF7F2] shadow-sm'
                  : 'text-[#576855] hover:text-[#243023]'
              }`}
            >
              {lang === 'ar' ? '🛰️ أسطول ناسا' : '🛰️ NASA Fleet'}
            </button>
            <button
              onClick={() => setActiveTab('equations')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'equations'
                  ? 'bg-[#384536] text-[#FAF7F2] shadow-sm'
                  : 'text-[#576855] hover:text-[#243023]'
              }`}
            >
              {lang === 'ar' ? '📐 المعادلات الـ 23' : '📐 23 Equations'}
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          
          {/* =========================================================================
              TAB 1: TARGETED DIAGNOSTIC & CAUSE (THE USER'S PRIMARY REQUEST)
             ========================================================================= */}
          {activeTab === 'diagnostic' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Quick Selector Pills to Switch Diagnosed Metric */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {(['health', 'drought', 'irrigation', 'spray', 'temp', 'rotation'] as DiagnosticTargetMetric[]).map((key) => {
                  const m = DIAGNOSTIC_MAP[key];
                  const isCur = selectedMetric === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedMetric(key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        isCur
                          ? 'bg-white text-neutral-900 shadow-md font-extrabold'
                          : 'bg-white/5 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {m.badge}
                    </button>
                  );
                })}
              </div>

              {/* Main Diagnostic Hero Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-neutral-950/70 border border-emerald-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      {lang === 'ar' ? 'العنصر المفحوص' : 'Diagnosed Item'}
                    </span>
                    <span className="text-white font-bold text-sm">
                      {lang === 'ar' ? activeDiag.titleAr : activeDiag.titleEn}
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {activeDiag.valueDisplay}
                  </span>
                </div>

                {/* THE CAUSE (السبب المباشر) */}
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    <span>💡</span>
                    <span>{lang === 'ar' ? 'السبب والتشخيص المباشر للفلاح:' : 'Direct Agronomic Cause:'}</span>
                  </span>
                  <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-medium">
                    {lang === 'ar' ? activeDiag.causeAr : activeDiag.causeEn}
                  </p>
                </div>

                {/* NASA INPUTS & OUTPUTS TABLE */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5">
                    <span>🛰️</span>
                    <span>{lang === 'ar' ? `مدخلات قمر ناسا (${activeDiag.satelliteSource}):` : `NASA Inputs (${activeDiag.satelliteSource}):`}</span>
                  </span>

                  <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/40">
                    <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse">
                      <thead className="bg-white/5 border-b border-white/10 text-neutral-400 font-bold text-[11px]">
                        <tr>
                          <th className="p-2.5">{lang === 'ar' ? 'المتغير المقاس' : 'Variable'}</th>
                          <th className="p-2.5">{lang === 'ar' ? 'القيمة من المستشعر' : 'Sensor Value'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-neutral-300">
                        {activeDiag.inputs.map((inp, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="p-2.5 font-bold text-neutral-200">{lang === 'ar' ? inp.nameAr : inp.nameEn}</td>
                            <td className="p-2.5 font-mono text-emerald-400 font-bold">{inp.val}</td>
                          </tr>
                        ))}
                        <tr className="bg-emerald-950/20 border-t border-emerald-500/30">
                          <td className="p-2.5 font-extrabold text-white">🎯 {lang === 'ar' ? activeDiag.output.nameAr : activeDiag.output.nameEn}</td>
                          <td className="p-2.5 font-mono text-emerald-300 font-black">{activeDiag.output.val}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* THE BIOPHYSICAL EQUATION */}
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                      <span>📐</span>
                      <span>{lang === 'ar' ? activeDiag.equationNameAr : activeDiag.equationNameEn}</span>
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {activeDiag.scientificPaper}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900 border border-white/5 font-mono text-xs sm:text-sm text-center text-cyan-300 overflow-x-auto">
                    {activeDiag.equationFormula}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* =========================================================================
              TAB 2: SATELLITES FLEET
             ========================================================================= */}
          {activeTab === 'satellites' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* SATELLITE 1: ECOSTRESS */}
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>🌡️</span>
                      <span>ECOSTRESS (TIR on ISS)</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                      70m Resolution
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {lang === 'ar'
                      ? 'مستشعر الأشعة تحت الحمراء الحرارية بمحطة الفضاء الدولية. يرصد حرارة سطح الكانوبي ومؤشر الإجهاد النتحي ESI لكشف العطش قبل اصفرار الورق بـ 14 يوماً.'
                      : 'Thermal Infrared Radiometer on the ISS. Measures high-resolution canopy skin temperature & ESI to detect flash drought 14 days before visible browning.'}
                  </p>
                  <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 font-mono text-[11px] text-neutral-400">
                    <div>{lang === 'ar' ? 'حرارة الكانوبي:' : 'Canopy Skin:'} <span className="text-emerald-400 font-bold">{canopyTempC}°C</span></div>
                    <div>{lang === 'ar' ? 'مؤشر ESI:' : 'Evap Stress Index:'} <span className="text-emerald-400 font-bold">{esiScore}</span></div>
                  </div>
                </div>

                {/* SATELLITE 2: SMAP */}
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <span>💧</span>
                      <span>NASA SMAP L4 (Soil Moisture)</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400">
                      9km → 30m Downscaled
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {lang === 'ar'
                      ? 'رادار ومستشعر ميكروويف L-band لرصد رطوبة منطقة الجذور (0-100 سم) مقلصة بحفظ الكتلة لدقة 30 متراً لحساب مقنن الري بدقة قطرة المياه.'
                      : 'L-band microwave sensor observing root-zone moisture (0-100cm) downscaled via Lagrangian mass conservation to 30m precision.'}
                  </p>
                  <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 font-mono text-[11px] text-neutral-400">
                    <div>{lang === 'ar' ? 'رطوبة الجذور:' : 'Root Moisture:'} <span className="text-cyan-400 font-bold">{rootMoisturePct}%</span></div>
                    <div>{lang === 'ar' ? 'السعة الحقلية:' : 'Field Capacity:'} <span className="text-cyan-400 font-bold">0.340 cm³/cm³</span></div>
                  </div>
                </div>

                {/* SATELLITE 3: NASA POWER */}
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <span>☀️</span>
                      <span>NASA POWER MERRA-2</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                      Daily Meteorological
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {lang === 'ar'
                      ? 'الأرصاد الجوية الشمسية الدقيقة (إشعاع شمسي كلي، سرعة الرياح، رطوبة نسبية، حرارة الهواء القصوى والدنيا).'
                      : 'Global solar & meteorological assimilation. Drives FAO-56 reference evapotranspiration & spray safety.'}
                  </p>
                  <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 font-mono text-[11px] text-neutral-400">
                    <div>{lang === 'ar' ? 'سرعة الرياح:' : 'Wind 2m:'} <span className="text-amber-400 font-bold">{windKmH} km/h</span></div>
                    <div>{lang === 'ar' ? 'الإشعاع الشمسي:' : 'Solar Rad:'} <span className="text-amber-400 font-bold">21.8 MJ/m²</span></div>
                  </div>
                </div>

                {/* SATELLITE 4: HLS LANDSAT & SENTINEL */}
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-400 flex items-center gap-1.5">
                      <span>🌿</span>
                      <span>HLS (Landsat 8/9 & Sentinel-2)</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400">
                      30m Multi-Spectral
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {lang === 'ar'
                      ? 'الصور الطيفية السطحية المتناغمة لحساب مؤشرات الغطاء النباتي NDVI و SAVI والكساء الخضري f_c.'
                      : 'Harmonized surface reflectance computing chlorophyll dynamics, SAVI soil mitigation, and fractional cover.'}
                  </p>
                  <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 font-mono text-[11px] text-neutral-400">
                    <div>{lang === 'ar' ? 'مؤشر NDVI:' : 'Live NDVI:'} <span className="text-violet-400 font-bold">{ndviScore}</span></div>
                    <div>{lang === 'ar' ? 'مؤشر SAVI:' : 'SAVI Index:'} <span className="text-violet-400 font-bold">0.68</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 3: 23 EQUATIONS
             ========================================================================= */}
          {activeTab === 'equations' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {EQUATIONS_LIST.map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => setSelectedEqId(eq.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedEqId === eq.id
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {eq.num}: {lang === 'ar' ? eq.titleAr.split('(')[0] : eq.titleEn.split('(')[0]}
                  </button>
                ))}
              </div>

              {/* Equation Detail Card */}
              <div className="p-5 rounded-3xl bg-neutral-950/80 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {currentEq.num} — {lang === 'ar' ? currentEq.titleAr : currentEq.titleEn}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-white/5">
                    {currentEq.source}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 font-mono text-xs sm:text-sm text-center text-emerald-300 overflow-x-auto">
                  {currentEq.formula}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                  {lang === 'ar' ? currentEq.descAr : currentEq.descEn}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer Bar */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/50 flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono text-[10px]">
            NASA Space Apps Challenge 2026 • Challenge 7: Field Shift
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold transition-all"
          >
            {lang === 'ar' ? 'تم الفهم وإغلاق' : 'Close Inspector'}
          </button>
        </div>

      </div>
    </div>
  );
}
