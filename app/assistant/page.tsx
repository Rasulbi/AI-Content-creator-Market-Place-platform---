"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { getCurrentUser } from "@/lib/auth";
import {
  Bot,
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
  RotateCcw,
  Film,
  PenTool,
  Briefcase,
  Calendar,
  Layers,
  Wand2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ChatMessage, AssistantContext } from "@/lib/ai/types";

interface EnrichedChatMessage extends ChatMessage {
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
  "High-Energy & Bold",
  "Conversational & Friendly",
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

export default function AssistantWorkspacePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<"creator" | "brand">("creator");
  const [niche, setNiche] = useState("Technology & AI");
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("High-Energy & Bold");
  const [goal, setGoal] = useState("Viral Reach & Discovery");
  const [targetAudience, setTargetAudience] = useState("");
  const [brandOrProduct, setBrandOrProduct] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");

  // Safely initialize session ID after component mounts to avoid prerendering errors
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = sessionStorage.getItem("ai_assistant_page_session");
        if (stored) {
          setSessionId(stored);
          return;
        }
        const created = `page_sess_${Date.now()}`;
        try {
          sessionStorage.setItem("ai_assistant_page_session", created);
        } catch {
          // sessionStorage restricted or quota exceeded
        }
        setSessionId(created);
      }
    } catch {
      // Handle blocked storage in strict private mode
      setSessionId(`page_sess_${Date.now()}`);
    }
  }, []);

  const defaultGreeting: EnrichedChatMessage = {
    role: "assistant",
    content: `👋 **Welcome to the AI Content & Marketing Assistant Workspace!**\n\nI am your 24/7 creative director, scriptwriter, and growth consultant.\n\n### What we can create together:
- 🎬 **Vertical Video Scripts**: 15s, 30s, or 60s Reel/Short scripts with shot lists, hooks & audio cues
- ✍️ **Viral Hooks & Captions**: Multi-platform copy with high-save hashtag clusters
- 💼 **Brand Campaigns & Briefs**: Influencer outreach letters, deliverable scopes, and pricing benchmarks
- 🛍️ **Product Copy & Sales Frameworks**: AIDA & PAS promotional angles
- 📅 **7-Day Omnichannel Calendars**: Structured schedules with strategic daily formats
- 🔄 **Rewriting & Polishing**: Translating, summarizing, or adapting your existing drafts

Enter any custom request below, or select from the prompt templates to start!`,
    provider: "AI Assistant",
    timestamp: "Just now",
  };

  const [messages, setMessages] = useState<EnrichedChatMessage[]>([defaultGreeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([
    "Suggest 3 viral content ideas for my niche",
    "How can I increase audience engagement and saves?",
    "Write a 30s Reel script with shot list and hooks",
    "Create a weekly content calendar",
    "How should I price commercial ad usage rights?",
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setUserRole(user.role === "brand" ? "brand" : "creator");
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (textToSend?: string, isRegenerate = false) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    // Ensure session ID is initialized before making the API request
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      activeSessionId = `page_sess_${Date.now()}`;
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ai_assistant_page_session", activeSessionId);
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

    abortControllerRef.current = new AbortController();

    const contextPayload: AssistantContext = {
      role: userRole,
      niche,
      platform,
      targetAudience: targetAudience.trim() || undefined,
      brandOrProduct: brandOrProduct.trim() || undefined,
      tone,
      contentGoal: goal,
      creatorId: currentUser?.id,
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
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const promptCategories = [
    {
      category: "Reels & Scripts",
      icon: Film,
      prompts: [
        `Write a 30s viral Reel script for ${niche} with shot list and hooks`,
        `Create a high-retention 15s TikTok concept demonstrating ${brandOrProduct || "AI video workflow"}`,
      ],
    },
    {
      category: "Captions & Hooks",
      icon: PenTool,
      prompts: [
        `Give me 5 viral hooks and a high-converting caption with hashtags for ${platform}`,
        `Generate 3 persuasive calls-to-action (CTAs) that maximize comment velocity`,
      ],
    },
    {
      category: "Brand & Campaigns",
      icon: Briefcase,
      prompts: [
        `Draft an influencer collaboration brief for a ${niche} product launch`,
        `Write a 3-sentence sponsorship pitch letter to a brand team`,
      ],
    },
    {
      category: "Strategy & Calendar",
      icon: Calendar,
      prompts: [
        `Create a 7-day content schedule for ${platform} optimized for ${goal}`,
        `How can I increase my audience retention rate within the first 3 seconds?`,
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-950/80 border-b border-slate-800 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href={userRole === "brand" ? "/brand/dashboard" : "/creator/dashboard"}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <Logo size="sm" />

          <div className="hidden lg:flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Marketing & Creative Workspace</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowSettings((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
              showSettings
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Context Settings</span>
            {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Reset workspace conversation"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </header>

      {/* Settings / Context Accordion */}
      {showSettings && (
        <div className="bg-slate-950 border-b border-indigo-900/40 px-4 sm:px-8 py-4 animate-slideDown shrink-0">
          <div className="max-w-5xl mx-auto space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                Customize Target Audience, Platform, & Desired Tone
              </span>
              <span className="text-[11px] text-slate-400">
                Active Role: <strong className="text-white uppercase">{userRole}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Role Perspective</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as "creator" | "brand")}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="creator">Creator / Influencer</option>
                  <option value="brand">Brand / Campaign Marketer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-indigo-500"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tone of Voice</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-indigo-500"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Primary Goal</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-indigo-500"
                >
                  {GOALS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Product / Brand Name (Optional)
                </label>
                <input
                  type="text"
                  value={brandOrProduct}
                  onChange={(e) => setBrandOrProduct(e.target.value)}
                  placeholder="e.g. Lumina Glow Serum, SaaS Pro"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Target Audience Persona (Optional)
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. Gen Z tech consumers, founders, fitness enthusiasts"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Conversation Canvas */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-between overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-4">
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div
                key={idx}
                className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md border border-indigo-400/30">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[90%] sm:max-w-[82%] rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/80"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans space-y-3">
                    {m.content}
                  </div>

                  {!isUser && (
                    <div className="mt-3.5 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-indigo-300">
                          {m.provider ? m.provider.replace("-", " ") : "Assistant"}
                        </span>
                        {m.timestamp && <span>• {m.timestamp}</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(m.content, idx)}
                          aria-label="Copy response"
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {idx === messages.length - 1 && idx > 0 && !loading && (
                          <button
                            type="button"
                            onClick={handleRegenerate}
                            aria-label="Regenerate response"
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition cursor-pointer ml-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Regenerate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-9 h-9 rounded-2xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md border border-slate-700">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Categorized Template Chips */}
          {messages.length === 1 && (
            <div className="pt-2 pb-2 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Quick-Start Prompt Templates</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {promptCategories.map((cat, ci) => {
                  const CatIcon = cat.icon;
                  return (
                    <div
                      key={ci}
                      className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60 space-y-2"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-300">
                        <CatIcon className="w-4 h-4 text-indigo-400" />
                        <span>{cat.category}</span>
                      </div>
                      <div className="space-y-1.5">
                        {cat.prompts.map((p, pi) => (
                          <button
                            key={pi}
                            type="button"
                            onClick={() => handleSend(p)}
                            disabled={loading}
                            className="w-full text-left text-xs leading-snug p-2.5 rounded-xl bg-slate-900/80 hover:bg-indigo-900/40 border border-slate-800 hover:border-indigo-700/60 transition cursor-pointer text-slate-300 flex items-start justify-between gap-1 group"
                          >
                            <span className="line-clamp-2">{p}</span>
                            <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 mt-0.5 transition" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex gap-3 justify-start items-center text-slate-400 text-xs py-2">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl shadow-sm text-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Formulating strategic recommendations...</span>
                </div>
                <button
                  type="button"
                  onClick={handleStop}
                  aria-label="Stop generation"
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-rose-400 text-rose-400" />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Banner with Retry */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const lastUser = [...messages].reverse().find((m) => m.role === "user");
                  if (lastUser) handleSend(lastUser.content);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition cursor-pointer shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Horizon */}
        <div className="py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-400" />
            Suggestions:
          </span>
          {suggestedPrompts.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(q)}
              disabled={loading}
              className="text-xs whitespace-nowrap bg-slate-800 hover:bg-indigo-900/50 hover:text-indigo-200 text-slate-300 font-medium py-1.5 px-3 rounded-full border border-slate-700 transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="bg-slate-800/80 rounded-2xl border border-slate-700 p-2 sm:p-3 flex items-end gap-2 shrink-0 shadow-lg"
        >
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              maxLength={4000}
              placeholder="Ask for Reel scripts, hooks, ad copy, outreach letters, translations... (Shift+Enter for newline)"
              disabled={loading}
              aria-label="Enter your marketing or creative request"
              className="w-full px-3 py-2 bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none max-h-40 overflow-y-auto leading-relaxed"
            />
            <div className="px-2 pt-1 flex items-center justify-between text-[10px] text-slate-500">
              <span className="hidden sm:inline">
                Enter to submit • Shift+Enter for newline
              </span>
              <span className="ml-auto">{input.length}/4000</span>
            </div>
          </div>

          {loading ? (
            <button
              type="button"
              onClick={handleStop}
              aria-label="Stop generation"
              className="p-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition cursor-pointer mb-1 shadow-md"
            >
              <Square className="w-4 h-4 fill-white" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send request"
              className="p-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-500 disabled:opacity-40 transition cursor-pointer mb-1"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </main>
    </div>
  );
}
