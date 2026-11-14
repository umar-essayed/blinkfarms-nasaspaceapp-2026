'use client';

import React from 'react';
import { Language } from '@/lib/types';
import { UserProfile } from './AuthGateway';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  lang: Language;
  farmAcreage: number;
  fieldName: string;
  onLogout: () => void;
  onOpenFarmSetup: () => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  lang,
  farmAcreage,
  fieldName,
  onLogout,
  onOpenFarmSetup,
}: ProfileModalProps) {
  if (!isOpen) return null;

  const defaultName = lang === 'ar' ? 'م. محمود الشربيني' : 'M. Sherbini';
  const defaultEmail = user?.email || 'farmer@blinkfarms.eg';
  const displayName = user?.name || defaultName;

  return (
    <div className="fixed inset-0 z-[4000] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div
        className="w-full max-w-sm bg-white/95 rounded-3xl p-6 sm:p-7 shadow-[0_16px_50px_rgba(56,69,54,0.12)] border border-[#384536]/15 space-y-5 animate-slideUp relative text-[#243023]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 rtl:left-auto rtl:right-4 w-8 h-8 rounded-full bg-[#EDE6D9] hover:bg-[#E2D8C6] text-[#576855] flex items-center justify-center text-sm font-bold transition-all shadow-xs"
        >
          ✕
        </button>

        {/* User Avatar & Name */}
        <div className="text-center pt-2 space-y-2">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-[#EDE6D9] text-[#384536] font-extrabold text-2xl flex items-center justify-center shadow-xs border border-[#384536]/10">
              👨‍🌾
            </div>
            <img
              src="/logo.png"
              alt="BlinkFarms"
              className="w-7 h-7 object-contain absolute -bottom-1 -right-1 drop-shadow-md"
            />
          </div>

          <div>
            <h3 className="text-lg font-bold text-[#243023]">
              {displayName}
            </h3>
            <p className="text-xs text-[#7E907C] font-mono mt-0.5">
              {defaultEmail}
            </p>
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#EDE6D9] text-[#384536]">
            {lang === 'ar' ? 'مزارع معتمد (BlinkFarms)' : 'Verified Farmer'}
          </span>
        </div>

        {/* Farm & Account Overview */}
        <div className="space-y-2.5 pt-2 border-t border-[#384536]/10">
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-[#576855] font-medium">
              {lang === 'ar' ? 'المساحة المسجلة:' : 'Registered Acreage:'}
            </span>
            <span className="font-bold text-[#243023]">
              {farmAcreage} {lang === 'ar' ? 'فدان' : 'feddans'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-[#576855] font-medium">
              {lang === 'ar' ? 'الحقل الحالي:' : 'Current Field:'}
            </span>
            <span className="font-bold text-[#243023] truncate max-w-[170px]">
              {fieldName}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-[#576855] font-medium">
              {lang === 'ar' ? 'حالة الربط:' : 'Sync Status:'}
            </span>
            <span className="font-bold text-[#2F6E3E] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2F6E3E] animate-pulse"></span>
              {lang === 'ar' ? 'نشط مع الأقمار الصناعية' : 'Satellite Active'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-2">
          <button
            onClick={() => {
              onClose();
              onOpenFarmSetup();
            }}
            className="w-full py-2.5 rounded-2xl bg-[#EDE6D9] hover:bg-[#E2D8C6] text-xs font-bold text-[#243023] transition-all active:scale-95 shadow-xs"
          >
            {lang === 'ar' ? '🌾 تغيير أو تحديد حقل آخر' : '🌾 Change Field Location'}
          </button>

          <button
            onClick={onLogout}
            className="w-full py-2.5 rounded-2xl bg-[#A8382B]/10 hover:bg-[#A8382B]/20 text-xs font-bold text-[#A8382B] transition-all active:scale-95"
          >
            {lang === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
          </button>
        </div>
        {/* Footer Brand Info */}
        <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-[#7E907C] font-medium">
          <img src="/logo.png" alt="BlinkFarms" className="w-4 h-4 object-contain" />
          <span>BlinkFarms — NASA FieldShift & VeloceRoot</span>
        </div>
      </div>
    </div>
  );
}
