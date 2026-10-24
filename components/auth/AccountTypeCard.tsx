"use client";

import React from "react";
import Link from "next/link";
import { Building2, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export interface AccountTypeCardProps {
  type: "brand" | "influencer";
  title: string;
  description: string;
  buttonText: string;
  href: string;
}

export function AccountTypeCard({
  type,
  title,
  description,
  buttonText,
  href,
}: AccountTypeCardProps) {
  const isBrand = type === "brand";

  return (
    <div
      className={`group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-white border transition-all duration-300 card-hover ${
        isBrand
          ? "border-slate-200/90 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10"
          : "border-slate-200/90 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10"
      }`}
    >
      {/* Top subtle highlight */}
      <div
        className={`absolute top-0 left-8 right-8 h-1 rounded-b-full transition-opacity opacity-0 group-hover:opacity-100 duration-300 ${
          isBrand
            ? "bg-gradient-to-r from-indigo-500 to-purple-600"
            : "bg-gradient-to-r from-blue-500 to-indigo-600"
        }`}
      />

      <div>
        <div className="flex items-center justify-between mb-5">
          {/* Card Icon Container */}
          <div
            className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-xs ${
              isBrand
                ? "bg-indigo-50 text-indigo-600 border border-indigo-100/80"
                : "bg-blue-50 text-blue-600 border border-blue-100/80"
            }`}
          >
            {isBrand ? (
              <Building2 className="w-6 h-6" strokeWidth={2.2} />
            ) : (
              <Sparkles className="w-6 h-6" strokeWidth={2.2} />
            )}
          </div>

          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border tracking-tight ${
              isBrand
                ? "bg-indigo-50/70 text-indigo-700 border-indigo-200/60"
                : "bg-blue-50/70 text-blue-700 border-blue-200/60"
            }`}
          >
            {isBrand ? "Brand Marketers" : "Content Creators"}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-6">
          {description}
        </p>

        {/* Micro-features bullet */}
        <div className="space-y-1.5 mb-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-3.5 h-3.5 ${isBrand ? "text-indigo-500" : "text-blue-500"}`} />
            <span>{isBrand ? "AI creator matching & brief builder" : "Verified Skill Passport & portfolio"}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-3.5 h-3.5 ${isBrand ? "text-indigo-500" : "text-blue-500"}`} />
            <span>{isBrand ? "Targeted campaign briefs & contracts" : "Direct brand campaign invitations"}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <Link
        href={href}
        className={`w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-white transition-all duration-200 shadow-md ${
          isBrand
            ? "bg-[#6355F6] hover:bg-[#5244e6] active:bg-[#4335d5] shadow-indigo-600/25 hover:shadow-indigo-600/35"
            : "bg-[#1E60F2] hover:bg-[#1552d8] active:bg-[#0f44b8] shadow-blue-600/25 hover:shadow-blue-600/35"
        } group-hover:translate-y-[-1px]`}
      >
        <span>{buttonText}</span>
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
