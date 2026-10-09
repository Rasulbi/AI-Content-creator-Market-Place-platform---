import React from "react";
import Image from "next/image";
import { Play, Sparkles, Video, CheckCircle2, Award } from "lucide-react";

export function CreatorIllustration() {
  return (
    <div className="relative w-full max-w-sm mx-auto aspect-video flex items-center justify-center select-none">
      {/* Ambient Blue Glow */}
      <div className="absolute inset-0 bg-blue-200/50 rounded-full blur-2xl transform translate-y-2" />

      {/* Main composition */}
      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Floating Verified Badge */}
        <div className="self-start ml-6 -mb-3 z-20 bg-white/90 backdrop-blur-md rounded-xl p-2 px-3 shadow-lg border border-blue-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800">Top 5% Verified Creator</span>
        </div>

        {/* Laptop Display */}
        <div className="w-[85%] bg-slate-900 rounded-xl p-2 shadow-2xl border-2 border-slate-700">
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-lg p-3 border border-blue-100/60">
            {/* Window bar */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Portfolio Verified
              </div>
            </div>

            {/* Creator Studio Mockup */}
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm mb-2">
              <div
                className="w-10 h-10 rounded-full overflow-hidden relative ring-2 ring-blue-500/30 flex-shrink-0"
                style={{ width: "40px", height: "40px", position: "relative" }}
              >
                <Image src="/images/anjali.jpg" alt="Creator Studio" fill sizes="40px" className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate">Creator Studio</span>
                  <span className="text-[10px] text-emerald-600 font-bold">● Active</span>
                </div>
                <div className="text-[10px] text-slate-400">3 Brand Invitations Received</div>
              </div>
            </div>

            {/* Content Pills & Video icon */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-blue-600">
                  <Video className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold text-slate-700">AI Reels</span>
                </div>
                <span className="text-[10px] font-bold text-blue-600">98% Score</span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-purple-600">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold text-slate-700">Prompting</span>
                </div>
                <span className="text-[10px] font-bold text-purple-600">95/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Laptop Base */}
        <div className="w-[95%] h-2 bg-slate-300 rounded-b-lg border-t border-slate-400 shadow" />
      </div>
    </div>
  );
}
