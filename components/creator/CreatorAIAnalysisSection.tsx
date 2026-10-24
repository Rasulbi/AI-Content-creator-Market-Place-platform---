"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Award,
  Lightbulb,
  ShieldCheck,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { Creator } from "@/lib/creators-data";
import { CreatorProfileAnalysisOutput } from "@/lib/ai/types";

export interface CreatorAIAnalysisState {
  loading: boolean;
  analysis: CreatorProfileAnalysisOutput | null;
  error: string | null;
  isIncomplete: boolean;
  isFallback: boolean;
}

interface CreatorAIAnalysisSectionProps {
  creator: Creator;
  onNavigateToEdit?: () => void;
  autoRun?: boolean;
  onAnalysisStateChange?: (state: CreatorAIAnalysisState) => void;
}

export function CreatorAIAnalysisSection({
  creator,
  onNavigateToEdit,
  autoRun = true,
  onAnalysisStateChange,
}: CreatorAIAnalysisSectionProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CreatorProfileAnalysisOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isIncomplete, setIsIncomplete] = useState(false);

  // Check if profile is complete enough for analysis
  const hasSkills = creator.skills && creator.skills.length > 0;
  const hasPortfolio = creator.portfolio && creator.portfolio.length > 0;
  const profileComplete = Boolean(hasSkills && hasPortfolio);

  const handleRunAnalysis = async () => {
    if (!profileComplete) {
      setIsIncomplete(true);
      onAnalysisStateChange?.({
        loading: false,
        analysis: null,
        error: "Profile incomplete for AI analysis",
        isIncomplete: true,
        isFallback: false,
      });
      return;
    }

    setLoading(true);
    setError(null);
    setIsIncomplete(false);
    onAnalysisStateChange?.({
      loading: true,
      analysis: null,
      error: null,
      isIncomplete: false,
      isFallback: false,
    });

    try {
      const payload = {
        name: creator.name,
        category: creator.category,
        bio: creator.bio,
        skills: creator.skills,
        portfolioCount: creator.portfolioCount || (creator.portfolio ? creator.portfolio.length : 0),
        portfolioSamples: (creator.portfolio || []).slice(0, 3).map((p) => ({
          title: p.title,
          description: p.description,
          tools: p.toolsUsed,
          results: p.results,
        })),
        followers: creator.followers,
        engagementRate: creator.engagementRate,
        platforms: creator.platforms,
        contentTypes: creator.contentTypes,
        availability: creator.availability,
      };

      const res = await fetch("/api/ai/analyze-creator-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.incomplete) {
          setIsIncomplete(true);
          onAnalysisStateChange?.({
            loading: false,
            analysis: null,
            error: data.error || "Profile incomplete for AI audit",
            isIncomplete: true,
            isFallback: false,
          });
          return;
        }
        throw new Error(data.error || "Failed to analyze creator profile");
      }

      const result = data.data as CreatorProfileAnalysisOutput;
      setAnalysis(result);
      onAnalysisStateChange?.({
        loading: false,
        analysis: result,
        error: null,
        isIncomplete: false,
        isFallback: Boolean(result.isFallback || result.engine === "heuristic_fallback"),
      });
    } catch (err: unknown) {
      console.error("AI Analysis error:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while analyzing profile.";
      setError(errMsg);
      onAnalysisStateChange?.({
        loading: false,
        analysis: null,
        error: errMsg,
        isIncomplete: false,
        isFallback: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (autoRun && profileComplete && !analysis && !loading) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          handleRunAnalysis();
        }
      });
    } else if (autoRun && !profileComplete) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setIsIncomplete(true);
          onAnalysisStateChange?.({
            loading: false,
            analysis: null,
            error: "Profile incomplete",
            isIncomplete: true,
            isFallback: false,
          });
        }
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator.id, profileComplete, autoRun]);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                AI Creator Profile Audit & Verification Engine
              </h2>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Level 3 Audit
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Evidence-based evaluation of skills, engagement rate, and brand campaign readiness
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={loading}
          className="py-2.5 px-5 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-bold shadow-md hover:bg-indigo-700 disabled:opacity-60 transition cursor-pointer flex items-center justify-center gap-2 shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing Profile...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{analysis ? "Re-Run AI Audit" : "Run AI Profile Audit"}</span>
            </>
          )}
        </button>
      </div>

      {/* Incomplete Profile Alert */}
      {isIncomplete && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold">Profile Incomplete for AI Audit</h4>
              <p className="text-xs text-amber-700 mt-1">
                To receive authentic AI recommendations, your profile must include at least 1 verified skill and 1 portfolio sample. Fabricated or empty profiles cannot be analyzed.
              </p>
            </div>
          </div>
          {onNavigateToEdit && (
            <button
              type="button"
              onClick={onNavigateToEdit}
              className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition"
            >
              Add Skills & Portfolio Samples Now →
            </button>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRunAnalysis}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state indicator */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
            </div>
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            Analyzing Creator Strengths & Campaign Affinities
          </h4>
          <p className="text-xs text-slate-500 max-w-sm">
            Auditing {creator.skills.length} skills, {creator.portfolio.length} portfolio items, and audience engagement benchmarks...
          </p>
        </div>
      )}

      {/* Empty State when no analysis run yet */}
      {!analysis && !loading && !isIncomplete && !error && (
        <div className="py-10 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <ShieldCheck className="w-7 h-7 text-indigo-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            AI Profile Audit Not Yet Run
          </h3>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
            Click &quot;Run AI Profile Audit&quot; to generate an objective evaluation of your portfolio, strengths, and recommended brand campaign sponsorships.
          </p>
          <button
            type="button"
            onClick={handleRunAnalysis}
            className="py-2 px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            Start AI Audit Now
          </button>
        </div>
      )}

      {/* Active Analysis Results */}
      {analysis && !loading && (
        <div className="space-y-6 animate-fadeIn">
          {/* Readiness Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  Overall Marketplace Readiness
                </span>
                {analysis.isFallback || analysis.engine === "heuristic_fallback" ? (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300"
                    title={analysis.fallbackReason || "Evaluated using deterministic rule-based audit engine"}
                  >
                    <FileCheck className="w-3 h-3 text-amber-600" />
                    Rule-Based Audit
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-100/90 px-2.5 py-0.5 rounded-full border border-indigo-300"
                    title={`Generated via ${analysis.provider || "AI Model"}`}
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    Model-Generated ({analysis.provider || "Gemini AI"})
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black text-slate-900">
                  {analysis.overallReadinessScore}%
                </span>
                <span className="text-xs font-semibold text-emerald-600">
                  Top Tier Match Probability
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {analysis.isFallback || analysis.engine === "heuristic_fallback"
                  ? "Rule-based audit provides evidence for platform verification. Requires human moderator sign-off."
                  : "AI model analysis provides evidence for platform verification. Requires human moderator sign-off."}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {analysis.isFallback || analysis.engine === "heuristic_fallback" ? (
                <span
                  className="p-2 rounded-xl bg-amber-50 border border-amber-200/90 text-xs font-semibold text-amber-800 flex items-center gap-1.5"
                  title="Heuristic rule-based audit active"
                >
                  <FileCheck className="w-4 h-4 text-amber-600" />
                  <span>Heuristic Audit Engine</span>
                </span>
              ) : (
                <span
                  className="p-2 rounded-xl bg-indigo-50 border border-indigo-200/90 text-xs font-semibold text-indigo-800 flex items-center gap-1.5"
                  title={`Model: ${analysis.provider || "AI Model"}`}
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>{analysis.provider || "Gemini AI"}</span>
                </span>
              )}
              <span className="p-2 rounded-xl bg-white shadow-xs border border-slate-200/60 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                Moderator Audit Ready
              </span>
            </div>
          </div>

          {/* Strengths & Improvement Areas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Verified Creator Strengths</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                {analysis.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Growth & Improvement Areas</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                {analysis.potentialImprovementAreas.map((area, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommended Campaign Types */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recommended Brand Campaign Formats
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.recommendedCampaignTypes.map((camp, idx) => (
                <span
                  key={idx}
                  className="bg-white text-indigo-700 font-semibold px-3 py-1.5 rounded-xl border border-indigo-200 text-xs shadow-sm"
                >
                  {camp}
                </span>
              ))}
            </div>
          </div>

          {/* Campaign Match Affinities */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Specific Campaign Affinity Breakdown
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {analysis.campaignMatchAffinities.map((aff, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{aff.campaignType}</span>
                    <span className="text-xs font-black text-indigo-600">
                      {aff.matchScore}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${aff.matchScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">{aff.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
