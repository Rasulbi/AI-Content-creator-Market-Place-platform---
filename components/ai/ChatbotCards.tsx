"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  Users,
  TrendingUp,
  Star,
  ExternalLink,
  Tag,
  DollarSign,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  Award,
} from "lucide-react";
import {
  RecommendedCreatorItem,
  RecommendedCampaignItem,
  CreatorComparisonItem,
} from "@/lib/ai/chatbot-engine";

export function RecommendedCreatorCard({
  creator,
}: {
  creator: RecommendedCreatorItem;
}) {
  const [imgError, setImgError] = useState(false);

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500/10 text-emerald-700 border-emerald-300";
    if (score >= 80) return "bg-indigo-500/10 text-indigo-700 border-indigo-300";
    return "bg-blue-500/10 text-blue-700 border-blue-300";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md transition-all duration-200 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
            {!imgError && creator.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatar}
                alt={creator.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-base">
                {creator.name.charAt(0)}
              </div>
            )}
            {creator.isVerified && (
              <div
                title="Verified Creator"
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-0.5 rounded-tl-md shadow-xs"
              >
                <CheckCircle2 className="w-2.5 h-2.5" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-sm text-slate-900">{creator.name}</h4>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {creator.category}
              </span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-1">{creator.professionalTitle}</p>
          </div>
        </div>

        <div
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${getMatchScoreColor(
            creator.matchScore
          )}`}
        >
          <Sparkles className="w-3 h-3" />
          <span>{creator.matchScore}% Match</span>
        </div>
      </div>

      {/* Key Stats Bar */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
        <div className="bg-slate-50/80 rounded-lg p-1.5">
          <p className="text-[10px] text-slate-400 font-medium">Followers</p>
          <p className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1 mt-0.5">
            <Users className="w-3 h-3 text-slate-400" />
            {creator.followers}
          </p>
        </div>
        <div className="bg-slate-50/80 rounded-lg p-1.5">
          <p className="text-[10px] text-slate-400 font-medium">Engagement</p>
          <p className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1 mt-0.5">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            {creator.engagementRate}
          </p>
        </div>
        <div className="bg-slate-50/80 rounded-lg p-1.5">
          <p className="text-[10px] text-slate-400 font-medium">Rating</p>
          <p className="text-xs font-bold text-amber-600 flex items-center justify-center gap-1 mt-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {creator.clientRating.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Price Range */}
      {creator.priceRange && (
        <div className="mt-2.5 text-xs text-slate-600 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Rate Benchmark:</span>
          <span className="font-semibold text-slate-800">{creator.priceRange}</span>
        </div>
      )}

      {/* Match Reasons */}
      {creator.matchReasons && creator.matchReasons.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {creator.matchReasons.slice(0, 3).map((reason, idx) => (
            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Skills tags */}
      {creator.skills && creator.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {creator.skills.slice(0, 4).map((skill, idx) => (
            <span
              key={idx}
              className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Action button */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100">
        <Link
          href={creator.profileUrl || `/creators/${creator.id}`}
          target="_blank"
          className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white transition-colors duration-150"
        >
          <span>View Verified Profile</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

export function RecommendedCampaignCard({
  campaign,
}: {
  campaign: RecommendedCampaignItem;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md transition-all duration-200 text-left">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
            {campaign.category} • {campaign.platform}
          </span>
          <h4 className="font-bold text-sm text-slate-900 mt-1">{campaign.title}</h4>
          <p className="text-xs text-slate-500 mt-0.5">Product: {campaign.productOrService}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-slate-400 block">Est. Budget</span>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 block mt-0.5">
            {campaign.budget}
          </span>
        </div>
      </div>

      <div className="mt-2.5 text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
        <p className="text-[11px] font-semibold text-slate-700 mb-1">Why Suitable For You:</p>
        <p className="text-[11px] leading-relaxed text-slate-600">{campaign.whySuitable}</p>
      </div>

      {campaign.deliverables && campaign.deliverables.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[10px] text-slate-400 font-medium mb-1">Deliverables:</p>
          <div className="flex flex-wrap gap-1">
            {campaign.deliverables.map((deliv, idx) => (
              <span
                key={idx}
                className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
              >
                {deliv}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Deadline: {campaign.deadline}</span>
        <Link
          href="/brand/campaigns"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
        >
          <span>Explore Campaign</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function CreatorComparisonCard({
  comparison,
}: {
  comparison: CreatorComparisonItem[];
}) {
  if (!comparison || comparison.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs overflow-x-auto text-left">
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-4 h-4 text-indigo-600" />
        <h4 className="font-bold text-xs text-slate-900">Head-to-Head Creator Comparison</h4>
      </div>

      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold">
            <th className="py-2 pr-3">Creator</th>
            <th className="py-2 px-2">Category</th>
            <th className="py-2 px-2">Followers</th>
            <th className="py-2 px-2">Engagement</th>
            <th className="py-2 px-2">Rating</th>
            <th className="py-2 px-2">Rates</th>
            <th className="py-2 pl-2">Key Strengths</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {comparison.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2.5 pr-3 font-semibold text-slate-800">
                <Link
                  href={c.profileUrl || `/creators/${c.id}`}
                  target="_blank"
                  className="hover:text-indigo-600 inline-flex items-center gap-1 group"
                >
                  <span>{c.name}</span>
                  {c.isVerified && <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />}
                  <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition" />
                </Link>
                <div className="text-[10px] text-slate-400 font-normal line-clamp-1">
                  {c.professionalTitle}
                </div>
              </td>
              <td className="py-2.5 px-2 text-slate-600 text-[11px]">{c.category}</td>
              <td className="py-2.5 px-2 font-medium text-slate-700">{c.followers}</td>
              <td className="py-2.5 px-2 font-bold text-emerald-600">{c.engagementRate}</td>
              <td className="py-2.5 px-2 font-semibold text-amber-600">
                ★ {c.clientRating.toFixed(1)}
              </td>
              <td className="py-2.5 px-2 text-slate-600 text-[11px] whitespace-nowrap">
                {c.priceRange}
              </td>
              <td className="py-2.5 pl-2">
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {c.keyStrengths?.map((s, si) => (
                    <span
                      key={si}
                      className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
