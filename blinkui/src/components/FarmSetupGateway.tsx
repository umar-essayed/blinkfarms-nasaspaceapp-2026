'use client';

import React, { useState } from 'react';
import { Language } from '@/lib/types';
import { DEMO_FIELDS, FieldPreset } from '@/lib/fieldPresets';

interface FarmSetupGatewayProps {
  lang: Language;
  onSelectPreset: (preset: FieldPreset) => void;
  onSelectCustom: (lat: number, lon: number, name: string, areaFeddan: number) => void;
}

export default function FarmSetupGateway({
  lang,
  onSelectPreset,
  onSelectCustom,
}: FarmSetupGatewayProps) {
  const [tab, setTab] = useState<'presets' | 'custom'>('presets');
  const [customName, setCustomName] = useState('');
  const [customLat, setCustomLat] = useState('30.850');
  const [customLon, setCustomLon] = useState('31.050');
  const [customArea, setCustomArea] = useState(25);
  const [isGpsLocating, setIsGpsLocating] = useState(false);

  const handleGps = () => {
    if (navigator.geolocation) {
      setIsGpsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsGpsLocating(false);
          setCustomLat(pos.coords.latitude.toFixed(4));
          setCustomLon(pos.coords.longitude.toFixed(4));
          if (!customName) {
            setCustomName(lang === 'ar' ? 'مزرعتي الحالية (GPS)' : 'My Field (GPS)');
          }
        },
        () => setIsGpsLocating(false),
        { timeout: 8000 }
      );
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(customLat) || 30.85;
    const lonNum = parseFloat(customLon) || 31.05;
    const nameStr = customName || (lang === 'ar' ? `حقل (${latNum}°, ${lonNum}°)` : `Field (${latNum}°, ${lonNum}°)`);
    onSelectCustom(latNum, lonNum, nameStr, customArea);
  };

  return (
    <div className="fixed inset-0 z-[3200] bg-black/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="w-full max-w-xl bg-white/95 rounded-3xl p-5 sm:p-8 shadow-[0_16px_50px_rgba(56,69,54,0.12)] border border-[#384536]/15 flex flex-col max-h-[90dvh] overflow-hidden text-[#243023]">
        {/* Header */}
        <div className="text-center space-y-1.5 pb-4 border-b border-[#384536]/10 shrink-0">
          <img
            src="/logo.png"
            alt="BlinkFarms"
            className="w-12 h-12 mx-auto object-contain drop-shadow-sm"
          />
          <h2 className="text-lg sm:text-2xl font-black text-[#243023] tracking-tight">
            {lang === 'ar' ? 'حدد موقع حقلك للبدء' : 'Select or Pin Your Field'}
          </h2>
          <p className="text-xs text-[#576855] max-w-md mx-auto">
            {lang === 'ar'
              ? 'اختر من المشاريع الزراعية القومية الكبرى أو حدد موقع مزرعتك الخاصة بالـ GPS'
              : 'Choose a national benchmark parcel or pin your custom farmland with GPS'}
          </p>

          {/* Mode Switcher */}
          <div className="flex items-center justify-center pt-2">
            <div className="flex items-center bg-[#EDE6D9] p-1 rounded-2xl text-xs font-bold border border-[#384536]/10">
              <button
                onClick={() => setTab('presets')}
                className={`px-4 py-1.5 rounded-xl transition-all ${
                  tab === 'presets'
                    ? 'bg-[#384536] text-[#FAF7F2] shadow-sm'
                    : 'text-[#576855] hover:text-[#243023]'
                }`}
              >
                {lang === 'ar' ? 'المشاريع القومية (6)' : 'National Projects (6)'}
              </button>
              <button
                onClick={() => setTab('custom')}
                className={`px-4 py-1.5 rounded-xl transition-all ${
                  tab === 'custom'
                    ? 'bg-[#384536] text-[#FAF7F2] shadow-sm'
                    : 'text-[#576855] hover:text-[#243023]'
                }`}
              >
                {lang === 'ar' ? 'مزرعتي الخاصة (GPS)' : 'Custom Field (GPS)'}
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {tab === 'presets' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_FIELDS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset)}
                  className="p-3.5 rounded-2xl border border-[#384536]/10 hover:border-[#384536] bg-[#FAF7F2] hover:bg-[#F3ECE1] text-start transition-all active:scale-95 flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-[#243023] truncate block">
                        {lang === 'ar' ? preset.nameAr : preset.nameEn}
                      </span>
                      {preset.polygonBoundary && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#EDE6D9] text-[#384536] font-mono font-bold">
                          {lang === 'ar' ? 'حدود GeoJSON رسمية 🗺️' : 'Official Polygon 🗺️'}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#7E907C] truncate block mt-0.5">
                      {lang === 'ar' ? preset.locationAr : preset.locationEn}
                    </span>
                    <span className="text-[10px] text-[#2F6E3E] font-bold block mt-1">
                      {lang === 'ar' ? preset.cropNameAr : preset.cropNameEn}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#384536] shrink-0">➔</span>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <button
                type="button"
                onClick={handleGps}
                disabled={isGpsLocating}
                className="w-full py-3 px-4 rounded-2xl bg-[#EDE6D9] hover:bg-[#E3D9C9] border border-[#384536]/15 text-[#384536] text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs"
              >
                <span>📍</span>
                <span>
                  {isGpsLocating
                    ? (lang === 'ar' ? 'جارٍ تحديد الموقع عبر الأقمار الصناعية...' : 'Locating with GPS...')
                    : (lang === 'ar' ? 'اضغط لتحديد موقعي الحالي تلقائياً عبر الـ GPS' : 'Auto-Detect My Coordinates via GPS')}
                </span>
              </button>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#576855] block">
                  {lang === 'ar' ? 'اسم الحقل أو المزرعة:' : 'Farm Name:'}
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: مزرعة الوادي الأخضر' : 'e.g. Green Valley Parcel 4'}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#384536]/15 bg-[#FAF7F2] text-xs sm:text-sm text-[#243023] focus:outline-none focus:ring-2 focus:ring-[#384536]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#576855] block">
                    {lang === 'ar' ? 'دائرة العرض (Lat):' : 'Latitude:'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#384536]/15 bg-[#FAF7F2] text-xs font-mono text-[#243023]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#576855] block">
                    {lang === 'ar' ? 'خط الطول (Lon):' : 'Longitude:'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={customLon}
                    onChange={(e) => setCustomLon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#384536]/15 bg-[#FAF7F2] text-xs font-mono text-[#243023]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-[#243023]">
                  <span>{lang === 'ar' ? 'المساحة التقريبية:' : 'Approximate Area:'}</span>
                  <span className="text-[#384536] font-mono">{customArea} {lang === 'ar' ? 'فدان' : 'feddans'}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="500"
                  value={customArea}
                  onChange={(e) => setCustomArea(parseInt(e.target.value))}
                  className="w-full accent-[#384536] h-2"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-[#384536] hover:bg-[#253024] text-[#FAF7F2] font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
              >
                {lang === 'ar' ? 'تأكيد والانطلاق للوحة التحكم ➔' : 'Confirm & Launch Dashboard ➔'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
