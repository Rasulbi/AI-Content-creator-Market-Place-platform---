"use client";

import React, { useState, useEffect } from "react";
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
  Database,
  Trash2,
} from "lucide-react";
import {
  ContentSuggestionsInput,
  ContentSuggestionItem,
  ContentSuggestionsOutput,
} from "@/lib/ai/types";
import {
  saveAIContentAction,
  getSavedAIContentAction,
  deleteSavedAIContentAction,
} from "@/actions/ai-actions";

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
  const [savedDbItems, setSavedDbItems] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"generated" | "saved">("generated");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dbNotice, setDbNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);

  // Load saved content from database on mount
  useEffect(() => {
    async function loadSavedContent() {
      try {
        const res = await getSavedAIContentAction();
        if (res.success && Array.isArray(res.data)) {
          setSavedDbItems(res.data);
          const ids = res.data.map((item: any) => item.id || item.title);
          setSavedIds(ids);
        }
      } catch (e) {
        console.warn("Failed to fetch saved AI content from database:", e);
      }
    }
    loadSavedContent();
  }, []);

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
      setActiveTab("generated");
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

  const toggleSave = async (item: ContentSuggestionItem) => {
    const isCurrentlySaved = savedIds.includes(item.id) || savedDbItems.some((s) => s.title === item.title);
    setSavingId(item.id);
    setDbNotice(null);
    setError(null);

    const prevSavedIds = [...savedIds];
    const prevSavedDbItems = [...savedDbItems];
    const dbRecord = savedDbItems.find((s) => s.id === item.id || s.title === item.title);
    const targetId = dbRecord?.id || item.id;

    try {
      if (isCurrentlySaved) {
        // Optimistic UI update
        setSavedIds((prev) => prev.filter((id) => id !== item.id && id !== targetId));
        setSavedDbItems((prev) => prev.filter((s) => s.id !== targetId && s.title !== item.title));

        const res = await deleteSavedAIContentAction(targetId);
        if (!res || !res.success) {
          // Restore prior state on failure without overwriting unrelated state changes
          setSavedIds((current) => Array.from(new Set([...current, ...prevSavedIds.filter((id) => id === item.id || id === targetId)])));
          setSavedDbItems((current) => {
            const missing = prevSavedDbItems.filter((prevItem) => !current.some((c) => c.id === prevItem.id));
            return [...missing, ...current];
          });
          throw new Error(res?.error || "Failed to delete saved item from server.");
        }
        setDbNotice("Idea removed from saved database collection.");
      } else {
        // Only report content as saved after database operation succeeds
        const res = await saveAIContentAction({
          title: item.title,
          concept: item.concept,
          hook: item.hook,
          caption: item.caption,
          hashtags: item.hashtags,
          callToAction: item.callToAction,
          videoScriptOutline: item.videoScriptOutline,
          niche,
          platform,
          contentGoal,
        });

        if (!res || !res.success) {
          throw new Error(res?.error || "Failed to persist to database");
        }

        // Successfully persisted to database
        setSavedIds((prev) => [...prev, item.id]);
        if (res.data) {
          setSavedDbItems((prev) => [res.data, ...prev]);
        }
        setDbNotice(res.message || "Saved to database successfully.");
      }
    } catch (err: any) {
      if (isCurrentlySaved) {
        setSavedIds((current) => Array.from(new Set([...current, ...prevSavedIds.filter((id) => id === item.id || id === targetId)])));
        setSavedDbItems((current) => {
          const missing = prevSavedDbItems.filter((prevItem) => !current.some((c) => c.id === prevItem.id));
          return [...missing, ...current];
        });
      }
      console.error("Save/delete error:", err);
      setError(err?.message || "Failed to update database persistence");
    } finally {
      setSavingId(null);
      setTimeout(() => setDbNotice(null), 3000);
    }
  };

  const handleDeleteSavedDbItem = async (dbItem: any) => {
    const prevSavedDbItems = [...savedDbItems];
    const prevSavedIds = [...savedIds];
    setError(null);
    setDbNotice(null);

    // Optimistically update
    setSavedDbItems((prev) => prev.filter((s) => s.id !== dbItem.id));
    setSavedIds((prev) => prev.filter((id) => id !== dbItem.id));

    try {
      const res = await deleteSavedAIContentAction(dbItem.id);
      if (!res || !res.success) {
        // Rollback state cleanly
        setSavedDbItems((current) => {
          const itemToRestore = prevSavedDbItems.find((s) => s.id === dbItem.id);
          return itemToRestore && !current.some((c) => c.id === dbItem.id)
            ? [itemToRestore, ...current]
            : current;
        });
        setSavedIds((current) => Array.from(new Set([...current, ...prevSavedIds.filter((id) => id === dbItem.id)])));
        throw new Error(res?.error || "Failed to delete from database");
      }
      setDbNotice("Saved idea removed from database.");
      setTimeout(() => setDbNotice(null), 3000);
    } catch (err: any) {
      // Ensure rollback in catch as well
      setSavedDbItems((current) => {
        const itemToRestore = prevSavedDbItems.find((s) => s.id === dbItem.id);
        return itemToRestore && !current.some((c) => c.id === dbItem.id)
          ? [itemToRestore, ...current]
          : current;
      });
      setSavedIds((current) => Array.from(new Set([...current, ...prevSavedIds.filter((id) => id === dbItem.id)])));
      setError(err?.message || "Failed to delete saved content");
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  AI Content Suggestions Studio
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                  V2 Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate high-converting video concepts, viral hooks, captions, hashtags, and script outlines in seconds
              </p>
            </div>
          </div>

          <span className={`self-start sm:self-auto text-[11px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
            activeProvider === "openai"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
              : activeProvider === "gemini" || activeProvider === "google"
              ? "bg-blue-50 text-blue-700 border-blue-200/80"
              : activeProvider === "heuristic-fallback"
              ? "bg-amber-50 text-amber-700 border-amber-200/80"
              : "bg-indigo-50 text-indigo-700 border-indigo-200/80"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              activeProvider === "openai"
                ? "bg-emerald-500 animate-pulse"
                : activeProvider === "gemini" || activeProvider === "google"
                ? "bg-blue-500 animate-pulse"
                : activeProvider === "heuristic-fallback"
                ? "bg-amber-500"
                : "bg-indigo-500 animate-pulse"
            }`} />
            {activeProvider === "openai"
              ? "Powered by OpenAI"
              : activeProvider === "gemini" || activeProvider === "google"
              ? "Powered by Google Gemini"
              : activeProvider === "heuristic-fallback"
              ? "Heuristic Fallback Engine"
              : "Powered by AI Engine"}
          </span>
        </div>

        {providerNotice && (
          <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{providerNotice}</span>
          </div>
        )}

        {/* Input Form with Visual Grouping */}
        <div className="space-y-4">
          <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>1. Creative Strategy & Audience</span>
            <div className="h-px bg-slate-100 flex-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Creator Niche
              </label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer font-medium"
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Audience
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Women 18-35 looking for hydration routines"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Keywords / Focus
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. serum, morning glow, honest review"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
              />
            </div>
          </div>

          <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pt-2">
            <span>2. Production & Format Objectives</span>
            <div className="h-px bg-slate-100 flex-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Preferred Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer font-medium"
              >
                <option value="Instagram Reels">Instagram Reels</option>
                <option value="YouTube Shorts">YouTube Shorts</option>
                <option value="YouTube Longform">YouTube Longform</option>
                <option value="TikTok">TikTok</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Content Goal
              </label>
              <select
                value={contentGoal}
                onChange={(e) => setContentGoal(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer font-medium"
              >
                <option value="Brand Collaboration & Sponsorship">Brand Sponsorship</option>
                <option value="Viral Reach & Growth">Viral Reach & Growth</option>
                <option value="Audience Trust & Saves">Educational / Saves</option>
                <option value="Product Conversion">Direct Product Sales</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Preferred Format
              </label>
              <select
                value={preferredFormat}
                onChange={(e) => setPreferredFormat(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer font-medium"
              >
                <option value="30s Short-Form Video">30s Short Video</option>
                <option value="UGC Product Review">UGC Product Review</option>
                <option value="Step-by-Step Tutorial">Step-by-Step Tutorial</option>
                <option value="Behind The Scenes Workflow">Behind The Scenes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Generate Action Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-5 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Click generate to produce 3 high-impact creative treatments with hooks, full captions, and 3-scene outlines.
          </p>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/35 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer flex items-center justify-center gap-2"
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

      {/* DB Notice Banner */}
      {dbNotice && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold">{dbNotice}</span>
          </div>
          <span className="text-[10px] text-indigo-600 uppercase font-bold tracking-wider">
            DB Synchronized
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition cursor-pointer text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* View Switcher Tabs (Generated vs Saved Database Ideas) */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("generated")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "generated"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Generated Suggestions ({suggestions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "saved"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-purple-400" />
            <span>Saved in Database ({savedDbItems.length})</span>
          </button>
        </div>

        {activeTab === "generated" && suggestions.length > 0 && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="text-xs text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Regenerate More</span>
          </button>
        )}
      </div>

      {/* TAB 1: Generated Suggestions */}
      {activeTab === "generated" && (
        <>
          {suggestions.length === 0 && !loading && !error && (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                No suggestions generated yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-1.5 mb-5 leading-relaxed">
                Select your niche and campaign focus above, then click &quot;Generate Content Ideas&quot; to receive structured video scripts, hooks, and hashtags tailored to your audience.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                className="py-2.5 px-5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-xs"
              >
                Generate Demo Ideas
              </button>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {suggestions.map((item, idx) => {
                  const isSaved =
                    savedIds.includes(item.id) ||
                    savedDbItems.some((s) => s.title === item.title);
                  const isCopied = copiedId === item.id;
                  const isBusySaving = savingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 hover:border-indigo-200 hover:shadow-md transition-all space-y-5"
                    >
                      {/* Item Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                            Concept #{idx + 1}
                          </span>
                          <h4 className="text-base sm:text-lg font-bold text-slate-900">{item.title}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{item.concept}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleSave(item)}
                            disabled={isBusySaving}
                            className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                              isSaved
                                ? "bg-purple-50 text-purple-700 border-purple-200 shadow-xs"
                                : "text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
                            }`}
                            title={isSaved ? "Saved to database" : "Save to database"}
                          >
                            {isBusySaving ? (
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            ) : (
                              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-purple-600 text-purple-600" : ""}`} />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(item)}
                            className="py-2 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Copy All</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Attention Hook Box */}
                      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 text-xs font-black shadow-xs">
                          ⚡
                        </div>
                        <div>
                          <div className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                            Attention-Grabbing Hook (0-3s)
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                            &quot;{item.hook}&quot;
                          </div>
                        </div>
                      </div>

                      {/* Caption & Hashtags */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-indigo-600" />
                            <span>Ready-To-Post Caption</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{item.caption}</p>
                          <div className="pt-2 border-t border-slate-200/60 font-semibold text-indigo-700">
                            CTA: {item.callToAction}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Hash className="w-4 h-4 text-purple-600" />
                            <span>Optimized Hashtags</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.hashtags.map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="bg-white text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-medium shadow-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Video Script Outline */}
                      {item.videoScriptOutline && item.videoScriptOutline.length > 0 && (
                        <div className="space-y-2.5 pt-1">
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Video className="w-4 h-4 text-blue-600" />
                            <span>3-Scene Video Script Outline</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {item.videoScriptOutline.map((sc, sIdx) => (
                              <div
                                key={sIdx}
                                className="p-3.5 rounded-2xl bg-white border border-slate-200/80 text-[11px] space-y-1.5 shadow-xs"
                              >
                                <span className="font-extrabold text-indigo-600 text-xs block">
                                  {sc.scene}
                                </span>
                                <div className="text-slate-600">
                                  <strong className="text-slate-800 font-semibold">Visual:</strong> {sc.visual}
                                </div>
                                <div className="text-slate-600">
                                  <strong className="text-slate-800 font-semibold">Audio:</strong> &quot;
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
        </>
      )}

      {/* TAB 2: Database Saved Collection */}
      {activeTab === "saved" && (
        <div className="space-y-6">
          {savedDbItems.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-4 shadow-xs">
                <Bookmark className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                No saved content ideas yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-1.5 mb-5 leading-relaxed">
                Click the bookmark icon on any generated concept to persist it permanently to your database collection.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("generated")}
                className="py-2.5 px-5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-xs"
              >
                Browse Generated Ideas
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {savedDbItems.map((dbItem, idx) => {
                const asItem: ContentSuggestionItem = {
                  id: dbItem.id,
                  title: dbItem.title,
                  concept: dbItem.concept,
                  hook: dbItem.hook,
                  caption: dbItem.caption,
                  hashtags: Array.isArray(dbItem.hashtags) ? dbItem.hashtags : [],
                  callToAction: dbItem.call_to_action || dbItem.callToAction || "Link in bio",
                  videoScriptOutline: dbItem.video_script_outline || dbItem.videoScriptOutline,
                };
                const isCopied = copiedId === dbItem.id;

                return (
                  <div
                    key={dbItem.id || idx}
                    className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-purple-200/90 hover:shadow-md transition-all space-y-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Database className="w-3 h-3 text-purple-600" />
                            <span>Database Saved #{idx + 1}</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {dbItem.platform || "Instagram Reels"} &bull; {dbItem.niche || "General"}
                          </span>
                        </div>
                        <h4 className="text-base sm:text-lg font-bold text-slate-900">{dbItem.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{dbItem.concept}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedDbItem(dbItem)}
                          className="p-2 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                          title="Delete from database"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(asItem)}
                          className="py-2 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Copy All</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Attention Hook Box */}
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 text-xs font-black shadow-xs">
                        ⚡
                      </div>
                      <div>
                        <div className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                          Attention-Grabbing Hook
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                          &quot;{dbItem.hook}&quot;
                        </div>
                      </div>
                    </div>

                    {/* Caption & Hashtags */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-indigo-600" />
                          <span>Caption</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{dbItem.caption}</p>
                        <div className="pt-2 border-t border-slate-200/60 font-semibold text-indigo-700">
                          CTA: {dbItem.call_to_action || dbItem.callToAction}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Hash className="w-4 h-4 text-purple-600" />
                          <span>Hashtags</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(Array.isArray(dbItem.hashtags) ? dbItem.hashtags : []).map(
                            (tag: string, tIdx: number) => (
                              <span
                                key={tIdx}
                                className="bg-white text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-medium shadow-xs"
                              >
                                {tag}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
