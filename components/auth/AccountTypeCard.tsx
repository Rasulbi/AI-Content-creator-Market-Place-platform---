"use client";

import React from "react";
import Link from "next/link";
import { Building2, User, ArrowRight } from "lucide-react";

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
      className={`group relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-white border transition-all duration-300 ${
        isBrand
          ? "border-purple-100 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10"
          : "border-blue-100 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10"
      }`}
    >
      <div>
        {/* Card Icon */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-105 duration-300 ${
            isBrand
              ? "bg-purple-50 text-purple-600 border border-purple-100"
              : "bg-blue-50 text-blue-600 border border-blue-100"
          }`}
        >
          {isBrand ? (
            <Building2 className="w-7 h-7" strokeWidth={2.2} size={28} />
          ) : (
            <User className="w-7 h-7" strokeWidth={2.2} size={28} />
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          {description}
        </p>
      </div>

      {/* Action Button */}
      <Link
        href={href}
        className={`w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all duration-200 shadow-md ${
          isBrand
            ? "bg-[#6355F6] hover:bg-[#5244e6] active:bg-[#4335d5] shadow-purple-600/20 hover:shadow-purple-600/30"
            : "bg-[#1E60F2] hover:bg-[#1552d8] active:bg-[#0f44b8] shadow-blue-600/20 hover:shadow-blue-600/30"
        } group-hover:translate-y-[-1px]`}
      >
        <span>{buttonText}</span>
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" size={16} />
      </Link>
    </div>
  );
}
