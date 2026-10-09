"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Bookmark,
  RefreshCw,
  Video,
  Hash,
  Send,
  MessageSquare,
  AlertCircle,
  FileText,
  Flame,
} from "lucide-react";
import {
  ContentSuggestionsInput,
  ContentSuggestionItem,
  ContentSuggestionsOutput,
} from "@/lib/ai/types";

interface AIContentSuggestionsProps {
  initialNiche?: string;
  initialPlatform?: string;
}

export function AIContentSuggestions({
  initialNiche = "Beauty & Skincare",
  initialPlatform = "Instagram Reels",
}: AIContentSuggestionsProps) {
  const [niche, setNiche] = useState(initialNiche);
  const [targetAudience, setTargetAudience] = useState("Women 18–35 looking for hydration routines");
  const [platform, setPlatform] = useState(initialPlatform);
  const [contentGoal, setContentGoal] = useState("Brand Collaboration & Engagement");
  const [preferredFormat, setPreferredFormat] = useState("30s Short-Form Video");
  const [keywords, setKeywords] = useState("hyaluronic acid, glowing skin, morning routine");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ContentSuggestionItem[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setProviderNotice(null);

    try {
      const payload: ContentSuggestionsInput = {
        niche,
        targetAudience,
        platform,
        contentGoal,
        preferredFormat,
        keywords,
      };

      const res = await fetch("/api/ai-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate suggestions");
      }

      const output = data.data as ContentSuggestionsOutput;
      setSuggestions(output.suggestions || []);
      setActiveProvider(data.provider || "openai");
      if (data.warning || data.message) {
        setProviderNotice(data.warning || data.message);
      }
    } catch (err: unknown) {
      console.error("Content suggestion error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate suggestions. Please retry."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (item: ContentSuggestionItem) => {
    const textToCopy = `TITLE: ${item.title}
CONCEPT: ${item.concept}
HOOK: ${item.hook}

CAPTION:
${item.caption}

HASHTAGS:
${item.hashtags.join(" ")}

CALL TO ACTION:
${item.callToAction}

${
  item.videoScriptOutline
    ? `SCRIPT OUTLINE:
${item.videoScriptOutline
  .map((s) => `${s.scene}: Visual: ${s.visual} | Voiceover: "${s.audioOrVoiceover}"`)
  .join("\n")}`
    : ""
}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSave = (id: string) => {
    if (savedIds.includes(id)) {
      setSavedIds(savedIds.filter((s) => s !== id));
    } else {
      setSavedIds([...savedIds, id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                AI Content Suggestions Studio
              </h2>
              <p className="text-xs text-slate-500">
                Generate high-converting ideas, hooks, captions, hashtags, and video scripts in seconds
              </p>
            </div>
          </div>

          <span className={`text-[11px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
            activeProvider === "openai"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-purple-50 text-purple-700 border-purple-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              activeProvider === "openai" ? "bg-emerald-500" : "bg-purple-500"
            }`} />
            {activeProvider === "openai" ? "Powered by OpenAI" : "Powered by AI Engine"}
          </span>
        </div>

        {providerNotice && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{providerNotice}</span>
          </div>
        )}

        {/* Input Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Creator Niche
            </label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="Beauty & Skincare">Beauty & Skincare</option>
              <option value="Technology">Technology</option>
              <option value="Fashion">Fashion</option>
              <option value="Fitness & Wellness">Fitness & Wellness</option>
              <option value="Food">Food</option>
              <option value="Travel & Lifestyle">Travel & Lifestyle</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Audience
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Women 18-35, skincare lovers"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Preferred Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="Instagram Reels">Instagram Reels</option>
              <option value="YouTube Shorts">YouTube Shorts</option>
              <option value="YouTube Longform">YouTube Longform</option>
              <option value="TikTok">TikTok</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Content Goal
            </label>
            <select
              value={contentGoal}
              onChange={(e) => setContentGoal(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="Brand Collaboration & Sponsorship">Brand Sponsorship</option>
              <option value="Viral Reach & Growth">Viral Reach & Growth</option>
              <option value="Audience Trust & Saves">Educational / Saves</option>
              <option value="Product Conversion">Direct Product Sales</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Preferred Format
            </label>
            <select
              value={preferredFormat}
              onChange={(e) => setPreferredFormat(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="30s Short-Form Video">30s Short Video</option>
              <option value="UGC Product Review">UGC Product Review</option>
              <option value="Step-by-Step Tutorial">Step-by-Step Tutorial</option>
              <option value="Behind The Scenes Workflow">Behind The Scenes</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Keywords / Campaign Focus
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. serum, morning glow, honest review"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Click generate to get 3 creative treatments with scripts and hashtags.
          </p>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="py-2.5 px-5 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-bold shadow-md hover:bg-indigo-700 disabled:opacity-60 transition cursor-pointer flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Crafting Concepts...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Content Ideas</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {suggestions.length === 0 && !loading && !error && (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-3">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No suggestions generated yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-5">
            Select your niche and campaign focus above, then click &quot;Generate Content Ideas&quot; to receive structured video scripts, hooks, and hashtags.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            className="py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
          >
            Generate Demo Ideas
          </button>
        </div>
      )}

      {/* Suggestions Results */}
      {suggestions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900">
                {suggestions.length} High-Impact Content Concepts
              </h3>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate More</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {suggestions.map((item, idx) => {
              const isSaved = savedIds.includes(item.id);
              const isCopied = copiedId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 hover:border-indigo-200 transition-all space-y-4"
                >
                  {/* Item Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md">
                        Concept #{idx + 1}
                      </span>
                      <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600">{item.concept}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleSave(item.id)}
                        className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                          isSaved
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "text-slate-500 border-slate-200 hover:bg-slate-50"
                        }`}
                        title={isSaved ? "Saved" : "Save concept"}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(item)}
                        className="py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy All</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Attention Hook Box */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-black">
                      ⚡
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                        Attention-Grabbing Hook (0-3s)
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5">
                        &quot;{item.hook}&quot;
                      </div>
                    </div>
                  </div>

                  {/* Caption & Hashtags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="font-bold text-slate-700 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Ready-To-Post Caption</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{item.caption}</p>
                      <div className="pt-2 border-t border-slate-200/60 font-semibold text-indigo-700">
                        CTA: {item.callToAction}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-purple-500" />
                        <span>Optimized Hashtags</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.hashtags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="bg-white text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/70 text-[11px] font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Video Script Outline */}
                  {item.videoScriptOutline && item.videoScriptOutline.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-blue-500" />
                        <span>3-Scene Video Script Outline</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {item.videoScriptOutline.map((sc, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-3 rounded-2xl bg-white border border-slate-200 text-[11px] space-y-1"
                          >
                            <span className="font-bold text-indigo-600 block">{sc.scene}</span>
                            <div className="text-slate-600">
                              <span className="font-semibold text-slate-800">Visual:</span> {sc.visual}
                            </div>
                            <div className="text-slate-600">
                              <span className="font-semibold text-slate-800">Audio:</span> &quot;
                              {sc.audioOrVoiceover}&quot;
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
