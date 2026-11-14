'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
}

export function AnimatedStreamingMessage({
  content,
  isLatest = false,
}: {
  content: string;
  isLatest?: boolean;
}) {
  const [displayedLength, setDisplayedLength] = useState(() => (isLatest ? 0 : content.length));
  const [isDone, setIsDone] = useState(() => !isLatest);

  useEffect(() => {
    if (!isLatest) {
      setDisplayedLength(content.length);
      setIsDone(true);
      return;
    }

    setDisplayedLength(0);
    setIsDone(false);

    let currentIndex = 0;
    // Step size calculated for smooth, fluid typewriter animation (~1-2 seconds total)
    const step = Math.max(3, Math.ceil(content.length / 60));
    const interval = setInterval(() => {
      currentIndex += step;
      if (currentIndex >= content.length) {
        setDisplayedLength(content.length);
        setIsDone(true);
        clearInterval(interval);
      } else {
        setDisplayedLength(currentIndex);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [content, isLatest]);

  const visibleContent = isDone ? content : content.slice(0, displayedLength);

  return (
    <div onClick={() => setIsDone(true)} className="cursor-default">
      <MarkdownMessage content={visibleContent} />
      {!isDone && (
        <span className="inline-block w-2 h-3.5 bg-emerald-400 ml-1 rtl:mr-1 animate-pulse align-middle rounded-sm shadow-sm" />
      )}
    </div>
  );
}

export default function MarkdownMessage({ content }: MarkdownMessageProps) {
  // Parse special visual widget directives if present
  // Examples:
  // [WIDGET:SOIL_HEALTH:88]
  // [WIDGET:MOISTURE:69]
  // [WIDGET:SPRAY:safe]
  // [WIDGET:ROTATION:cropName:profitK:waterPct]
  
  const renderInlineWidget = (rawToken: string) => {
    const parts = rawToken.replace(/[\[\]]/g, '').split(':');
    const type = parts[1];

    if (type === 'SOIL_HEALTH') {
      const score = Math.min(100, Math.max(0, parseInt(parts[2] || '88', 10)));
      const radius = 24;
      const circ = 2 * Math.PI * radius;
      const offset = circ - (score / 100) * circ;

      return (
        <div key={rawToken} className="my-2.5 p-3 rounded-2xl bg-white border border-[#384536]/15 flex items-center justify-between gap-3 shadow-xs not-prose">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r={radius} stroke="#EDE6D9" strokeWidth="4" fill="transparent" />
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  stroke="#384536"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-mono font-black text-xs text-[#243023]">
                {score}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#7E907C] font-bold block uppercase tracking-wider">رادار صحة الأرض</span>
              <span className="text-xs font-black text-[#2F6E3E]">حالة ممتازة • نتح كامل 🟢</span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EDE6D9] text-[#384536] font-mono font-bold border border-[#384536]/10">
            ECOSTRESS 70m
          </span>
        </div>
      );
    }

    if (type === 'MOISTURE') {
      const pct = Math.min(100, Math.max(0, parseInt(parts[2] || '69', 10)));
      return (
        <div key={rawToken} className="my-2.5 p-3 rounded-2xl bg-white border border-[#384536]/15 space-y-1.5 shadow-xs not-prose">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#243023] flex items-center gap-1.5">
              <span>🌱</span>
              <span>مقياس رطوبة الجذور (SMAP)</span>
            </span>
            <span className="font-mono font-bold text-[#2F6E3E]">{pct}%</span>
          </div>
          <div className="relative w-full h-2 rounded-full bg-[#EDE6D9] overflow-hidden flex">
            <div
              className="h-full rounded-full bg-[#384536]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-[#7E907C] font-medium">
            <span>عطش (&lt;40%)</span>
            <span className="text-[#2F6E3E] font-bold">النطاق المثالي</span>
            <span>تشبع (&gt;80%)</span>
          </div>
        </div>
      );
    }

    if (type === 'SPRAY') {
      const isSafe = parts[2] !== 'false';
      return (
        <div key={rawToken} className="my-2.5 p-3 rounded-2xl bg-white border border-[#384536]/15 space-y-1.5 shadow-xs not-prose">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#243023] flex items-center gap-1.5">
              <span>💨</span>
              <span>ساعات الرش اليومية (NASA POWER)</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EDE6D9] text-[#384536] font-bold border border-[#384536]/10">
              {isSafe ? 'آمن حتى 10 ص ✅' : 'مؤجل لرياح ⚠️'}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1 h-2.5">
            <div className="rounded bg-[#2F6E3E]/80" title="6-8 ص: آمن" />
            <div className="rounded bg-[#2F6E3E]/80" title="8-10 ص: آمن" />
            <div className="rounded bg-[#C08A3E]/40" title="10-12 م: رياح" />
            <div className="rounded bg-[#EDE6D9]" title="12-2 م: حرارة" />
            <div className="rounded bg-[#EDE6D9]" title="2-4 م: حرارة" />
            <div className="rounded bg-[#2F6E3E]/40" title="4-6 م: انكسار الحرارة" />
          </div>
          <div className="flex justify-between text-[9px] text-[#7E907C] font-mono">
            <span>6 ص</span>
            <span>8 ص</span>
            <span>10 ص</span>
            <span>12 م</span>
            <span>2 م</span>
            <span>6 م</span>
          </div>
        </div>
      );
    }

    if (type === 'ROTATION') {
      const cropName = parts[2] || 'ذرة شامية';
      const profitK = parts[3] || '52';
      const waterPct = parts[4] || '24';
      return (
        <div key={rawToken} className="my-2.5 p-3.5 rounded-2xl bg-white border border-[#384536]/15 space-y-2 shadow-xs not-prose text-[#243023]">
          <div className="flex items-center gap-2">
            <span className="text-xl p-1 rounded-xl bg-[#EDE6D9] border border-[#384536]/10">🌽</span>
            <div>
              <span className="text-[10px] text-[#384536] font-bold block">ترشيح الدورة الذكية</span>
              <span className="text-xs font-black text-[#243023]">{cropName}</span>
            </div>
          </div>
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#576855] text-[11px] font-bold">💰 المكسب:</span>
              <div className="flex-1 mx-2 h-2 rounded-full bg-[#EDE6D9] overflow-hidden">
                <div className="h-full rounded-full bg-[#2F6E3E]" style={{ width: '85%' }} />
              </div>
              <span className="font-mono font-bold text-[#2F6E3E] text-[11px]">+{profitK}k ج/ف</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#576855] text-[11px] font-bold">💧 توفير المياه:</span>
              <div className="flex-1 mx-2 h-2 rounded-full bg-[#EDE6D9] overflow-hidden">
                <div className="h-full rounded-full bg-[#384536]" style={{ width: '70%' }} />
              </div>
              <span className="font-mono font-bold text-[#384536] text-[11px]">وفر {waterPct}%</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Split content by widget tags if any
  const widgetRegex = /(\[WIDGET:[A-Z_]+:[^\]]+\])/g;
  const segments = content.split(widgetRegex);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-inherit leading-relaxed font-sans">
      {segments.map((seg, idx) => {
        if (seg.startsWith('[WIDGET:') && seg.endsWith(']')) {
          return renderInlineWidget(seg);
        }

        return (
          <ReactMarkdown
            key={idx}
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-inherit">{children}</p>,
              strong: ({ children }) => <strong className="font-black text-inherit">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc pr-4 pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pr-4 pl-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-inherit leading-normal">{children}</li>,
              h3: ({ children }) => <h3 className="text-sm font-black text-inherit mt-3 mb-1.5 flex items-center gap-1.5">{children}</h3>,
              h4: ({ children }) => <h4 className="text-xs font-bold text-[#384536] mt-2 mb-1">{children}</h4>,
              blockquote: ({ children }) => (
                <blockquote className="border-r-2 rtl:border-r-2 rtl:border-l-0 ltr:border-l-2 ltr:border-r-0 border-[#384536] px-3 py-1.5 my-2 italic bg-[#EDE6D9]/50 rounded-xl text-inherit">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 text-xs font-mono rounded bg-[#EDE6D9] text-[#384536]">
                  {children}
                </code>
              ),
              table: ({ children }) => (
                <div className="my-3 overflow-x-auto rounded-2xl border border-[#384536]/15 bg-[#FAF7F2] shadow-sm not-prose">
                  <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse font-sans">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-[#EDE6D9] border-b border-[#384536]/15 text-[#243023] font-extrabold text-[11px] uppercase tracking-wider">
                  {children}
                </thead>
              ),
              tbody: ({ children }) => (
                <tbody className="divide-y divide-[#384536]/10 text-[#243023] font-medium">
                  {children}
                </tbody>
              ),
              tr: ({ children }) => (
                <tr className="hover:bg-[#EDE6D9]/30 transition-colors">
                  {children}
                </tr>
              ),
              th: ({ children }) => (
                <th className="px-3.5 py-2.5 font-black text-[#243023] whitespace-nowrap">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3.5 py-2.5 whitespace-nowrap text-[#576855]">
                  {children}
                </td>
              ),
            }}
          >
            {seg}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}
