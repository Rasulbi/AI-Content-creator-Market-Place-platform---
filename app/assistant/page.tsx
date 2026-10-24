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

interface EnrichedChatMessage extends ChatMessage {
  provider?: string;
  model?: string;
  timestamp?: string;
  recommendedCreators?: RecommendedCreatorItem[];
  recommendedCampaigns?: RecommendedCampaignItem[];
  comparisonData?: CreatorComparisonItem[];
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

  const isBrand = userRole === "brand";

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
          // sessionStorage restricted
        }
        setSessionId(created);
      }
    } catch {
      setSessionId(`page_sess_${Date.now()}`);
    }
  }, []);

  const getGreeting = (role: "brand" | "creator"): EnrichedChatMessage => ({
    role: "assistant",
    content:
      role === "brand"
        ? `👋 **Welcome to the AI Assistant for Brand Owners & Marketers.**\n\nI help brands discover high-matching AI creators, compare talent, plan viral campaigns, and formulate product marketing strategies:\n\n### What I Can Do For You:
- 🔍 **Creator Discovery**: Recommend top creators for skincare, fashion, technology, and food
- ⚖️ **Creator Comparison**: Side-by-side comparison of engagement, followers, ratings, and rates
- 💰 **Budget Matching**: Find best creators for budgets starting from ₹10,000
- 🎬 **Campaign Formats**: 15s/30s Instagram Reel briefs and deliverable outlines
- 👟 **Brand Strategy**: Marketing strategies for brands like Nike, Samsung, and indie labels

Select any prompt below or describe your product to begin!`
        : `👋 **Welcome to the AI Creative & Collaboration Workspace!**\n\nI am your 24/7 creative director, scriptwriter, and brand partnership consultant.\n\n### What We Can Create Together:
- 💼 **Brand & Campaign Discovery**: Match your profile with active marketplace briefs
- 🎬 **Vertical Video Scripts**: 15s, 30s, or 60s Reel/Short scripts with scene-by-scene hooks
- ✍️ **Viral Hooks & Captions**: High-converting hooks and high-save hashtag clusters
- 🤝 **Collaboration Proposals**: Professional pitch letters for fashion, beauty, tech, and fitness brands
- 📈 **Profile Optimization**: Actionable tips to boost your engagement rate and verification score

Select an action below or enter your custom request to get started!`,
    provider: "AI Assistant",
    timestamp: "Just now",
  });

  const [messages, setMessages] = useState<EnrichedChatMessage[]>([getGreeting(userRole)]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const brandQuickActions = [
    { label: "🔍 Skincare Creators", query: "I want to promote a skincare product. Which creators are suitable?" },
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
    isBrand
      ? [
          "I want to promote a skincare product. Which creators are suitable?",
          "Suggest creators for a women's fashion brand.",
          "Which creator is best for my product with a budget of ₹10,000?",
          "Suggest a 15-second Instagram Reel campaign for my clothing brand.",
        ]
      : [
          "Which brands are suitable for my fashion profile?",
          "Suggest content ideas for a skincare product.",
          "How can I create a 15-second Instagram Reel?",
          "Write a collaboration proposal for a clothing brand.",
        ]
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      const role = user.role === "brand" ? "brand" : "creator";
      setUserRole(role);
      setMessages([getGreeting(role)]);
      setSuggestedPrompts(
        role === "brand"
          ? [
              "I want to promote a skincare product. Which creators are suitable?",
              "Suggest creators for a women's fashion brand.",
              "Which creator is best for my product with a budget of ₹10,000?",
              "Suggest a 15-second Instagram Reel campaign for my clothing brand.",
            ]
          : [
              "Which brands are suitable for my fashion profile?",
              "Suggest content ideas for a skincare product.",
              "How can I create a 15-second Instagram Reel?",
              "Write a collaboration proposal for a clothing brand.",
            ]
      );
    }
  }, []);

  const handleRoleChange = (newRole: "creator" | "brand") => {
    setUserRole(newRole);
    if (messages.length <= 1) {
      setMessages([getGreeting(newRole)]);
    }
    setSuggestedPrompts(
      newRole === "brand"
        ? [
            "I want to promote a skincare product. Which creators are suitable?",
            "Suggest creators for a women's fashion brand.",
            "Which creator is best for my product with a budget of ₹10,000?",
            "Suggest a 15-second Instagram Reel campaign for my clothing brand.",
          ]
        : [
            "Which brands are suitable for my fashion profile?",
            "Suggest content ideas for a skincare product.",
            "How can I create a 15-second Instagram Reel?",
            "Write a collaboration proposal for a clothing brand.",
          ]
    );
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (textToSend?: string, isRegenerate = false) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

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
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          recommendedCreators: data.recommendedCreators,
          recommendedCampaigns: data.recommendedCampaigns,
          comparisonData: data.comparisonData,
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
    setMessages([getGreeting(userRole)]);
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

  const activeQuickActions = isBrand ? brandQuickActions : creatorQuickActions;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-950/80 border-b border-slate-800 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href={isBrand ? "/brand/dashboard" : "/creator/dashboard"}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <Logo size="sm" theme="light" />

          {/* Role Toggle Pill in Header */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => handleRoleChange("brand")}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                isBrand
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🏢 Brand Owner
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("creator")}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                !isBrand
                  ? "bg-indigo-600 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🎨 Creator
            </button>
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
            {showSettings ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
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
                Active Perspective:{" "}
                <strong className="text-white uppercase">{userRole}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Role Perspective
                </label>
                <select
                  value={userRole}
                  onChange={(e) => handleRoleChange(e.target.value as "creator" | "brand")}
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
                  placeholder="e.g. Nike Air Max, Samsung S24, Glow Serum"
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
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/80"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans space-y-3">
                    {m.content}
                  </div>

                  {/* Render Recommended Creators */}
                  {!isUser &&
                    m.recommendedCreators &&
                    m.recommendedCreators.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          <h4 className="font-bold text-xs text-white">
                            Verified Creator Recommendations ({m.recommendedCreators.length}{" "}
                            Matches)
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {m.recommendedCreators.map((creator) => (
                            <RecommendedCreatorCard key={creator.id} creator={creator} />
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Render Recommended Campaigns */}
                  {!isUser &&
                    m.recommendedCampaigns &&
                    m.recommendedCampaigns.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-indigo-400" />
                          <h4 className="font-bold text-xs text-white">
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

                  {/* Render Head-to-Head Comparison Table */}
                  {!isUser && m.comparisonData && m.comparisonData.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-700/60">
                      <CreatorComparisonCard comparison={m.comparisonData} />
                    </div>
                  )}

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

          {/* Quick-Start Role Cards */}
          {messages.length === 1 && (
            <div className="pt-2 pb-2 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Quick-Start Questions for {isBrand ? "Brand Owners" : "Creators"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Click to run immediately</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeQuickActions.map((action, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(action.query)}
                    className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-indigo-950/50 border border-slate-700/80 hover:border-indigo-600/50 text-left transition group cursor-pointer shadow-xs"
                  >
                    <div className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300 flex items-center justify-between">
                      <span>{action.label}</span>
                      <Sparkles className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      &quot;{action.query}&quot;
                    </p>
                  </button>
                ))}
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
                  <span>
                    {isBrand
                      ? "Analyzing marketplace creators and campaign alignment..."
                      : "Matching campaigns and formulating content hooks..."}
                  </span>
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
              placeholder={
                isBrand
                  ? "Ask about creators for skincare, fashion, budget ₹10,000, comparison, Nike shoes... (Shift+Enter for newline)"
                  : "Ask for brand recommendations, skincare ideas, 15s Reel scripts, collaboration proposals... (Shift+Enter for newline)"
              }
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
