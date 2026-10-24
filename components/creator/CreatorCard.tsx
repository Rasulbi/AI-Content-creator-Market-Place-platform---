"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Creator } from "@/lib/creators-data";
import { MatchResult } from "@/lib/ai-matching";
import {
  CheckCircle2,
  Users,
  TrendingUp,
  MapPin,
  Star,
  Bookmark,
  Sparkles,
  Check,
  AlertTriangle,
  FolderKanban,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  FileCheck,
} from "lucide-react";

interface CreatorCardProps {
  creator: Creator;
  match?: MatchResult;
  isShortlisted?: boolean;
  onToggleShortlist?: (creatorId: string) => void;
  showDetailsDefault?: boolean;
}

export function CreatorCard({
  creator,
  match,
  isShortlisted = false,
  onToggleShortlist,
  showDetailsDefault = false,
}: CreatorCardProps) {
  const [showFullBreakdown, setShowFullBreakdown] = useState(showDetailsDefault);
  const matchScore = match?.totalScore ?? creator.baseMatchScore;

  // Determine badge styling based on matchScore
  const getMatchBadgeStyle = (score: number) => {
    if (score >= 90) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 75) return "bg-indigo-50 text-indigo-700 border-indigo-200";
    if (score >= 50) return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const isTopMatch = matchScore >= 90;

  return (
    <div
      className={`group relative bg-white rounded-3xl p-5 sm:p-6 transition-all duration-300 border ${
        isTopMatch
          ? "border-indigo-200/90 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/10 hover:shadow-xl hover:border-indigo-300"
          : "border-slate-200/80 shadow-sm hover:shadow-lg hover:border-slate-300"
      }`}
    >
      {/* Top Banner / Match Badge Row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        {/* Creator Identity */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden ring-2 ring-slate-100 flex-shrink-0 shadow-sm group-hover:scale-[1.02] transition-transform">
            <Image
              src={creator.avatar}
              alt={creator.name}
              fill
              className="object-cover"
            />
            {creator.isVerified && (
              <div
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-white shadow-sm"
                title="Verified Creator"
              >
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {creator.name}
              </h3>
              {creator.isDemo || creator.isSynthetic ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                  🧪 Demo Profile
                </span>
              ) : creator.isVerified ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  Verified
                </span>
              ) : null}
            </div>

            <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate">
              {creator.professionalTitle}
            </p>

            {/* Quick Metrics: Followers | Engagement | Location */}
            <div className="flex items-center gap-2.5 text-[11px] sm:text-xs text-slate-600 mt-1.5 font-medium flex-wrap">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <strong className="font-bold text-slate-800">{creator.followers}</strong> Followers
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <strong className="font-bold text-emerald-600">{creator.engagementRate}</strong> Eng.
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {creator.location.split(",")[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Right Match Pill & Shortlist Button */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleShortlist && onToggleShortlist(creator.id)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isShortlisted
                  ? "bg-purple-100 border-purple-300 text-purple-700 shadow-sm"
                  : "bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50"
              }`}
              title={isShortlisted ? "Remove from Shortlist" : "Add to Shortlist"}
            >
              <Bookmark
                className={`w-4 h-4 ${isShortlisted ? "fill-purple-600 text-purple-600" : ""}`}
              />
            </button>

            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold border flex items-center gap-1 shadow-sm ${getMatchBadgeStyle(
                matchScore
              )}`}
            >
              <FileCheck className="w-3 h-3 text-indigo-500" />
              {matchScore}% Match (Rule-Based)
            </span>
          </div>

          <div className="text-[10px] text-slate-400 font-medium">
            Category: <span className="font-semibold text-slate-600">{creator.category}</span>
          </div>
        </div>
      </div>

      {/* Skills Tags */}
      <div className="mb-3.5">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Skills:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {creator.skills.slice(0, 5).map((skill) => {
            const isVerifiedSkill = creator.verifiedSkills.includes(skill);
            return (
              <span
                key={skill}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  isVerifiedSkill
                    ? "bg-purple-50 text-purple-700 border border-purple-200/80 font-semibold"
                    : "bg-slate-100 text-slate-600 border border-slate-200/50"
                }`}
              >
                {isVerifiedSkill && <ShieldCheck className="w-3 h-3 text-purple-600" />}
                {skill}
              </span>
            );
          })}
          {creator.skills.length > 5 && (
            <span className="text-[11px] px-2 py-1 rounded-lg bg-slate-50 text-slate-400 font-medium border border-slate-200/50">
              +{creator.skills.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Stats row: Portfolio Count & Rating */}
      <div className="flex items-center justify-between text-xs py-2.5 px-3.5 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
        <div className="flex items-center gap-2 text-slate-700">
          <FolderKanban className="w-4 h-4 text-indigo-500" />
          <span>
            <strong className="font-bold text-slate-900">{creator.portfolioCount}</strong> Portfolio Projects
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-700">
          <div className="flex items-center text-amber-500">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          </div>
          <span className="font-bold text-slate-900">{creator.clientRating.toFixed(1)}/5</span>
          <span className="text-slate-400 text-[11px]">({creator.reviewsCount})</span>
        </div>
      </div>

      {/* AI Explanation Accordion / Section */}
      {match && (
        <div className="mb-4 pt-3 border-t border-slate-100">
          {/* Why this creator is a great match? */}
          <div className="space-y-1.5 mb-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Why this creator is a great match?</span>
            </div>
            <div className="space-y-1 pl-1">
              {match.reasons.slice(0, showFullBreakdown ? match.reasons.length : 3).map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                  <Check className="w-3 h-3 text-emerald-600 flex-shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Potential Gaps */}
          {match.gaps.length > 0 && (
            <div className="space-y-1 pl-1 mb-2">
              <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Potential gaps:</span>
              </div>
              {match.gaps.map((gap, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-amber-700">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{gap}</span>
                </div>
              ))}
            </div>
          )}

          {/* Full Scoring Breakdown Progress Bars Toggle */}
          {showFullBreakdown && (
            <div className="mt-3 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2 animate-fadeIn">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Rule-Based Match Score Breakdown (Weighted Model)
              </div>
              {[
                { label: "Skill Match (40%)", score: match.breakdown.skillMatch, color: "bg-indigo-600" },
                { label: "Verification (25%)", score: match.breakdown.verification, color: "bg-purple-600" },
                { label: "Portfolio (15%)", score: match.breakdown.portfolio, color: "bg-blue-600" },
                { label: "Experience (10%)", score: match.breakdown.experience, color: "bg-emerald-600" },
                { label: "Client Rating (10%)", score: match.breakdown.clientRating, color: "bg-amber-500" },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium text-slate-600">
                    <span>{item.label}</span>
                    <span className="font-bold text-slate-800">{item.score}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Toggle breakdown button */}
          <button
            type="button"
            onClick={() => setShowFullBreakdown(!showFullBreakdown)}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-2 cursor-pointer"
          >
            {showFullBreakdown ? (
              <>
                <span>Hide detailed score breakdown</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>View 5-metric AI score breakdown</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Action Buttons: [View Profile] [Shortlist] */}
      <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
        <Link
          href={`/creators/${creator.id}`}
          className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#6355F6] hover:bg-[#5244e6] active:bg-[#4335d5] shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <button
          type="button"
          onClick={() => onToggleShortlist && onToggleShortlist(creator.id)}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
            isShortlisted
              ? "bg-purple-50 text-purple-700 border-purple-200"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isShortlisted ? "fill-purple-600" : ""}`} />
          <span>{isShortlisted ? "Shortlisted" : "Shortlist"}</span>
        </button>
      </div>
    </div>
  );
}
