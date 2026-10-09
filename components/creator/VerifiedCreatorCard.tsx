"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreatorVerificationItem, VerificationStatus } from "@/lib/ai/verification-types";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  TrendingUp,
  MapPin,
  Star,
  Bookmark,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Award,
  FileCheck,
  Info,
} from "lucide-react";

interface VerifiedCreatorCardProps {
  item: CreatorVerificationItem;
  isShortlisted?: boolean;
  onToggleShortlist?: (creatorId: string) => void;
}

export function VerifiedCreatorCard({
  item,
  isShortlisted = false,
  onToggleShortlist,
}: VerifiedCreatorCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<"checklist" | "breakdown" | "sources">("checklist");

  // Status-specific badges & accents
  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case "Verified":
        return {
          label: "Campaign Match Verified",
          bgColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: ShieldCheck,
          accentBorder: "border-emerald-200 hover:border-emerald-300 ring-emerald-500/10",
          pillBg: "bg-emerald-500",
        };
      case "Partially Verified":
        return {
          label: "Partially Matched",
          bgColor: "bg-amber-50 text-amber-800 border-amber-200",
          icon: AlertTriangle,
          accentBorder: "border-amber-200 hover:border-amber-300 ring-amber-500/10",
          pillBg: "bg-amber-500",
        };
      case "Not Verified":
      default:
        return {
          label: "Low Match",
          bgColor: "bg-rose-50 text-rose-700 border-rose-200",
          icon: XCircle,
          accentBorder: "border-slate-200 hover:border-rose-200 ring-rose-500/10",
          pillBg: "bg-rose-500",
        };
    }
  };

  const statusConfig = getStatusBadge(item.verificationStatus);
  const StatusIcon = statusConfig.icon;

  // Format date nicely
  const formattedTimestamp = new Date(item.verificationTimestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });

  return (
    <div
      className={`group relative bg-white rounded-3xl p-5 sm:p-6 transition-all duration-300 border shadow-sm hover:shadow-md ring-1 ${statusConfig.accentBorder}`}
    >
      {/* Demo Sandbox Profile Notification Banner */}
      {item.isDemo && (
        <div className="mb-3.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-2 text-[11px] text-amber-800">
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-900 font-bold text-[10px] uppercase">
              Demo Sandbox
            </span>
            <span>{item.demoNotice || "Simulated profile for demonstration purposes. Not a live external account."}</span>
          </div>
          <span className="text-[10px] text-amber-600 hidden sm:inline">Synthetic Data</span>
        </div>
      )}

      {/* Top Row: Creator Details, Status Badge, Accuracy Pill, Shortlist Button */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        {/* Creator Identity */}
        <div className="flex items-start gap-4 min-w-0">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-2 ring-slate-100 flex-shrink-0 shadow-sm">
            <Image
              src={item.avatar}
              alt={item.creatorName}
              fill
              className="object-cover"
            />
            {item.verificationStatus === "Verified" && (
              <div
                className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white shadow-sm"
                title="AI Campaign Match Verified"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {item.creatorName}
              </h3>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusConfig.bgColor}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{statusConfig.label}</span>
              </span>

              {/* Demo Badge */}
              {item.isDemo && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                  🧪 Demo Profile
                </span>
              )}

              {/* AI-Audited tag */}
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                AI-Audited
              </span>
            </div>

            <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate">
              {item.professionalTitle} &bull; <span className="text-indigo-600 font-bold">{item.category}</span>
            </p>

            {/* Platform & Internal Profile Handle Link */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {item.primaryPlatform}
              </span>
              <Link
                href={`/creators/${item.creatorId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition"
                title="View sandbox profile dossier"
              >
                <span>{item.socialHandle}</span>
                {item.isDemo && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-700 font-bold border border-amber-200">
                    sandbox
                  </span>
                )}
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </Link>
              <span className="text-slate-300 hidden sm:inline">&bull;</span>
              <span className="text-slate-500 text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {item.location}
              </span>
            </div>

            {/* Follower & Engagement Telemetry */}
            <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-slate-700 mt-2 font-medium flex-wrap">
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span><strong>{item.followers}</strong> followers</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span><strong>{item.engagementRate}</strong> engagement</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span><strong>{item.clientRating}</strong> ({item.reviewsCount} reviews)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Block: Campaign Match Score Pill & Bookmark Action */}
        <div className="flex items-center sm:flex-col sm:items-end justify-between gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="flex sm:flex-col items-center sm:items-end gap-1.5 sm:gap-0.5 text-right">
            <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider">
              {item.matchScoreLabel || "Campaign Match"}
            </span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-slate-900 text-white shadow-sm">
              <span className="text-sm sm:text-base font-extrabold text-white">
                {item.accuracyScore}%
              </span>
              <div
                className={`w-2.5 h-2.5 rounded-full ${statusConfig.pillBg} ring-2 ring-white/20`}
                title={`Status: ${statusConfig.label}`}
              />
            </div>
            <span className="text-[9px] text-slate-400 hidden sm:inline">Requirements Alignment</span>
          </div>

          {onToggleShortlist && (
            <button
              type="button"
              onClick={() => onToggleShortlist(item.creatorId)}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                isShortlisted
                  ? "bg-purple-100 text-purple-700 border-purple-300"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
              title={isShortlisted ? "Remove from Shortlist" : "Save to Shortlist"}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isShortlisted ? "fill-purple-600" : ""}`} />
              <span className="hidden sm:inline">{isShortlisted ? "Saved" : "Shortlist"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Authenticity vs Match Disclaimer Banner */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 mb-3 text-xs leading-relaxed text-slate-700 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold text-slate-800 text-[11px]">
            AI Campaign Match Score &bull; <span className="text-indigo-600">Requirements Fit Only</span>
          </div>
          <p className="text-[11px] text-slate-600">
            {item.authenticityNotice ||
              "This AI score measures campaign requirements alignment only. Live account authenticity & creator identity verification requires separate verified evidence (KYC & live platform OAuth)."}
          </p>
        </div>
      </div>

      {/* Match Explanation Box */}
      <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80 mb-3 text-xs leading-relaxed text-slate-700">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
          <Info className="w-3.5 h-3.5 text-indigo-600" />
          <span>AI Campaign Match Analysis</span>
        </div>
        <p>{item.matchExplanation}</p>
      </div>

      {/* Verified vs Unverified Quick Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3">
        {/* Verified Strengths */}
        <div className="bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100">
          <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 mb-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Verified Evidence ({item.verifiedDetails.length})</span>
          </div>
          <p className="text-[11px] text-emerald-900 truncate">
            {item.verifiedDetails[0] || "Profile identity and portfolio verified."}
          </p>
        </div>

        {/* Unverified Gaps */}
        <div className="bg-amber-50/50 rounded-xl p-2.5 border border-amber-100">
          <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Audit Notices & Gaps ({item.unverifiedDetails.length})</span>
          </div>
          <p className="text-[11px] text-amber-900 truncate">
            {item.unverifiedDetails[0] || "No historical brand collabs on record."}
          </p>
        </div>
      </div>

      {/* Toggle Expand Button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-semibold transition cursor-pointer"
        >
          <span>{expanded ? "Hide Evidence Audit Details" : "View Supporting Evidence & Score Factors"}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Link to Full Profile */}
        <Link
          href={`/creators/${item.creatorId}`}
          className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800 hover:gap-2 transition-all"
        >
          <span>View Full Profile</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Expandable Evidence Audit Panel */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 animate-fadeIn space-y-4">
          {/* Subtabs for evidence navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            {[
              { id: "checklist", label: "Evidence Checklist", icon: FileCheck },
              { id: "breakdown", label: "Accuracy Breakdown (5 Factors)", icon: Layers },
              { id: "sources", label: "Sources & Telemetry", icon: Award },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeEvidenceTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveEvidenceTab(tab.id as typeof activeEvidenceTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: EVIDENCE CHECKLIST */}
          {activeEvidenceTab === "checklist" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Confirmed Verified Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Supporting Facts</span>
                </h4>
                <ul className="space-y-1.5">
                  {item.verifiedDetails.map((detail, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-700 bg-emerald-50/60 p-2 rounded-xl border border-emerald-100 flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Unverified / Mismatched Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Unverified Notices & Potential Gaps</span>
                </h4>
                <ul className="space-y-1.5">
                  {item.unverifiedDetails.map((gap, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-700 bg-amber-50/60 p-2 rounded-xl border border-amber-100 flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: ACCURACY SCORE BREAKDOWN */}
          {activeEvidenceTab === "breakdown" && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-2">
                <span>Weighted Scoring Factors</span>
                <span>Total Score: <strong>{item.accuracyScore}%</strong></span>
              </div>

              {[
                {
                  label: "Brand & Product Relevance",
                  weight: "30%",
                  score: item.breakdown.brandProductRelevance,
                  color: "bg-indigo-600",
                },
                {
                  label: "Profile Identity & Authenticity",
                  weight: "25%",
                  score: item.breakdown.identityAuthenticity,
                  color: "bg-emerald-600",
                },
                {
                  label: "Audience & Niche Relevance",
                  weight: "25%",
                  score: item.breakdown.audienceNicheRelevance,
                  color: "bg-blue-600",
                },
                {
                  label: "Engagement Statistics Reliability",
                  weight: "10%",
                  score: item.breakdown.engagementReliability,
                  color: "bg-purple-600",
                },
                {
                  label: "Profile Completeness & Tools",
                  weight: "10%",
                  score: item.breakdown.profileCompleteness,
                  color: "bg-slate-700",
                },
              ].map((factor, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">
                      {factor.label} <span className="text-slate-400">({factor.weight})</span>
                    </span>
                    <span className="font-bold text-slate-900">{factor.score}/100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${factor.color} transition-all duration-500`}
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: SOURCES & AUDIT METADATA */}
          {activeEvidenceTab === "sources" && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="block font-bold text-slate-800 mb-1">Evidence Sources:</span>
                  <ul className="space-y-1 list-disc list-inside">
                    {item.evidenceSources.map((source, sIdx) => (
                      <li key={sIdx} className="text-slate-600">{source}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Audit Timestamp: <strong>{formattedTimestamp}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Audit Model: <strong>{item.modelUsed || "Ensemble Validator"}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span>Audited Pricing: <strong>{item.priceRange}</strong> ({item.availability})</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
