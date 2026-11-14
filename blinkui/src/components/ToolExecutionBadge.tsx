'use client';

import React, { useState } from 'react';
import { ToolInvocation, Language } from '@/lib/types';

interface ToolExecutionBadgeProps {
  tool: ToolInvocation;
  lang: Language;
}

export default function ToolExecutionBadge({ tool, lang }: ToolExecutionBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getToolIcon = (name: string) => {
    switch (name) {
      case 'simulate_crop_scenario':
        return '🧬';
      case 'run_topsis_rotation_optimizer':
        return '⚖️';
      case 'fetch_nasa_drought_telemetry':
        return '🛰️';
      case 'query_ithmar_knowledge_base':
        return '🌱';
      case 'update_field_parameters':
        return '⚙️';
      default:
        return '⚡';
    }
  };

  const label = lang === 'ar' ? tool.labelAr : tool.labelEn;
  const summary = lang === 'ar' ? tool.summaryAr : tool.summaryEn;

  return (
    <div className="inline-block max-w-full">
      {/* Clickable Pill Badge */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all border select-none active:scale-95 ${
          isExpanded
            ? 'bg-[#384536] text-[#FAF7F2] border-[#384536] shadow-xs'
            : 'bg-[#EDE6D9] hover:bg-[#E2D8C6] text-[#384536] border-[#384536]/15'
        }`}
        title={lang === 'ar' ? 'اضغط لعرض مدخلات ومخرجات الأداة' : 'Click to inspect tool telemetry'}
      >
        <span className="text-xs">{getToolIcon(tool.name)}</span>
        <span className="truncate">{label}</span>
        <span className="text-[9px] opacity-70 ml-0.5">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {/* Expandable Parameter & Telemetry Drawer */}
      {isExpanded && (
        <div className="mt-1.5 p-3 rounded-2xl bg-[#FAF7F2] border border-[#384536]/15 text-[#243023] text-[11px] space-y-2 animate-fadeIn max-w-full overflow-hidden shadow-xs">
          {summary && (
            <p className="font-semibold text-[#2F6E3E] leading-snug">
              {summary}
            </p>
          )}

          {tool.input && Object.keys(tool.input).length > 0 && (
            <div className="space-y-1">
              <span className="font-bold text-[#7E907C] block text-[10px] uppercase">
                {lang === 'ar' ? 'المدخلات:' : 'Inputs:'}
              </span>
              <pre className="p-2 rounded-xl bg-white border border-[#384536]/10 text-[10px] font-mono overflow-x-auto text-[#243023]">
                {JSON.stringify(tool.input, null, 2)}
              </pre>
            </div>
          )}

          {tool.output && Object.keys(tool.output).length > 0 && (
            <div className="space-y-1">
              <span className="font-bold text-[#7E907C] block text-[10px] uppercase">
                {lang === 'ar' ? 'المخرجات المحسوبة:' : 'Outputs:'}
              </span>
              <pre className="p-2 rounded-xl bg-white border border-[#384536]/10 text-[10px] font-mono overflow-x-auto text-[#243023]">
                {JSON.stringify(tool.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}