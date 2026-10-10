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
} from "lucide-react";
import { ChatMessage, AssistantContext } from "@/lib/ai/types";

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
  const isBrand = userRole === "brand";

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
          return;
        }
        const created = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        try {
          sessionStorage.setItem("ai_advisor_session_id", created);
        } catch {}
        setSessionId(created);
      }
    } catch {
      setSessionId(`sess_${Date.now()}`);
    }
  }, []);

  const defaultGreeting: EnrichedChatMessage = {
    role: "assistant",
    content: isBrand
      ? `👋 **Hello! I'm your Production AI Assistant for Brand Marketing.**\n\nI support free-form and guided requests across:\n- 🎬 **Campaign Concepts & Deliverables**: High-ROI briefs for **${userNiche}**\n- 🤝 **Influencer Collaboration**: Outreach pitches, contracts, and compensation benchmarks\n- ✍️ **Product Copy & Ad Angles**: Captions, hooks, and sales scripts\n- 📅 **Campaign Calendars**: Omnichannel launch schedules\n\nEnter any custom request below, or choose an example prompt to get started!`
      : `👋 **Hi ${userName || "Creator"}! I'm your Production AI Creative Assistant.**\n\nI can help you build and scale your presence in **${userNiche}**:\n- 🎬 **Reel / Video Scripts**: Scene-by-scene shot lists with 3-second hooks & audio cues\n- ✍️ **Captions & Viral Hooks**: Multi-platform copy with high-save hashtag clusters\n- 📅 **7-Day Content Schedules**: Structured daily posting plans with format guidelines\n- 💼 **Brand Deals & Monetization**: Value-based pricing, pitch letters, and escrow deals\n- 🔄 **Rewriting & Polishing**: Improving tone, structure, and readability\n\nEnter any free-form request or pick from the ideas below!`,
    provider: "AI Assistant",
    timestamp: "Just now",
  };

  const [messages, setMessages] = useState<EnrichedChatMessage[]>([defaultGreeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([
    "Suggest content ideas for my niche.",
    "How can I increase audience engagement?",
    "Create a weekly content plan.",
    "How can I monetize my content?",
  ]);

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
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }));
          setMessages([defaultGreeting, ...loaded]);
        }
      } catch {
        // Silently keep default greeting on error
      }
    }

    loadPastHistory();
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string, isRegenerate = false) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    // Ensure session ID is initialized before making the API request
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
      // Reset textarea height
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }

    const newMessages: EnrichedChatMessage[] = isRegenerate
      ? [...messages]
      : [
          ...messages,
          {
            role: "user",
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ];

    setMessages(newMessages);
    setLoading(true);

    // Initialize AbortController for cancel generation
    abortControllerRef.current = new AbortController();

    const contextPayload: AssistantContext = {
      role: isBrand ? "brand" : "creator",
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
          userContext: contextPayload,
          sessionId: activeSessionId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to receive response from AI Assistant");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          provider: data.provider,
          model: data.model,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
    setMessages([defaultGreeting]);
    setSuggestedPrompts([
      "Suggest content ideas for my niche.",
      "How can I increase audience engagement?",
      "Create a weekly content plan.",
      "How can I monetize my content?",
    ]);
    setError(null);
    setInput("");
  };

  // Keyboard Navigation: Enter submits, Shift+Enter adds newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  // Categorized Empty State Prompts
  const promptCategories = [
    {
      category: "Reels & Scripts",
      icon: Film,
      color: "text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200",
      prompts: [
        `Write a 30s viral Reel script for ${userNiche} with shot list and hooks`,
        `Create a high-retention 15s TikTok concept demonstrating ${brandOrProduct || "my core tool"}`,
      ],
    },
    {
      category: "Captions & Hooks",
      icon: PenTool,
      color: "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200",
      prompts: [
        `Give me 5 viral hooks and a high-converting caption with hashtags for ${platform}`,
        `Generate 3 persuasive calls-to-action (CTAs) that drive comments and saves`,
      ],
    },
    {
      category: "Brand & Campaigns",
      icon: Briefcase,
      color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
      prompts: [
        isBrand
          ? `Draft an influencer collaboration brief for a ${userNiche} product launch`
          : `Write a compelling 3-sentence sponsorship pitch letter to a brand in ${userNiche}`,
        `What deliverables and commercial ad usage rights should be included in a creator contract?`,
      ],
    },
    {
      category: "Strategy & Calendar",
      icon: Calendar,
      color: "text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200",
      prompts: [
        `Create a 7-day content schedule for ${platform} optimized for ${goal}`,
        `How can I increase my audience retention rate within the first 3 seconds?`,
      ],
    },
  ];

  const hasOnlyGreeting = messages.length === 1 && messages[0].role === "assistant";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Creative & Marketing Assistant"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-white w-full max-w-3xl h-[94vh] sm:h-[720px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Bot className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">AI Creative Assistant</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live AI
                </span>
              </div>
              <p className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5">
                <span>{isBrand ? "Brand Marketer" : "Creator"}</span>
                <span>•</span>
                <span>{userNiche}</span>
                <span>•</span>
                <span>{platform}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
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
              <span className="hidden sm:inline">Context</span>
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
              <span className="hidden sm:inline">Clear</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close assistant"
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
                  Customize Target Context & Output Tone
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
                    placeholder="e.g. Lumina Skin Glow, AutoScribe AI"
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
                  className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-none shadow-md"
                      : "bg-white text-slate-800 rounded-tl-none border border-slate-200/90 shadow-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans space-y-2.5 selection:bg-indigo-100 selection:text-indigo-900">
                    {m.content}
                  </div>

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

          {/* Categorized Example Prompts in Empty State */}
          {hasOnlyGreeting && (
            <div className="pt-2 pb-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 px-1">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Explore Prompt Templates by Category</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {promptCategories.map((cat, ci) => {
                  const CatIcon = cat.icon;
                  return (
                    <div
                      key={ci}
                      className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-2"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                        <CatIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{cat.category}</span>
                      </div>
                      <div className="space-y-1.5">
                        {cat.prompts.map((p, pi) => (
                          <button
                            key={pi}
                            type="button"
                            onClick={() => handleSend(p)}
                            disabled={loading}
                            className="w-full text-left text-[11px] leading-snug p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-900 border border-slate-100 transition cursor-pointer text-slate-600 flex items-start justify-between gap-1 group"
                          >
                            <span className="line-clamp-2">{p}</span>
                            <Sparkles className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5 transition" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
                  <span>Generating tailored marketing recommendations...</span>
                </div>
                <button
                  type="button"
                  onClick={handleStop}
                  aria-label="Stop generation"
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-rose-600 text-rose-600" />
                  <span>Stop</span>
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
                Retry
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Suggested Prompts Carousel */}
        <div className="p-2 sm:px-4 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-500" />
            Suggested:
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
                placeholder={
                  isBrand
                    ? "Ask about influencer outreach, Reel concepts, ad copy, campaigns... (Shift+Enter for new line)"
                    : "Ask for Reel scripts, hooks, calendars, brand pitch letters... (Shift+Enter for new line)"
                }
                disabled={loading}
                aria-label="Type your message"
                className="w-full px-4 py-3 bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none max-h-36 overflow-y-auto leading-relaxed"
              />
              <div className="px-3 pb-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span className="hidden sm:inline">
                  Press <kbd className="px-1 py-0.5 rounded bg-slate-200/70 font-mono text-[9px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-slate-200/70 font-mono text-[9px]">Shift+Enter</kbd> for newline
                </span>
                <span className="ml-auto">{input.length}/4000</span>
              </div>
            </div>

            {loading ? (
              <button
                type="button"
                onClick={handleStop}
                aria-label="Stop generating response"
                className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md transition cursor-pointer flex items-center justify-center shrink-0 mb-2"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="p-3.5 rounded-2xl bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 disabled:opacity-40 transition cursor-pointer flex items-center justify-center shrink-0 mb-2"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
