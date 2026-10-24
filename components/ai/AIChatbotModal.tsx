"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  X,
  Send,
  Loader2,
  Sparkles,
  RefreshCw,
  Lightbulb,
  Copy,
  Check,
  User,
  AlertCircle,
  Square,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Film,
  PenTool,
  Briefcase,
  Calendar,
  Layers,
  Wand2,
  TrendingUp,
  Award,
  Search,
  Globe,
} from "lucide-react";
import { ChatMessage, AssistantContext } from "@/lib/ai/types";
import {
  RecommendedCreatorItem,
  RecommendedCampaignItem,
  CreatorComparisonItem,
} from "@/lib/ai/chatbot-engine";
import {
  RecommendedCreatorCard,
  RecommendedCampaignCard,
  CreatorComparisonCard,
} from "@/components/ai/ChatbotCards";
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
  getChatbotStrings,
  getLanguageMetadata,
} from "@/lib/ai/multilingual";
import { getCurrentUser } from "@/lib/auth";

export interface AIChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: "brand" | "influencer" | "creator";
  userNiche?: string;
  creatorId?: string;
  userName?: string;
}

interface EnrichedChatMessage extends ChatMessage {
  id?: string;
  provider?: string;
  model?: string;
  timestamp?: string;
  recommendedCreators?: RecommendedCreatorItem[];
  recommendedCampaigns?: RecommendedCampaignItem[];
  comparisonData?: CreatorComparisonItem[];
  detectedLanguage?: SupportedLanguageCode;
  effectiveLanguage?: SupportedLanguageCode;
  dir?: "ltr" | "rtl";
}

const PLATFORMS = [
  "Multi-Platform",
  "Instagram",
  "TikTok",
  "YouTube Shorts",
  "LinkedIn",
  "Twitter / X",
];

const TONES = [
  "Conversational & Friendly",
  "High-Energy & Bold",
  "Authoritative & Educational",
  "Witty & Humorous",
  "Luxury & Sophisticated",
  "Inspirational & Motivating",
];

const GOALS = [
  "Viral Reach & Discovery",
  "High Engagement & Comments",
  "Lead Generation & Signups",
  "Sales Conversion & CTR",
  "Brand Awareness & Authority",
  "Audience Retention & Saves",
];

export function AIChatbotModal({
  isOpen,
  onClose,
  userRole = "creator",
  userNiche = "Beauty & Skincare",
  creatorId,
  userName,
}: AIChatbotModalProps) {
  // Allow toggling between Brand Owner and Creator assistant modes
  const [activeRole, setActiveRole] = useState<"brand" | "creator">(
    userRole === "brand" ? "brand" : "creator"
  );
  const isBrand = activeRole === "brand";

  // Multilingual State
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguageCode>("auto");
  const [lastDetectedLanguage, setLastDetectedLanguage] = useState<SupportedLanguageCode>("en");

  const effectiveLangCode = selectedLanguage === "auto" ? lastDetectedLanguage : selectedLanguage;
  const currentLangMeta = getLanguageMetadata(effectiveLangCode);
  const activeDir = currentLangMeta.dir;
  const currentStrings = getChatbotStrings(effectiveLangCode);

  // Optional Context State
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("High-Energy & Bold");
  const [goal, setGoal] = useState("Viral Reach & Discovery");
  const [targetAudience, setTargetAudience] = useState("");
  const [brandOrProduct, setBrandOrProduct] = useState("");
  const [showContextDrawer, setShowContextDrawer] = useState(false);

  // Session ID stored in browser session
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const existing = sessionStorage.getItem("ai_advisor_session_id");
        if (existing) {
          setSessionId(existing);
        } else {
          const created = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          try {
            sessionStorage.setItem("ai_advisor_session_id", created);
          } catch {}
          setSessionId(created);
        }

        // Restore language preference (guest or authenticated user scoped)
        const user = getCurrentUser();
        const userScopedKey = user ? `vericreator_user_lang_${user.id}` : null;
        const stored =
          (userScopedKey && localStorage.getItem(userScopedKey)) ||
          localStorage.getItem("vericreator_chatbot_language");
        if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
          setSelectedLanguage(stored as SupportedLanguageCode);
        }
      }
    } catch {
      setSessionId(`sess_${Date.now()}`);
    }
  }, []);

  const getGreeting = (
    role: "brand" | "creator",
    lang: SupportedLanguageCode = "auto"
  ): EnrichedChatMessage => {
    const eff = lang === "auto" ? lastDetectedLanguage : lang;
    const strings = getChatbotStrings(eff);
    const meta = getLanguageMetadata(eff);
    return {
      role: "assistant",
      content: role === "brand" ? strings.brandGreeting : strings.creatorGreeting,
      provider: "AI Assistant",
      timestamp: "Just now",
      effectiveLanguage: eff,
      dir: meta.dir,
    };
  };

  const [messages, setMessages] = useState<EnrichedChatMessage[]>([getGreeting(activeRole, selectedLanguage)]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Quick Action Suggestions by Role
  const brandQuickActions = [
    { label: "🔍 Find Skincare Creators", query: "I want to promote a skincare product. Which creators are suitable?" },
    { label: "👗 Women's Fashion", query: "Suggest creators for a women's fashion brand." },
    { label: "💰 Budget ₹10,000", query: "Which creator is best for my product with a budget of ₹10,000?" },
    { label: "⚖️ Compare Creators", query: "Compare three top creators in Technology and recommend the best match." },
    { label: "🎬 15s Reel Campaign", query: "Suggest a 15-second Instagram Reel campaign for my clothing brand." },
    { label: "👟 Nike Strategy", query: "Suggest a marketing strategy for Nike shoes." },
    { label: "📱 Samsung Smartphone", query: "How can I promote a Samsung smartphone with AI creators?" },
  ];

  const creatorQuickActions = [
    { label: "💼 Find Matching Campaigns", query: "Which campaigns match my skills and audience?" },
    { label: "💡 Skincare Content Ideas", query: "Suggest content ideas for a skincare product." },
    { label: "🎬 15s Instagram Reel", query: "How can I create a 15-second Instagram Reel?" },
    { label: "🤝 Brand Proposal", query: "Write a collaboration proposal for a clothing brand." },
    { label: "👗 Fashion Brands", query: "Which brands are suitable for my fashion profile?" },
    { label: "📈 Boost Profile & Score", query: "How can I improve my profile and AI match score?" },
  ];

  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>(
    isBrand ? currentStrings.suggestedFollowUpsBrand : currentStrings.suggestedFollowUpsCreator
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [messages, isOpen, scrollToBottom]);

  // Handle switching response language immediately and persisting preference
  const handleLanguageChange = (newLang: SupportedLanguageCode) => {
    setSelectedLanguage(newLang);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("vericreator_chatbot_language", newLang);
        const user = getCurrentUser();
        if (user) {
          localStorage.setItem(`vericreator_user_lang_${user.id}`, newLang);
        }
        document.cookie = `vericreator_chatbot_lang=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {}

    if (messages.length <= 1) {
      setMessages([getGreeting(activeRole, newLang)]);
    }

    const eff = newLang === "auto" ? lastDetectedLanguage : newLang;
    const strings = getChatbotStrings(eff);
    setSuggestedPrompts(
      activeRole === "brand" ? strings.suggestedFollowUpsBrand : strings.suggestedFollowUpsCreator
    );
  };

  // Handle switching between Brand and Creator assistant mode
  const handleRoleSwitch = (newRole: "brand" | "creator") => {
    setActiveRole(newRole);
    if (messages.length <= 1) {
      setMessages([getGreeting(newRole, selectedLanguage)]);
    }
    const eff = selectedLanguage === "auto" ? lastDetectedLanguage : selectedLanguage;
    const strings = getChatbotStrings(eff);
    setSuggestedPrompts(
      newRole === "brand" ? strings.suggestedFollowUpsBrand : strings.suggestedFollowUpsCreator
    );
  };

  // Load persisted history from Supabase if available
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    async function loadPastHistory() {
      try {
        const res = await fetch(`/api/ai-advisor?sessionId=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
          const loaded: EnrichedChatMessage[] = data.messages.map((m: any) => ({
            role: m.role,
            content: m.content,
            provider: m.metadata?.provider,
            model: m.metadata?.model,
            timestamp: new Date(m.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));
          setMessages([getGreeting(activeRole), ...loaded]);
        }
      } catch {
        // Silently keep default greeting on error
      }
    }

    loadPastHistory();
  }, [isOpen, sessionId, activeRole]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string, isRegenerate = false) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    // Ensure session ID is initialized
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      activeSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ai_advisor_session_id", activeSessionId);
        }
      } catch {}
      setSessionId(activeSessionId);
    }

    setError(null);
    if (!isRegenerate) {
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }

    const newMessages: EnrichedChatMessage[] = isRegenerate
      ? (messages[messages.length - 1]?.role === "assistant" ? messages.slice(0, -1) : [...messages])
      : [
          ...messages,
          {
            role: "user",
            content: text,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ];

    setMessages(newMessages);
    setLoading(true);

    abortControllerRef.current = new AbortController();

    const contextPayload: AssistantContext = {
      role: activeRole,
      niche: userNiche,
      platform,
      targetAudience: targetAudience.trim() || undefined,
      brandOrProduct: brandOrProduct.trim() || undefined,
      tone,
      contentGoal: goal,
      creatorId,
    };

    try {
      const res = await fetch("/api/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          userContext: {
            ...contextPayload,
            preferredLanguage: selectedLanguage,
          },
          sessionId: activeSessionId,
          preferredLanguage: selectedLanguage,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to receive response from AI Assistant");
      }

      if (data.detectedLanguage) {
        setLastDetectedLanguage(data.detectedLanguage);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          provider: data.provider,
          model: data.model,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          recommendedCreators: data.recommendedCreators,
          recommendedCampaigns: data.recommendedCampaigns,
          comparisonData: data.comparisonData,
          detectedLanguage: data.detectedLanguage,
          effectiveLanguage: data.effectiveLanguage,
          dir: data.dir || (data.effectiveLanguage === "ar" ? "rtl" : "ltr"),
        },
      ]);

      if (Array.isArray(data.suggestedFollowUps) && data.suggestedFollowUps.length > 0) {
        setSuggestedPrompts(data.suggestedFollowUps);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⏹️ *[Generation was stopped by the user]*",
            provider: "user-stopped",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        return;
      }

      console.error("AI Assistant error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Network error. Please check your connection and retry."
      );
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRegenerate = () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      handleSend(lastUserMessage.content, true);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleReset = () => {
    handleStop();
    setMessages([getGreeting(activeRole, selectedLanguage)]);
    const eff = selectedLanguage === "auto" ? lastDetectedLanguage : selectedLanguage;
    const strings = getChatbotStrings(eff);
    setSuggestedPrompts(
      activeRole === "brand" ? strings.suggestedFollowUpsBrand : strings.suggestedFollowUpsCreator
    );
    setError(null);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  const activeQuickActions = isBrand ? brandQuickActions : creatorQuickActions;
  const hasOnlyGreeting = messages.length === 1 && messages[0].role === "assistant";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Creative & Marketing Assistant"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-white w-full max-w-3xl h-[94vh] sm:h-[740px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Bot className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">{currentStrings.title}</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {currentStrings.liveBadge}
                </span>
              </div>

              {/* Role Toggle Switcher in Header */}
              <div className="flex items-center gap-2 mt-1">
                <div className="inline-flex bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/80 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch("brand")}
                    className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                      isBrand
                        ? "bg-indigo-600 text-white shadow-xs font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {currentStrings.roleBrand}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch("creator")}
                    className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                      !isBrand
                        ? "bg-indigo-600 text-white shadow-xs font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {currentStrings.roleCreator}
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 hidden sm:inline">•</span>
                <span className="text-[11px] text-slate-300 hidden sm:inline">{userNiche}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language Selector */}
            <div className="relative inline-flex items-center">
              <label htmlFor="chatbot-language-select" className="sr-only">
                {currentStrings.selectLanguageLabel}
              </label>
              <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700/90 rounded-xl text-xs font-medium transition shadow-xs">
                <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" aria-hidden="true" />
                <select
                  id="chatbot-language-select"
                  aria-label={currentStrings.selectLanguageLabel}
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguageCode)}
                  className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-100 py-1">
                      {lang.code === "auto" ? "🌐 Auto-detect" : `${lang.nativeName} (${lang.name})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Context Controls Toggle */}
            <button
              type="button"
              onClick={() => setShowContextDrawer((prev) => !prev)}
              aria-label="Toggle Context & Settings"
              className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                showContextDrawer
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentStrings.contextButton}</span>
              {showContextDrawer ? (
                <ChevronUp className="w-3 h-3 hidden sm:inline" />
              ) : (
                <ChevronDown className="w-3 h-3 hidden sm:inline" />
              )}
            </button>

            {/* Clear Chat */}
            <button
              type="button"
              onClick={handleReset}
              title="Clear conversation"
              aria-label="Clear conversation"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center gap-1 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentStrings.clearButton}</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label={currentStrings.closeButton}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expandable Context & Tone Drawer */}
        {showContextDrawer && (
          <div className="bg-slate-900 border-b border-indigo-900/50 p-4 text-xs text-slate-200 animate-slideDown shrink-0">
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  Customize Target Context & Output Tone ({isBrand ? "Brand Marketer" : "Creator"})
                </span>
                <span className="text-[10px] text-slate-400">
                  Applied to all forthcoming responses
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Target Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Desired Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    {TONES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Content Goal</label>
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    {GOALS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Specific Product or Brand Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={brandOrProduct}
                    onChange={(e) => setBrandOrProduct(e.target.value)}
                    placeholder="e.g. Nike Air Max, Samsung S24, Skincare Serum"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Target Demographic / Persona (Optional)
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Gen Z skincare enthusiasts, B2B founders"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages Stream */}
        <div
          role="log"
          aria-live="polite"
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/70"
        >
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  dir={m.dir || (m.role === "assistant" && activeDir === "rtl" ? "rtl" : undefined)}
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-none shadow-md"
                      : "bg-white text-slate-800 rounded-tl-none border border-slate-200/90 shadow-sm"
                  } ${m.dir === "rtl" ? "text-right" : ""}`}
                >
                  <div className="whitespace-pre-wrap font-sans space-y-2.5 selection:bg-indigo-100 selection:text-indigo-900">
                    {m.content}
                  </div>

                  {/* Render Recommended Creators if available */}
                  {!isUser &&
                    m.recommendedCreators &&
                    m.recommendedCreators.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <h4 className="font-bold text-xs text-slate-900">
                            Verified Creator Recommendations ({m.recommendedCreators.length} Matches)
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {m.recommendedCreators.map((creator) => (
                            <RecommendedCreatorCard key={creator.id} creator={creator} />
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Render Recommended Campaigns if available */}
                  {!isUser &&
                    m.recommendedCampaigns &&
                    m.recommendedCampaigns.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-indigo-600" />
                          <h4 className="font-bold text-xs text-slate-900">
                            Matching Brand Campaigns ({m.recommendedCampaigns.length})
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {m.recommendedCampaigns.map((camp) => (
                            <RecommendedCampaignCard key={camp.id} campaign={camp} />
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Render Creator Comparison Table if available */}
                  {!isUser && m.comparisonData && m.comparisonData.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <CreatorComparisonCard comparison={m.comparisonData} />
                    </div>
                  )}

                  {!isUser && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-500">
                          {m.provider ? m.provider.replace("-", " ") : "Assistant"}
                        </span>
                        {m.timestamp && <span>• {m.timestamp}</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(m.content, idx)}
                          aria-label="Copy AI response"
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {/* Regenerate Button (on latest assistant response) */}
                        {idx === messages.length - 1 && idx > 0 && !loading && (
                          <button
                            type="button"
                            onClick={handleRegenerate}
                            aria-label="Regenerate response"
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition cursor-pointer ml-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Regenerate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick-Start Cards for Empty State */}
          {hasOnlyGreeting && (
            <div className="pt-2 pb-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    Quick-Start Questions for {isBrand ? "Brand Owners" : "Creators"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Click any card to ask</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeQuickActions.map((action, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(action.query)}
                    className="p-3 rounded-2xl bg-white hover:bg-indigo-50/70 border border-slate-200/90 hover:border-indigo-200 text-left transition group cursor-pointer shadow-2xs"
                  >
                    <div className="font-semibold text-xs text-slate-800 group-hover:text-indigo-900 flex items-center justify-between">
                      <span>{action.label}</span>
                      <Sparkles className="w-3 h-3 text-slate-300 group-hover:text-indigo-600 transition" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      &quot;{action.query}&quot;
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Indicator with Stop Generation */}
          {loading && (
            <div className="flex gap-3 justify-start items-center text-slate-500 text-xs py-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white border border-slate-200/90 px-4 py-3 rounded-2xl shadow-sm text-slate-700 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>{currentStrings.typingIndicator}</span>
                </div>
                <button
                  type="button"
                  onClick={handleStop}
                  aria-label={currentStrings.stopButton}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-rose-600 text-rose-600" />
                  <span>{currentStrings.stopButton}</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Banner with Retry */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const lastUser = [...messages].reverse().find((m) => m.role === "user");
                  if (lastUser) handleSend(lastUser.content);
                }}
                className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition cursor-pointer shrink-0"
              >
                {currentStrings.retryButton}
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Suggested Prompts Carousel */}
        <div className="p-2 sm:px-4 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-500" />
            Quick Ideas:
          </span>
          {suggestedPrompts.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(q)}
              disabled={loading}
              className="text-[11px] whitespace-nowrap bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium py-1.5 px-3 rounded-full border border-slate-200/60 transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Form with Multiline Support & Keybindings */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-col gap-2 shrink-0"
        >
          <div className="flex items-end gap-2">
            <div className="flex-1 relative rounded-2xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                maxLength={4000}
                placeholder={currentStrings.inputPlaceholder}
                dir={activeDir}
                disabled={loading}
                aria-label={currentStrings.inputPlaceholder}
                className={`w-full px-4 py-3 bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none max-h-36 overflow-y-auto leading-relaxed ${
                  activeDir === "rtl" ? "text-right" : "text-left"
                }`}
              />
              <div className="px-3 pb-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span className="hidden sm:inline">
                  {currentStrings.escrowNotice}
                </span>
                <span className="ml-auto">{input.length}/4000</span>
              </div>
            </div>

            {loading ? (
              <button
                type="button"
                onClick={handleStop}
                aria-label={currentStrings.stopButton}
                title={currentStrings.stopButton}
                className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md transition cursor-pointer flex items-center justify-center shrink-0 mb-2"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label={currentStrings.sendButton}
                title={currentStrings.sendButton}
                className="p-3.5 rounded-2xl bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 disabled:opacity-40 transition cursor-pointer flex items-center justify-center shrink-0 mb-2"
              >
                <Send className={`w-4 h-4 ${activeDir === "rtl" ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
