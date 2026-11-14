'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RotationRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/?tab=rotation');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8F5EE] flex items-center justify-center font-sans text-[#243023]">
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#384536]/10 shadow-sm animate-pulse">
        <span className="text-xl">🔄</span>
        <span className="text-sm font-bold">جاري فتح خطة الدورة الزراعية...</span>
      </div>
    </div>
  );
}
