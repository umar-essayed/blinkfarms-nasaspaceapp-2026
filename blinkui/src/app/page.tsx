'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Language,
  FieldMemoryState,
  UnifiedFarmVitals,
  FlashDroughtTelemetry,
  RotationStrategy,
} from '@/lib/types';
import { DailyWeatherObservation } from '@/lib/provenanceTypes';
import {
  DEMO_FIELDS,
  FieldPreset,
  deriveFieldMemoryFromCoords,
  DEFAULT_PRIORITIES,
  UserPriorities,
} from '@/lib/fieldPresets';
import {
  generateFieldTelemetry,
  buildUnifiedFarmVitals,
} from '@/lib/veloceRootEngine';
import { simulateRotationStrategies } from '@/lib/fieldShiftEngine';
import {
  fetchTelemetryFromPython,
  fetchSimulationFromPython,
} from '@/lib/pythonBridgeClient';
import FarmSetupGateway from '@/components/FarmSetupGateway';
import AgronomicWizard, { WizardAnswers } from '@/components/AgronomicWizard';
import ProfileModal from '@/components/ProfileModal';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import { UserProfile } from '@/components/AuthGateway';
import FarmerMorningVitals from '@/components/FarmerMorningVitals';
import CropRotationPlanner from '@/components/CropRotationPlanner';
import NasaScienceLabModal from '@/components/NasaScienceLabModal';
import {
  LightningIcon,
  RefreshIcon,
  MessageCircleIcon,
} from '@/components/Icons';

// Dynamically import Clean Leaflet Satellite Map
const SplitFieldMap = dynamic(() => import('@/components/SplitFieldMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[16/9] min-h-[220px] max-h-[520px] rounded-3xl bg-neutral-900 animate-pulse flex flex-col items-center justify-center text-xs font-semibold text-neutral-400 gap-2">
      <span className="text-3xl animate-spin">🛰️</span>
      <span>تحميل خريطة الأقمار الصناعية...</span>
    </div>
  ),
});

export default function BlinkFarmsApp() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'radar' | 'rotation'>('radar');

  // Application Flow State
  const [appStep, setAppStep] = useState<'farm_setup' | 'dashboard'>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Field Location State (Default: Nile Delta, Egypt)
  const [currentLat, setCurrentLat] = useState<number>(30.850);
  const [currentLon, setCurrentLon] = useState<number>(31.050);
  const [currentFieldName, setCurrentFieldName] = useState<string>('دلتا النيل (طنطا / الغربية)');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('nile_delta');
  const [currentAreaFeddan, setCurrentAreaFeddan] = useState<number>(15);
  const [customPolygon, setCustomPolygon] = useState<[number, number][] | null>(null);

  const activePreset = useMemo(() => {
    return DEMO_FIELDS.find(p => p.id === selectedPresetId);
  }, [selectedPresetId]);

  const activePolygonBoundary = useMemo(() => {
    if (selectedPresetId !== 'custom') {
      return activePreset?.polygonBoundary;
    }
    if (customPolygon && customPolygon.length >= 3) {
      return customPolygon;
    }
    return undefined;
  }, [selectedPresetId, activePreset, customPolygon]);

  const displayFieldName = useMemo(() => {
    if (selectedPresetId !== 'custom' && activePreset) {
      return lang === 'ar' ? activePreset.nameAr : activePreset.nameEn;
    }
    if (selectedPresetId === 'custom') {
      if (currentFieldName.includes('قطعة محددة') || currentFieldName.includes('Custom Parcel')) {
        return lang === 'ar' ? `قطعة محددة (${currentAreaFeddan} فدان)` : `Custom Parcel (${currentAreaFeddan} fed)`;
      }
      if (currentFieldName.startsWith('حقل (') || currentFieldName.startsWith('Field (')) {
        return lang === 'ar'
          ? `حقل (${currentLat.toFixed(2)}°, ${currentLon.toFixed(2)}°)`
          : `Field (${currentLat.toFixed(2)}°, ${currentLon.toFixed(2)}°)`;
      }
    }
    return currentFieldName;
  }, [selectedPresetId, activePreset, lang, currentFieldName, currentAreaFeddan, currentLat, currentLon]);

  // Agronomic Rotation Wizard State
  const [isWizardCompleted, setIsWizardCompleted] = useState<boolean>(false);
  const [wizardAnswers, setWizardAnswers] = useState<WizardAnswers | null>(null);
  const [customMemoryOverrides, setCustomMemoryOverrides] = useState<Partial<FieldMemoryState> | null>(null);

  // Sliders for 3-Year Rotation Preferences (TOPSIS)
  const [priorities, setPriorities] = useState<UserPriorities>(DEFAULT_PRIORITIES);
  const [selectedStrategyId, setSelectedStrategyId] = useState<'balanced' | 'water_saving' | 'current'>('balanced');
  const [whatIfWaterCutPercent, setWhatIfWaterCutPercent] = useState<number>(0);
  const [whatIfHeatwaveC, setWhatIfHeatwaveC] = useState<number>(0);

  // NASA Science Lab & Diagnostic Modal State
  const [scienceModalConfig, setScienceModalConfig] = useState<{
    isOpen: boolean;
    tab: 'diagnostic' | 'satellites' | 'equations' | 'topsis';
    eqId?: number;
    targetMetric?: 'health' | 'irrigation' | 'spray' | 'temp' | 'drought' | 'rotation';
  }>({
    isOpen: false,
    tab: 'diagnostic',
    targetMetric: 'health',
  });

  // Check LocalStorage on initial client mount to orchestrate journey
  useEffect(() => {
    const savedLang = localStorage.getItem('blinkfarms_lang') as Language;
    if (savedLang) {
      setLang(savedLang);
      document.documentElement.lang = savedLang;
      document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('tab') === 'rotation') {
      setActiveTab('rotation');
    }

    const seenStory = localStorage.getItem('blinkfarms_story_v3');
    const savedUser = localStorage.getItem('blinkfarms_auth_user');

    if (!seenStory) {
      router.replace('/onboarding');
      return;
    }
    if (!savedUser) {
      router.replace('/login');
      return;
    }
    try {
      setCurrentUser(JSON.parse(savedUser));
    } catch {
      // ignore parse error
    }

    // Restore Agronomic Wizard persistence
    const savedWizard = localStorage.getItem('blinkfarms_wizard_answers');
    const savedCompleted = localStorage.getItem('blinkfarms_wizard_completed');
    const savedOverrides = localStorage.getItem('blinkfarms_field_memory_overrides');
    const savedPriorities = localStorage.getItem('blinkfarms_priorities');
    const savedArea = localStorage.getItem('blinkfarms_area_feddan');

    if (savedCompleted === 'true' && savedWizard) {
      try {
        const parsed = JSON.parse(savedWizard);
        setWizardAnswers(parsed);
        setIsWizardCompleted(true);
        if (parsed.areaFeddan) setCurrentAreaFeddan(parsed.areaFeddan);
      } catch (e) {
        console.error('Failed to parse wizard answers', e);
      }
    }
    if (savedOverrides) {
      try {
        setCustomMemoryOverrides(JSON.parse(savedOverrides));
      } catch {}
    }
    if (savedPriorities) {
      try {
        setPriorities(JSON.parse(savedPriorities));
      } catch {}
    }
    if (savedArea) {
      try {
        setCurrentAreaFeddan(Number(savedArea));
      } catch {}
    }

    // Check if the user has selected a project/farm before
    const savedPresetId = localStorage.getItem('blinkfarms_selected_preset');
    if (!savedPresetId) {
      // Must open the Farm Setup Gateway modal immediately on first login!
      setAppStep('farm_setup');
    } else {
      setSelectedPresetId(savedPresetId);
      const matched = DEMO_FIELDS.find((p) => p.id === savedPresetId);
      if (matched) {
        setCurrentLat(matched.coordinates[0]);
        setCurrentLon(matched.coordinates[1]);
        setCurrentFieldName(savedLang === 'en' ? matched.nameEn : matched.nameAr);
        setCurrentAreaFeddan(Math.round(matched.areaHa * 2.38));
      } else if (savedPresetId === 'custom') {
        const savedCustomPoly = localStorage.getItem('blinkfarms_custom_polygon');
        if (savedCustomPoly) {
          try {
            const poly = JSON.parse(savedCustomPoly);
            if (poly && poly.length >= 3) {
              setCustomPolygon(poly);
            }
          } catch {}
        }
        const savedCustomName = localStorage.getItem('blinkfarms_custom_name');
        if (savedCustomName) setCurrentFieldName(savedCustomName);
      }
      setAppStep('dashboard');
    }
  }, [router]);

  // NASA POWER Weather Observation State
  const [weatherObs, setWeatherObs] = useState<DailyWeatherObservation | null>(null);

  // Python Bridge Live Telemetry & Simulation States
  const [liveTelemetry, setLiveTelemetry] = useState<FlashDroughtTelemetry | null>(null);
  const [liveVitals, setLiveVitals] = useState<UnifiedFarmVitals | null>(null);
  const [liveStrategies, setLiveStrategies] = useState<RotationStrategy[] | null>(null);

  // Baseline Telemetry (Instant hydration fallback before Python bridge response)
  const fallbackTelemetry = useMemo(() => {
    return generateFieldTelemetry(
      currentLat,
      currentLon,
      `f_${currentLat}_${currentLon}`,
      currentFieldName,
      currentFieldName,
      false
    );
  }, [currentLat, currentLon, currentFieldName]);

  const telemetry = liveTelemetry || fallbackTelemetry;

  // Unified Farm Vitals (Single Source of Truth)
  const fallbackVitals = useMemo(() => {
    return buildUnifiedFarmVitals(telemetry, weatherObs, currentAreaFeddan, lang);
  }, [telemetry, weatherObs, currentAreaFeddan, lang]);

  const unifiedVitals = liveVitals || fallbackVitals;

  // Fetch real-time biophysical telemetry directly from Python FastAPI Bridge
  useEffect(() => {
    let cancelled = false;
    const loadLiveTelemetry = async () => {
      try {
        const res = await fetchTelemetryFromPython({
          lat: currentLat,
          lon: currentLon,
          fieldNameAr: currentFieldName,
          fieldNameEn: currentFieldName,
          areaFeddan: currentAreaFeddan,
          polygonBoundary: activePolygonBoundary,
          subParcels: selectedPresetId === 'custom' ? undefined : activePreset?.internalSubParcels,
          lang,
        });
        if (!cancelled && res.success && res.telemetry) {
          setLiveTelemetry(res.telemetry);
          if (res.unifiedVitals) {
            setLiveVitals(res.unifiedVitals);
          }
        }
      } catch (e) {
        // Standby on local physical baseline if microservice is idle or starting
      }
    };
    loadLiveTelemetry();
    return () => {
      cancelled = true;
    };
  }, [currentLat, currentLon, currentFieldName, currentAreaFeddan, activePolygonBoundary, lang]);

  // Real-Time Dynamic Field Memory ($F_{state}$)
  const fieldMemory = useMemo(() => {
    const base = deriveFieldMemoryFromCoords(currentLat, currentLon);
    if (customMemoryOverrides) {
      return {
        ...base,
        ...customMemoryOverrides,
      };
    }
    if (wizardAnswers) {
      return {
        ...base,
        previousCropId: wizardAnswers.previousCrop,
        hardpanDetected: wizardAnswers.subsoilIssue === 'hardpan',
        salinityRiskLevel: wizardAnswers.subsoilIssue === 'salinity' ? ('moderate' as const) : ('normal' as const),
        carryoverWaterFraction: wizardAnswers.irrigationType === 'drip' ? 0.70 : (wizardAnswers.irrigationType === 'pivot' ? 0.60 : 0.45),
        soilErrorIndex: wizardAnswers.subsoilIssue === 'hardpan' ? 1.45 : (wizardAnswers.subsoilIssue === 'salinity' ? 1.30 : 0.85),
      };
    }
    return base;
  }, [currentLat, currentLon, wizardAnswers, customMemoryOverrides]);

  // Real-Time 3-Year / 6-Season Crop Rotation Simulations (FAO AquaCrop + DSSAT Sequence)
  const fallbackStrategies = useMemo(() => {
    return simulateRotationStrategies(
      fieldMemory,
      priorities,
      currentLat,
      currentLon,
      whatIfWaterCutPercent,
      whatIfHeatwaveC
    );
  }, [fieldMemory, priorities, currentLat, currentLon, whatIfWaterCutPercent, whatIfHeatwaveC]);

  const strategies = liveStrategies || fallbackStrategies;

  // Fetch real-time rotation simulation directly from Python FastAPI Bridge
  useEffect(() => {
    let cancelled = false;
    const loadLiveSimulation = async () => {
      try {
        const res = await fetchSimulationFromPython({
          lat: currentLat,
          lon: currentLon,
          priorities,
          fieldMemory,
          whatIfWaterCutPercent,
          whatIfHeatwaveC,
          areaFeddan: currentAreaFeddan,
          polygonBoundary: activePolygonBoundary,
          subParcels: selectedPresetId === 'custom' ? undefined : activePreset?.internalSubParcels,
          lang,
          allowedCategories: (wizardAnswers?.cropCategory && wizardAnswers.cropCategory !== 'all') ? [wizardAnswers.cropCategory] : undefined,
        });
        if (!cancelled && res.success && res.strategies && res.strategies.length > 0) {
          setLiveStrategies(res.strategies);
        }
      } catch (e) {
        // Standby on local baseline if microservice is idle or starting
      }
    };
    loadLiveSimulation();
    return () => {
      cancelled = true;
    };
  }, [fieldMemory, priorities, currentLat, currentLon, whatIfWaterCutPercent, whatIfHeatwaveC, currentAreaFeddan, activePolygonBoundary, lang, wizardAnswers]);

  const activeStrategy = useMemo(() => {
    return strategies.find(s => s.id === selectedStrategyId) || strategies[0];
  }, [strategies, selectedStrategyId]);

  const bestStrategy = activeStrategy;

  const toggleLang = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('blinkfarms_lang', nextLang);
    document.documentElement.lang = nextLang;
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';

    if (selectedPresetId !== 'custom' && activePreset) {
      setCurrentFieldName(nextLang === 'ar' ? activePreset.nameAr : activePreset.nameEn);
    } else if (selectedPresetId === 'custom') {
      if (currentFieldName.includes('قطعة محددة') || currentFieldName.includes('Custom Parcel')) {
        setCurrentFieldName(nextLang === 'ar' ? `قطعة محددة (${currentAreaFeddan} فدان)` : `Custom Parcel (${currentAreaFeddan} fed)`);
      } else if (currentFieldName.startsWith('حقل (') || currentFieldName.startsWith('Field (')) {
        setCurrentFieldName(nextLang === 'ar' ? `حقل (${currentLat.toFixed(2)}°, ${currentLon.toFixed(2)}°)` : `Field (${currentLat.toFixed(2)}°, ${currentLon.toFixed(2)}°)`);
      }
    }
  };

  // Handle Preset Selection
  const handleSelectPreset = (preset: FieldPreset) => {
    setSelectedPresetId(preset.id);
    setCustomPolygon(null);
    setLiveTelemetry(null);
    localStorage.setItem('blinkfarms_selected_preset', preset.id);
    localStorage.removeItem('blinkfarms_custom_polygon');
    setCurrentLat(preset.coordinates[0]);
    setCurrentLon(preset.coordinates[1]);
    setCurrentFieldName(lang === 'ar' ? preset.nameAr : preset.nameEn);
    setCurrentAreaFeddan(Math.round(preset.areaHa * 2.38));
    setAppStep('dashboard');
  };

  // Handle Custom Farm Selection
  const handleSelectCustom = (lat: number, lon: number, name: string, areaFeddan: number) => {
    setSelectedPresetId('custom');
    localStorage.setItem('blinkfarms_selected_preset', 'custom');
    setLiveTelemetry(null);
    setCurrentLat(lat);
    setCurrentLon(lon);
    setCurrentFieldName(name);
    setCurrentAreaFeddan(areaFeddan);
    const delta = 0.003;
    setCustomPolygon([
      [lat - delta, lon - delta],
      [lat - delta, lon + delta],
      [lat + delta, lon + delta],
      [lat + delta, lon - delta],
    ]);
    setAppStep('dashboard');
  };

  // Handle Map Click or Drag
  const handleLocationChange = (newLat: number, newLon: number, customName?: string) => {
    setSelectedPresetId('custom');
    setLiveTelemetry(null);
    setCurrentLat(newLat);
    setCurrentLon(newLon);

    // Only create a default box if no custom polygon was explicitly defined by the user
    if (!customPolygon || customPolygon.length < 3) {
      const delta = 0.0028;
      setCustomPolygon([
        [newLat - delta, newLon - delta],
        [newLat - delta, newLon + delta],
        [newLat + delta, newLon + delta],
        [newLat + delta, newLon - delta],
      ]);
    }

    if (customName) {
      setCurrentFieldName(customName);
    } else {
      setCurrentFieldName(
        lang === 'ar'
          ? `حقل (${newLat.toFixed(2)}°, ${newLon.toFixed(2)}°)`
          : `Field (${newLat.toFixed(2)}°, ${newLon.toFixed(2)}°)`
      );
    }
  };

  // Handle Interactive Touch/Finger Polygon Drawing
  const handleCustomPolygonChange = (coords: [number, number][], areaFeddan: number) => {
    setSelectedPresetId('custom');
    setCustomPolygon(coords);
    localStorage.setItem('blinkfarms_selected_preset', 'custom');
    localStorage.setItem('blinkfarms_custom_polygon', JSON.stringify(coords));
    if (areaFeddan > 0) {
      setCurrentAreaFeddan(areaFeddan);
      localStorage.setItem('blinkfarms_custom_area', String(areaFeddan));
    }
    setLiveTelemetry(null);
    if (coords.length > 0) {
      const avgLat = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;
      const avgLon = coords.reduce((acc, c) => acc + c[1], 0) / coords.length;
      setCurrentLat(Number(avgLat.toFixed(4)));
      setCurrentLon(Number(avgLon.toFixed(4)));
      const customName = lang === 'ar' ? `قطعة محددة (${areaFeddan} فدان)` : `Custom Parcel (${areaFeddan} fed)`;
      setCurrentFieldName(customName);
      localStorage.setItem('blinkfarms_custom_name', customName);
    }
  };

  // GPS Locate
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        handleLocationChange(pos.coords.latitude, pos.coords.longitude, lang === 'ar' ? 'موقعي (GPS)' : 'My GPS Location');
      });
    }
  };

  // Handle Agronomic Wizard Finish
  const handleWizardComplete = (
    answers: WizardAnswers,
    updatedPriorities: UserPriorities,
    updatedMemory: Partial<FieldMemoryState>
  ) => {
    setWizardAnswers(answers);
    setPriorities(updatedPriorities);
    setCustomMemoryOverrides(updatedMemory);
    setCurrentAreaFeddan(answers.areaFeddan);
    setIsWizardCompleted(true);

    localStorage.setItem('blinkfarms_wizard_answers', JSON.stringify(answers));
    localStorage.setItem('blinkfarms_wizard_completed', 'true');
    localStorage.setItem('blinkfarms_field_memory_overrides', JSON.stringify(updatedMemory));
    localStorage.setItem('blinkfarms_priorities', JSON.stringify(updatedPriorities));
    localStorage.setItem('blinkfarms_area_feddan', String(answers.areaFeddan));
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#F8F5EE] text-[#243023] transition-colors pb-24 sm:pb-12 w-full max-w-full overflow-x-hidden font-sans select-none"
    >
      {/* Farm Selection Gateway */}
      {appStep === 'farm_setup' && (
        <FarmSetupGateway
          lang={lang}
          onSelectPreset={handleSelectPreset}
          onSelectCustom={handleSelectCustom}
        />
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        lang={lang}
        farmAcreage={currentAreaFeddan}
        fieldName={displayFieldName}
        onLogout={() => {
          localStorage.removeItem('blinkfarms_auth_user');
          setCurrentUser(null);
          setIsProfileModalOpen(false);
          router.push('/login');
        }}
        onOpenFarmSetup={() => setAppStep('farm_setup')}
      />

      {/* Ultra-Fluid Organic Top Bar: Logo + Field Picker + Nav + Profile */}
      <header className="sticky top-0 z-40 bg-[#F8F5EE]/85 backdrop-blur-2xl border-b border-[#384536]/10 w-full transition-all">
        <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Brand + Field Picker */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setActiveTab('radar')}
              className="flex items-center gap-2 shrink-0 focus:outline-none group"
            >
              <img
                src="/logo.png"
                alt="BlinkFarms"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-sm group-hover:scale-105 active:scale-95 transition-transform"
              />
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-[#243023] leading-none hidden sm:block">
                BlinkFarms
              </span>
            </button>

            {/* Field Dropdown / Switcher */}
            <div className="flex items-center bg-[#EDE6D9] p-1 rounded-2xl min-w-0 max-w-[170px] sm:max-w-[260px] lg:max-w-[340px] border border-[#384536]/10 shadow-sm">
              <select
                value={selectedPresetId}
                onChange={(e) => {
                  if (e.target.value === 'open_setup') {
                    setAppStep('farm_setup');
                  } else {
                    const p = DEMO_FIELDS.find(f => f.id === e.target.value);
                    if (p) handleSelectPreset(p);
                  }
                }}
                className="bg-transparent text-xs font-bold text-[#243023] px-2 py-1 focus:outline-none cursor-pointer truncate min-w-0 flex-1"
              >
                {selectedPresetId === 'custom' && (
                  <option value="custom" className="bg-[#FAF7F2] font-bold text-[#2F6E3E]">
                    📍 {displayFieldName}
                  </option>
                )}
                {DEMO_FIELDS.map(f => (
                  <option key={f.id} value={f.id} className="bg-[#FAF7F2] text-[#243023]">
                    {lang === 'ar' ? f.nameAr : f.nameEn}
                  </option>
                ))}
                <option value="open_setup" className="bg-[#FAF7F2] font-bold text-[#384536]">
                  {lang === 'ar' ? '➕ تحديد حقل آخر...' : '➕ Change Field...'}
                </option>
              </select>
              <button
                onClick={handleLocateMe}
                className="p-1 rounded-xl bg-white hover:bg-[#F2ECE1] text-[#384536] shadow-sm text-xs shrink-0 transition-colors"
                title={lang === 'ar' ? 'موقعي بالـ GPS' : 'GPS Location'}
              >
                📍
              </button>
            </div>
          </div>

          {/* Desktop/Tablet 3 Navigation Tabs */}
          <nav className="hidden md:flex items-center bg-[#EDE6D9] p-1 rounded-2xl text-xs font-bold shrink-0 border border-[#384536]/10 shadow-sm">
            <button
              onClick={() => setActiveTab('radar')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'radar'
                  ? 'bg-[#384536] text-[#FAF7F2] shadow-sm font-extrabold'
                  : 'text-[#576855] hover:text-[#243023]'
              }`}
            >
              <LightningIcon className="w-4 h-4" />
              <span>{lang === 'ar' ? 'الرادار' : 'Radar'}</span>
            </button>

            <button
              onClick={() => setActiveTab('rotation')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'rotation'
                  ? 'bg-[#384536] text-[#FAF7F2] shadow-sm font-extrabold'
                  : 'text-[#576855] hover:text-[#243023]'
              }`}
            >
              <RefreshIcon className="w-4 h-4" />
              <span>{lang === 'ar' ? 'الدورة' : 'Rotation'}</span>
            </button>

            <Link
              href="/chat"
              className="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-[#576855] hover:text-[#384536] active:scale-95 font-bold"
            >
              <img src="/blink-ai-logo.png" alt="BlinkAI" className="w-4 h-4 rounded-full object-cover border border-[#384536]/30 shadow-sm" />
              <span>BlinkAI</span>
            </Link>
          </nav>

          {/* Right Controls: Profile Button + Language Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Real Profile Button */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#EDE6D9] hover:bg-[#E4DBCB] text-[#243023] border border-[#384536]/10 text-xs font-bold transition-all active:scale-95 shadow-sm"
              title={lang === 'ar' ? 'الملف الشخصي للمزارع' : 'Farmer Profile'}
            >
              <span className="text-sm">👤</span>
              <span className="hidden sm:inline">
                {currentUser?.name ? currentUser.name.split(' ')[0] : (lang === 'ar' ? 'حسابي' : 'Profile')}
              </span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLang}
              className="px-3 py-1.5 rounded-2xl bg-[#384536] text-[#FAF7F2] hover:bg-[#253024] text-xs font-bold shadow-sm active:scale-95 transition-all"
            >
              {lang === 'ar' ? 'English' : 'عربي'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Flow Content (Edge-to-Edge Fluid Background) */}
      <main className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-16 w-full min-w-0">
        {/* =========================================================================
            TAB 1: HOME / FIELD RADAR
           ========================================================================= */}
        {activeTab === 'radar' && (
          <div className="space-y-5 animate-fadeIn">
            {/* ROW 1: SATELLITE MAP (7 COLS) + CORE DECISIONS & HEALTH RING (5 COLS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* 1. CRYSTAL-CLEAR SATELLITE MAP */}
              <div className="w-full min-w-0 lg:col-span-7 xl:col-span-7">
                <SplitFieldMap
                  lat={currentLat}
                  lon={currentLon}
                  fieldName={displayFieldName}
                  lang={lang}
                  onLocationChange={handleLocationChange}
                  onCustomPolygonChange={handleCustomPolygonChange}
                  isShockActive={telemetry.isFlashDroughtAlert}
                  polygonBoundary={activePolygonBoundary}
                  subParcels={selectedPresetId === 'custom' ? undefined : activePreset?.internalSubParcels}
                />
              </div>

              {/* 2. Operations Side Card: Health Ring & 3 Daily Decisions */}
              <div className="w-full min-w-0 lg:col-span-5 xl:col-span-5">
                <FarmerMorningVitals
                  telemetry={telemetry}
                  vitals={unifiedVitals}
                  areaFeddan={currentAreaFeddan}
                  lang={lang}
                  mode="side_decisions"
                  onOpenScienceModal={(tab, eqId, targetMetric) =>
                    setScienceModalConfig({ isOpen: true, tab: tab || 'diagnostic', eqId, targetMetric: targetMetric || 'health' })
                  }
                />
              </div>
            </div>

            {/* ROW 2: DEEP SCIENCE GAUGES UNDER MAP (FULL WIDTH ACROSS DASHBOARD) */}
            <FarmerMorningVitals
              telemetry={telemetry}
              vitals={unifiedVitals}
              areaFeddan={currentAreaFeddan}
              lang={lang}
              mode="bottom_gauges"
              onOpenScienceModal={(tab, eqId, targetMetric) =>
                setScienceModalConfig({ isOpen: true, tab: tab || 'diagnostic', eqId, targetMetric: targetMetric || 'health' })
              }
            />
          </div>
        )}

        {/* =========================================================================
            TAB 2: CROP ROTATION & FIELD SOIL HEALTH
           ========================================================================= */}
        {activeTab === 'rotation' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Show Agronomic Wizard if not yet completed */}
            {!isWizardCompleted ? (
              <AgronomicWizard
                lang={lang}
                onComplete={handleWizardComplete}
                initialAnswers={wizardAnswers}
                lat={currentLat}
                lon={currentLon}
                fieldName={displayFieldName}
                polygonBoundary={activePolygonBoundary}
              />
            ) : (
              <div className="space-y-4">
                {/* 3-Year / 6-Season Smart Crop Rotation Planner */}
                <CropRotationPlanner
                  strategies={strategies}
                  selectedStrategyId={selectedStrategyId}
                  onSelectStrategy={setSelectedStrategyId}
                  areaFeddan={currentAreaFeddan}
                  fieldName={displayFieldName}
                  lang={lang}
                  onOpenWizard={() => {
                    setIsWizardCompleted(false);
                    localStorage.setItem('blinkfarms_wizard_completed', 'false');
                  }}
                  whatIfWaterCutPercent={whatIfWaterCutPercent}
                  setWhatIfWaterCutPercent={setWhatIfWaterCutPercent}
                  whatIfHeatwaveC={whatIfHeatwaveC}
                  setWhatIfHeatwaveC={setWhatIfHeatwaveC}
                  onOpenScienceModal={(tab, eqId, targetMetric) =>
                    setScienceModalConfig({ isOpen: true, tab: tab || 'diagnostic', eqId, targetMetric: targetMetric || 'rotation' })
                  }
                />
              </div>
            )}
          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation Bar (Dashboard View: Radar, Rotation, Link to Chat) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-[2000] bg-[#FAF7F2]/95 backdrop-blur-2xl border-t border-[#384536]/10 px-6 py-2 pb-5 flex items-center justify-around shadow-2xl max-w-full overflow-hidden"
      >
        <button
          onClick={() => setActiveTab('radar')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold py-1.5 px-4 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'radar' ? 'text-[#384536] bg-[#384536]/10' : 'text-[#576855]'
          }`}
        >
          <LightningIcon className="w-5 h-5" />
          <span>{lang === 'ar' ? 'الرادار' : 'Radar'}</span>
        </button>

        <button
          onClick={() => setActiveTab('rotation')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold py-1.5 px-4 rounded-2xl transition-all active:scale-95 ${
            activeTab === 'rotation' ? 'text-[#384536] bg-[#384536]/10' : 'text-[#576855]'
          }`}
        >
          <RefreshIcon className="w-5 h-5" />
          <span>{lang === 'ar' ? 'الدورة' : 'Rotation'}</span>
        </button>

        <Link
          href="/chat"
          className="flex flex-col items-center gap-1 text-[11px] font-bold py-1.5 px-3 rounded-2xl transition-all active:scale-95 text-[#576855] hover:text-[#384536]"
        >
          <img src="/blink-ai-logo.png" alt="BlinkAI" className="w-5 h-5 rounded-full object-cover border border-[#384536]/30 shadow-sm" />
          <span>BlinkAI</span>
        </Link>
      </nav>

      {/* Full-Screen NASA Science Lab & Diagnostic Modal */}
      <NasaScienceLabModal
        isOpen={scienceModalConfig.isOpen}
        onClose={() => setScienceModalConfig((prev) => ({ ...prev, isOpen: false }))}
        initialTab={scienceModalConfig.tab}
        focusEquationId={scienceModalConfig.eqId}
        targetMetric={scienceModalConfig.targetMetric}
        lang={lang}
        telemetry={telemetry}
        vitals={unifiedVitals}
      />
    </div>
  );
}
