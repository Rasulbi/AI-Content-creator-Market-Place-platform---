import React from "react";
import { Building2, TrendingUp, BarChart3, Target, Sparkles } from "lucide-react";

export function BrandIllustration() {
  return (
    <div className="relative w-full max-w-sm mx-auto aspect-video flex items-center justify-center select-none">
      {/* Glow */}
      <div className="absolute inset-0 bg-purple-200/50 rounded-full blur-2xl transform translate-y-2" />

      {/* Main Illustration composition */}
      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Floating Stat Badge */}
        <div className="self-end mr-6 -mb-4 z-20 bg-white/90 backdrop-blur-md rounded-xl p-2 px-3 shadow-lg border border-purple-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-slate-800">+142% Campaign ROI</span>
        </div>

        {/* Laptop Display */}
        <div className="w-[85%] bg-slate-900 rounded-xl p-2 shadow-2xl border-2 border-slate-700">
          <div className="bg-gradient-to-br from-slate-50 to-purple-50/40 rounded-lg p-3 border border-purple-100/60">
            {/* Window bar */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5" />
                AI Match Active
              </div>
            </div>

            {/* Content preview */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Target Reach</div>
                  <div className="text-xs font-bold text-slate-800">500K+</div>
                </div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Accuracy</div>
                  <div className="text-xs font-bold text-slate-800">96.8%</div>
                </div>
              </div>
            </div>

            {/* Bar chart mockup */}
            <div className="mt-2 bg-white p-2 rounded-lg border border-slate-100 shadow-sm flex items-end justify-between h-14 pt-3 px-3">
              <div className="flex flex-col items-center gap-1">
                <div className="w-3 bg-purple-200 rounded-t h-5" />
                <span className="text-[8px] text-slate-400">Mon</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-3 bg-purple-300 rounded-t h-7" />
                <span className="text-[8px] text-slate-400">Tue</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-3 bg-purple-400 rounded-t h-9" />
                <span className="text-[8px] text-slate-400">Wed</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-3 bg-indigo-500 rounded-t h-11" />
                <span className="text-[8px] text-slate-400">Thu</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-3 bg-purple-600 rounded-t h-12" />
                <span className="text-[8px] text-slate-400">Fri</span>
              </div>
            </div>
          </div>
        </div>

        {/* Laptop base */}
        <div className="w-[95%] h-2 bg-slate-300 rounded-b-lg border-t border-slate-400 shadow" />
      </div>
    </div>
  );
}
