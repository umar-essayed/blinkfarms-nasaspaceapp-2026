'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Language, ChatMessage } from '@/lib/types';
import MarkdownMessage, { AnimatedStreamingMessage } from '@/components/MarkdownMessage';
import ToolExecutionBadge from '@/components/ToolExecutionBadge';
import { SendIcon } from '@/components/Icons';
import LiveVoiceOverlay from '@/components/LiveVoiceOverlay';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export default function DedicatedChatPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false); // Start collapsed so user sees active chat immediately
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [centralMemory, setCentralMemory] = useState<string[]>([]);
  const [isVoiceOverlayOpen, setIsVoiceOverlayOpen] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleToggleDictation = async () => {
    if (isDictating) {
      setIsDictating(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      return;
    }

    if (typeof window === 'undefined') return;

    // 1. Try browser SpeechRecognition for immediate text stream
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let recognitionSuccess = false;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = lang === 'ar' ? 'ar-EG' : 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsDictating(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((res: any) => res[0].transcript)
            .join('');
          if (transcript.trim()) {
            setInputText(transcript);
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('SpeechRecognition warning:', err);
        };

        recognition.onend = () => {
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
            setIsDictating(false);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        recognitionSuccess = true;
      } catch (e) {
        console.warn('SpeechRecognition failed to start', e);
      }
    }

    // 2. High-precision Whisper MediaRecorder fallback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const options: MediaRecorderOptions = {};
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      }

      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsDictating(false);

        const chunks = audioChunksRef.current;
        if (chunks.length === 0) return;

        const blob = new Blob(chunks, { type: options.mimeType || 'audio/webm' });
        if (blob.size < 600) return;

        try {
          const formData = new FormData();
          formData.append('audio', blob, 'dictation.webm');
          formData.append('lang', lang);

          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            const text = (data.text || '')
              .replace(/\[موسيقى\]|\[Music\]|\(موسيقى\)|موسيقى/gi, '')
              .trim();
            if (text) {
              setInputText((prev) => {
                if (prev.includes(text)) return prev;
                return prev ? `${prev} ${text}` : text;
              });
            }
          }
        } catch (err) {
          console.warn('Audio transcribe failed', err);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsDictating(true);
    } catch (micErr) {
      console.warn('Microphone stream error:', micErr);
      if (!recognitionSuccess) {
        setIsDictating(false);
        alert(
          lang === 'ar'
            ? 'تعذر الوصول إلى الميكروفون. يرجى تفعيل إذن الميكروفون في المتصفح.'
            : 'Could not access microphone. Please check browser microphone permissions.'
        );
      }
    }
  };

  // Field & User Context State
  const [farmerName, setFarmerName] = useState('يا طيب');
  const [fieldName, setFieldName] = useState('دلتا النيل (طنطا / الغربية)');
  const [areaFeddan, setAreaFeddan] = useState(15);
  const [wizardData, setWizardData] = useState<any>(null);
  const [weatherSummary, setWeatherSummary] = useState<string>('حرارة معتدلة 26°C، رطوبة متزنة، شمس ساطعة');

  // Initialize and load sessions & central memory from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }

    const savedLang = localStorage.getItem('blinkfarms_lang') as Language;
    if (savedLang) {
      setLang(savedLang);
      document.documentElement.lang = savedLang;
      document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    }

    // Read Central Cross-Session Memory
    const savedCentralMem = localStorage.getItem('blinkfarms_central_memory');
    if (savedCentralMem) {
      try {
        setCentralMemory(JSON.parse(savedCentralMem));
      } catch {}
    }

    // Read logged in user
    const savedUser = localStorage.getItem('blinkfarms_auth_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.name) setFarmerName(u.name.split(' ')[0]);
      } catch {}
    }

    // Read Wizard answers
    const savedWizard = localStorage.getItem('blinkfarms_wizard_answers');
    if (savedWizard) {
      try {
        const w = JSON.parse(savedWizard);
        setWizardData(w);
        if (w.areaFeddan) setAreaFeddan(w.areaFeddan);
      } catch {}
    }

    // Load or create initial chat session
    const savedSessions = localStorage.getItem('blinkfarms_chat_sessions_v2');
    if (savedSessions) {
      try {
        const parsed: ChatSession[] = JSON.parse(savedSessions);
        if (parsed.length > 0) {
          const cleaned = parsed.map((s) => ({
            ...s,
            messages: s.messages.filter((m) => {
              const text = (m.content || '').trim().toLowerCase();
              return text !== 'موسيقى' && text !== '[موسيقى]' && text !== 'music' && text !== '[music]' && text.length > 0;
            }),
          }));
          setSessions(cleaned);
          setActiveSessionId(cleaned[0].id);
          return;
        }
      } catch (e) {
        console.error('Failed to parse sessions', e);
      }
    }

    // Create default initial session if none exists
    createNewSession(savedLang || 'en');
  }, []);

  // Handle auto-injected prompt from rotation planner or external links
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const incomingPrompt = urlParams.get('prompt');
    if (incomingPrompt && incomingPrompt.trim() && activeSession) {
      setInputText(incomingPrompt);
      const timer = setTimeout(() => {
        handleSendMessage(incomingPrompt);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [activeSessionId]);

  const createNewSession = (currentLang: Language = lang) => {
    const newId = `session_${Date.now()}`;
    const welcomeMsg: ChatMessage = {
      id: `welcome_${Date.now()}`,
      sender: 'assistant',
      content: currentLang === 'ar' ? 'أهلاً بك! كيف أساعدك اليوم؟' : 'Welcome! How can I help today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newSession: ChatSession = {
      id: newId,
      title: currentLang === 'ar' ? 'محادثة إرشادية جديدة' : 'New Advisory Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [welcomeMsg],
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev];
      localStorage.setItem('blinkfarms_chat_sessions_v2', JSON.stringify(updated));
      return updated;
    });
    setActiveSessionId(newId);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isChatLoading]);

  const toggleLang = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('blinkfarms_lang', nextLang);
    document.documentElement.lang = nextLang;
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleDeleteSession = (sessionIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== sessionIdToDelete);
    setSessions(updated);
    localStorage.setItem('blinkfarms_chat_sessions_v2', JSON.stringify(updated));

    if (activeSessionId === sessionIdToDelete) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const QUICK_PROMPTS =
    lang === 'ar'
      ? [
          '💧 محتاج أروي النهاردة ولا لأ، وكم متر مكعب للفدان؟',
          '🌾 إيه أفضل دورة زراعية بعد محصولي الحالي توفر ميه؟',
          '🌡️ الجو والأرصاد في حقلي النهاردة مناسبين للرش؟',
          '🛠️ إزاي أعالج كتمة وانضغاط باطن التربة بيولوجياً؟',
        ]
      : [
          '💧 Should I irrigate today? Exact m³/feddan needed?',
          '🌾 Best 3-year crop succession to save water after my crop?',
          '🌡️ Are weather & wind conditions safe for spraying today?',
          '🛠️ How do I biologically remediate subsoil compaction?',
        ];

  const handleVoiceNewMessage = (userText: string, assistantReply: string) => {
    if (!activeSession) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const botMsg: ChatMessage = {
      id: `bot_${Date.now() + 1}`,
      sender: 'assistant',
      content: assistantReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    let newTitle = activeSession.title;
    if (activeSession.messages.length <= 1) {
      newTitle = userText.length > 28 ? userText.substring(0, 28) + '...' : userText;
    }

    const updatedSession: ChatSession = {
      ...activeSession,
      title: newTitle,
      updatedAt: new Date().toISOString(),
      messages: [...activeSession.messages, userMsg, botMsg],
    };

    const newSessionsList = sessions.map((s) => (s.id === activeSession.id ? updatedSession : s));
    setSessions(newSessionsList);
    localStorage.setItem('blinkfarms_chat_sessions_v2', JSON.stringify(newSessionsList));
  };

  const handleSpeakMessage = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;

    if (speakingMessageId === msgId) {
      try { synth.cancel(); } catch {}
      setSpeakingMessageId(null);
      return;
    }

    try {
      synth.cancel();
      synth.resume();
    } catch {}

    setSpeakingMessageId(msgId);

    // Clean text for speech
    const clean = text
      .replace(/\[MEMORY:[^\]]+\]/g, '')
      .replace(/\[موسيقى\]|\[Music\]/gi, '')
      .replace(/[\*#_`~>]/g, '')
      .replace(/\|/g, ' ')
      .replace(/-{3,}/g, '')
      .trim();

    if (!clean) {
      setSpeakingMessageId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    const hasArabic = /[\u0600-\u06FF]/.test(clean);
    utterance.lang = hasArabic ? 'ar-EG' : (lang === 'ar' ? 'ar-EG' : 'en-US');
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const pickVoice = () => {
      const voices = synth.getVoices();
      if (voices && voices.length > 0) {
        const prefix = hasArabic ? 'ar' : (lang === 'ar' ? 'ar' : 'en');
        const match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
        if (match) utterance.voice = match;
      }
    };

    pickVoice();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = pickVoice;
    }

    utterance.onend = () => {
      setSpeakingMessageId(null);
      delete (window as any).__activeChatUtterance;
    };
    utterance.onerror = () => {
      setSpeakingMessageId(null);
      delete (window as any).__activeChatUtterance;
    };

    // Keep reference in window to prevent Chrome GC reaping it mid-speech
    (window as any).__activeChatUtterance = utterance;

    try {
      synth.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis speak failed', e);
      setSpeakingMessageId(null);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const q = textToSend || inputText;
    if (!q.trim() || isChatLoading || !activeSession) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update active session locally
    const currentMessages = [...activeSession.messages, userMsg];
    let newTitle = activeSession.title;
    if (activeSession.messages.length <= 1) {
      newTitle = q.length > 28 ? q.substring(0, 28) + '...' : q;
    }

    const updatedSession: ChatSession = {
      ...activeSession,
      title: newTitle,
      updatedAt: new Date().toISOString(),
      messages: currentMessages,
    };

    const newSessionsList = sessions.map((s) => (s.id === activeSession.id ? updatedSession : s));
    setSessions(newSessionsList);
    localStorage.setItem('blinkfarms_chat_sessions_v2', JSON.stringify(newSessionsList));
    setInputText('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          lang,
          centralMemory, // Cross-session permanent memory
          history: currentMessages.map((m) => ({
            role: m.sender === 'assistant' ? 'assistant' : 'user',
            content: m.content || '',
          })),
          context: {
            fieldName,
            areaFeddan,
            canopyTempAnomalyC: 2.6,
            prescribedIrrigationMm: 5.6,
            hardpanDetected: wizardData?.subsoilIssue === 'hardpan',
            previousCrop: wizardData?.previousCrop || 'برسيم بلدي',
            soilType: wizardData?.soilType || 'طميية ثقيلة',
            irrigationType: wizardData?.irrigationType || 'تنقيط',
            primaryPriority: wizardData?.primaryPriority || 'water',
            recommendedRotationTitle: 'الدورة التكيفية المتوازنة (برسيم ➔ قمح ديورم ➔ عباد شمس)',
            waterSavedPercent: 46,
            weatherSummary,
            agentMemory: [
              `المساحة: ${areaFeddan} فدان`,
              `المحصول السابق: ${wizardData?.previousCrop || 'برسيم'}`,
              `التربة: ${wizardData?.soilType || 'طميية'}`,
              `نظام الري: ${wizardData?.irrigationType || 'تنقيط'}`,
            ],
          },
        }),
      });

      const data = await res.json();
      let rawBotReply = data.reply || (lang === 'ar' ? 'تم استلام استفسارك يا هندسة.' : 'Query processed.');

      // Extract and save central memory tags [MEMORY: key = value]
      const learnedList: string[] = Array.isArray(data.learnedMemory) ? [...data.learnedMemory] : [];
      const memMatches = rawBotReply.match(/\[MEMORY:\s*(.*?)\]/g);
      if (memMatches) {
        memMatches.forEach((mStr: string) => {
          const item = mStr.replace(/\[MEMORY:\s*|\]/g, '').trim();
          if (item && !learnedList.includes(item)) {
            learnedList.push(item);
          }
        });
      }

      if (learnedList.length > 0) {
        let currentMem: string[] = JSON.parse(localStorage.getItem('blinkfarms_central_memory') || '[]');
        learnedList.forEach((item) => {
          if (!currentMem.includes(item)) currentMem.push(item);
        });
        localStorage.setItem('blinkfarms_central_memory', JSON.stringify(currentMem));
        setCentralMemory(currentMem);
      }
      rawBotReply = rawBotReply.replace(/\[MEMORY:\s*(.*?)\]/g, '').trim();

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        content: rawBotReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolsUsed: data.invokedTools || [],
        learnedMemory: learnedList,
      };

      const finalMessages = [...currentMessages, botMsg];
      const finalizedSession = {
        ...updatedSession,
        messages: finalMessages,
      };

      const finalSessionsList = sessions.map((s) => (s.id === activeSession.id ? finalizedSession : s));
      setSessions(finalSessionsList);
      localStorage.setItem('blinkfarms_chat_sessions_v2', JSON.stringify(finalSessionsList));
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#F8F5EE] text-[#243023] font-sans select-none flex"
    >
      {/* =========================================================================
          1. CHATGPT-LIKE COLLAPSIBLE SIDEBAR
         ========================================================================= */}
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed md:relative inset-y-0 ${
          lang === 'ar' ? 'right-0' : 'left-0'
        } z-50 flex flex-col justify-between bg-[#FAF7F2] border-x border-[#384536]/10 transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          isSidebarOpen
            ? 'w-72 translate-x-0'
            : lang === 'ar'
            ? 'w-0 translate-x-full md:translate-x-0 border-none'
            : 'w-0 -translate-x-full md:translate-x-0 border-none'
        }`}
      >
        <div className="flex flex-col h-full w-72 p-4 overflow-hidden">
          {/* Sidebar Top: Brand & New Chat */}
          <div className="space-y-3 pb-3 border-b border-[#384536]/10 shrink-0">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <img src="/blink-ai-logo.png" alt="BlinkAI" className="w-8 h-8 rounded-full object-cover border border-[#384536]/30 shadow-sm" />
                <span className="font-black text-sm text-[#243023]">BlinkAI</span>
              </Link>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[#EDE6D9] text-[#576855] text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* New Chat Button */}
            <button
              onClick={() => {
                createNewSession();
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#384536] hover:bg-[#253024] text-[#FAF7F2] text-xs font-bold shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span className="text-base font-bold">+</span>
              <span>{lang === 'ar' ? 'محادثة جديدة' : 'New Chat'}</span>
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto py-2.5 space-y-1.5 scrollbar-none">
            <span className="text-[10px] font-bold text-[#7E907C] px-2 block mb-1">
              {lang === 'ar' ? 'المحادثات السابقة' : 'Past Chats'}
            </span>

            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setActiveSessionId(s.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-semibold transition-all ${
                  activeSessionId === s.id
                    ? 'bg-[#EDE6D9] text-[#384536] border border-[#384536]/15 font-bold shadow-xs'
                    : 'hover:bg-[#EDE6D9]/50 text-[#576855]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs shrink-0">💬</span>
                  <span className="truncate text-xs">{s.title}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  title={lang === 'ar' ? 'حذف' : 'Delete'}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#A8382B] hover:bg-[#A8382B]/10 text-xs transition-opacity"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* Sidebar Bottom: Cross-Session Central Memory Box */}
          <div className="pt-3 border-t border-[#384536]/10 space-y-2.5 shrink-0">
            <div className="p-3 rounded-2xl bg-[#EDE6D9]/60 space-y-1.5 border border-[#384536]/10">
              <div className="flex items-center justify-between text-xs font-bold text-[#243023]">
                <div className="flex items-center gap-1.5">
                  <span>🧠</span>
                  <span>{lang === 'ar' ? 'ذاكرة الحقل' : 'Field Memory'}</span>
                </div>
                {centralMemory.length > 0 && (
                  <button
                    onClick={() => {
                      localStorage.removeItem('blinkfarms_central_memory');
                      setCentralMemory([]);
                    }}
                    title={lang === 'ar' ? 'مسح الذاكرة' : 'Clear Memory'}
                    className="text-[10px] text-[#A8382B] hover:underline"
                  >
                    {lang === 'ar' ? 'مسح' : 'Clear'}
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {centralMemory.length === 0 ? (
                  <p className="text-[10px] text-[#7E907C] italic">
                    {lang === 'ar' ? 'يتعلم البوت تلقائياً من المحادثات' : 'Learns facts across chats'}
                  </p>
                ) : (
                  centralMemory.map((mem, idx) => (
                    <div key={idx} className="text-[10px] text-[#384536] font-medium truncate flex items-center gap-1">
                      <span>•</span>
                      <span>{mem}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Link
              href="/"
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#EDE6D9] text-[#243023] text-xs font-bold flex items-center justify-center gap-2 transition-all border border-[#384536]/10 shadow-xs"
            >
              <span>🛰️</span>
              <span>{lang === 'ar' ? 'الرجوع للرادار' : 'Back to Radar'}</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN CHAT WORKSPACE
         ========================================================================= */}
      <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden min-w-0 bg-[#F8F5EE]">
        {/* Top Header Bar */}
        <header className="h-14 sm:h-16 px-4 sm:px-6 bg-[#FAF7F2] border-b border-[#384536]/10 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl bg-[#EDE6D9] hover:bg-[#384536] hover:text-[#FAF7F2] text-[#243023] text-xs font-bold transition-all active:scale-95 shadow-xs"
              title={lang === 'ar' ? 'المحادثات والذاكرة' : 'Toggle Sidebar'}
            >
              ☰
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/blink-ai-logo.png" alt="BlinkAI" className="w-8 h-8 rounded-full object-cover border border-[#384536]/30 shrink-0 shadow-sm" />
              <div className="truncate">
                <span className="text-sm font-black text-[#243023] block truncate">
                  BlinkAI — {activeSession?.title || (lang === 'ar' ? 'مساعدك الزراعي' : 'Advisor')}
                </span>
                <span className="text-[10px] text-[#7E907C] font-semibold block truncate">
                  {fieldName} • {areaFeddan} {lang === 'ar' ? 'فدان' : 'feddans'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#EDE6D9] hover:bg-[#384536] hover:text-white text-[#243023] active:scale-95 transition-all"
            >
              {lang === 'ar' ? 'English' : 'عربي'}
            </button>
            <Link
              href="/"
              className="text-xs font-bold p-2 rounded-full bg-[#EDE6D9] text-[#576855] hover:bg-[#384536] hover:text-white active:scale-95 transition-all flex items-center justify-center w-8 h-8"
              title={lang === 'ar' ? 'الرجوع للرئيسية' : 'Back to Radar'}
            >
              <span>✕</span>
            </Link>
          </div>
        </header>

        {/* Messages List Area (Scrolling ONLY here) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5 space-y-3.5 scrollbar-thin">
          <div className="max-w-2xl mx-auto space-y-3.5">
            {activeSession?.messages.map((m, mIdx) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <img
                    src="/blink-ai-logo.png"
                    alt="BlinkAI"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-[#384536]/30 shadow-sm shrink-0"
                  />
                )}

                <div
                  className={`relative group max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-[#384536] text-[#FAF7F2] rounded-br-xs'
                      : 'bg-white text-[#243023] border border-[#384536]/10 rounded-bl-xs'
                  }`}
                >
                  {/* Tool Execution Badges (If internal engines were invoked) */}
                  {m.sender === 'assistant' && m.toolsUsed && m.toolsUsed.length > 0 && (
                    <div className="mb-2 pb-2 border-b border-[#384536]/8 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#576855]">
                        <span>⚡</span>
                        <span>{lang === 'ar' ? 'الأدوات والمحركات المفعلة:' : 'Invoked Engines & Tools:'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.toolsUsed.map((tool, idx) => (
                          <ToolExecutionBadge key={idx} tool={tool} lang={lang} />
                        ))}
                      </div>
                    </div>
                  )}

                  {m.sender === 'assistant' ? (
                    <AnimatedStreamingMessage
                      content={m.content || m.text || ''}
                      isLatest={mIdx === activeSession.messages.length - 1}
                    />
                  ) : (
                    <MarkdownMessage content={m.content || m.text || ''} />
                  )}

                  {/* Learned Memory Notification Badge */}
                  {m.sender === 'assistant' && m.learnedMemory && m.learnedMemory.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-[#384536]/8 flex items-center gap-1.5 text-[10px] text-[#2F6E3E] font-bold">
                      <span>🧠</span>
                      <span>
                        {lang === 'ar'
                          ? `تم حفظ في ذاكرة الحقل: ${m.learnedMemory.join(' • ')}`
                          : `Saved to Field Memory: ${m.learnedMemory.join(' • ')}`}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-[#384536]/8">
                    {m.sender === 'assistant' ? (
                      <button
                        onClick={() => handleSpeakMessage(m.id, m.content || m.text || '')}
                        className="text-[11px] p-1 rounded-lg hover:bg-[#FAF7F2] text-[#576855] hover:text-[#384536] transition-all flex items-center gap-1 font-medium"
                        title={speakingMessageId === m.id ? 'إيقاف الصوت' : 'استمع للإجابة بصوت المرشد'}
                      >
                        <span>{speakingMessageId === m.id ? '⏹️' : '🔊'}</span>
                        <span className="text-[10px] hidden sm:inline">
                          {speakingMessageId === m.id
                            ? (lang === 'ar' ? 'إيقاف' : 'Stop')
                            : (lang === 'ar' ? 'استمع' : 'Listen')}
                        </span>
                      </button>
                    ) : <div />}

                    <span
                      className={`text-[9px] ${
                        m.sender === 'user' ? 'text-[#FAF7F2]/80' : 'text-[#7E907C]'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Clean typing loader with dynamic Tool Calling status */}
            {isChatLoading && (
              <div className="flex gap-2.5 items-center justify-start">
                <img
                  src="/blink-ai-logo.png"
                  alt="BlinkAI"
                  className="w-7 h-7 rounded-full object-cover border border-[#384536]/30 shadow-sm shrink-0 animate-pulse"
                />
                <div className="bg-white border border-[#384536]/10 rounded-2xl px-3.5 py-2.5 shadow-sm flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#384536] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#384536] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#384536] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px] font-semibold text-[#576855] animate-pulse">
                    {lang === 'ar' ? 'جاري فحص رادار ناسا وتشغيل الأدوات الذكية...' : 'Analyzing NASA data & running crop engines...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        {activeSession?.messages.length <= 2 && (
          <div className="px-3 sm:px-5 py-1.5 shrink-0 overflow-x-auto scrollbar-none flex gap-1.5 max-w-2xl mx-auto w-full">
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white hover:bg-[#EDE6D9] border border-[#384536]/10 text-[#576855] whitespace-nowrap active:scale-95 transition-all shrink-0 shadow-xs"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Fixed Bottom Input Bar */}
        <div className="shrink-0 bg-[#FAF7F2] border-t border-[#384536]/15 p-3 sm:p-4 pb-4 sm:pb-4 shadow-lg z-20">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="max-w-2xl mx-auto flex items-center gap-2"
          >
            {/* 1. Live Voice Mode Button (Clearly labeled with pulsing green badge) */}
            <button
              type="button"
              onClick={() => setIsVoiceOverlayOpen(true)}
              className="px-3 py-2.5 rounded-2xl bg-[#EDE6D9] hover:bg-[#384536] hover:text-[#FAF7F2] text-[#243023] border border-[#384536]/15 text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0"
              title={lang === 'ar' ? 'بدء محادثة صوتية حية (لايف)' : 'Start Live Voice Call'}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#2F6E3E] animate-pulse" />
              <span>{lang === 'ar' ? 'لايف' : 'Live'}</span>
            </button>

            {/* 2. Microphone Dictation Button (Speech to Text directly into input) */}
            <button
              type="button"
              onClick={handleToggleDictation}
              className={`p-2.5 rounded-2xl border text-sm transition-all active:scale-95 shrink-0 flex items-center justify-center ${
                isDictating
                  ? 'bg-[#A8382B] text-white animate-pulse border-[#A8382B] shadow-md ring-2 ring-[#A8382B]/30'
                  : 'bg-[#EDE6D9] text-[#384536] border-[#384536]/15 hover:bg-[#E3D9C9] shadow-xs'
              }`}
              title={isDictating ? (lang === 'ar' ? 'إيقاف التسجيل' : 'Stop Dictation') : (lang === 'ar' ? 'إملاء صوتي بالميكروفون' : 'Voice Dictation')}
            >
              <span>{isDictating ? '⏹️' : '🎙️'}</span>
            </button>

            {/* 3. Text Input Box */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isDictating ? (lang === 'ar' ? 'جاري الاستماع لصوتك...' : 'Listening...') : (lang === 'ar' ? 'اسأل عن ري أرضك، الطقس، أو الدورة الزراعية...' : 'Ask about irrigation, weather, or crops...')}
              disabled={isChatLoading}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-white text-xs sm:text-sm font-medium text-[#243023] placeholder:text-[#7E907C] focus:outline-none focus:ring-2 focus:ring-[#384536] border border-[#384536]/15 shadow-sm min-w-0"
            />

            {/* 4. Send Message Button */}
            <button
              type="submit"
              disabled={isChatLoading || !inputText.trim()}
              className="p-2.5 px-3.5 rounded-2xl bg-[#384536] hover:bg-[#253024] disabled:opacity-40 text-[#FAF7F2] shadow-sm active:scale-95 transition-all shrink-0 flex items-center justify-center font-bold text-xs"
              title={lang === 'ar' ? 'إرسال' : 'Send'}
            >
              <SendIcon className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>
        </div>
      </main>

      {/* Futuristic Live Voice Call Overlay (ChatGPT / Gemini Live Experience) */}
      <LiveVoiceOverlay
        isOpen={isVoiceOverlayOpen}
        onClose={() => setIsVoiceOverlayOpen(false)}
        lang={lang}
        onNewMessage={handleVoiceNewMessage}
        centralMemory={centralMemory}
        farmContext={{
          fieldName,
          areaFeddan,
          canopyTempAnomalyC: 2.6,
          prescribedIrrigationMm: 5.6,
          hardpanDetected: wizardData?.subsoilIssue === 'hardpan',
          previousCrop: wizardData?.previousCrop || 'برسيم بلدي',
          soilType: wizardData?.soilType || 'طميية ثقيلة',
          irrigationType: wizardData?.irrigationType || 'تنقيط',
          primaryPriority: wizardData?.primaryPriority || 'water',
          recommendedRotationTitle: 'الدورة التكيفية المتوازنة (برسيم ➔ قمح ديورم ➔ عباد شمس)',
          waterSavedPercent: 46,
          weatherSummary,
        }}
      />
    </div>
  );
}
