import React from "react";
import Image from "next/image";
import { Play, Sparkles, Image as ImageIcon, BarChart2, CheckCircle2 } from "lucide-react";

export function HeroIllustration() {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-[16/11] flex items-center justify-center select-none py-4">
      {/* Soft background ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-200/40 via-indigo-100/30 to-blue-200/40 rounded-full blur-3xl transform -translate-y-4" />

      {/* Main 3D Styled Composition */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Floating Background Accent Pills */}
        <div className="absolute top-2 left-10 p-2.5 rounded-2xl bg-white/90 backdrop-blur-md shadow-lg border border-purple-100 flex items-center gap-2 animate-bounce-slow">
          <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
            T
          </div>
          <span className="text-xs font-semibold text-slate-700">AI Prompt Master</span>
        </div>

        <div className="absolute top-1 left-48 p-2 rounded-xl bg-white/90 backdrop-blur-md shadow-md border border-blue-100 text-blue-500 animate-pulse-slow">
          <ImageIcon className="w-5 h-5" />
        </div>

        <div className="absolute top-4 right-16 p-2 rounded-xl bg-purple-600 text-white shadow-md animate-bounce-slow shadow-purple-500/30">
          <Play className="w-4 h-4 fill-white" />
        </div>

        <div className="absolute top-12 right-6 p-2 rounded-xl bg-white/90 backdrop-blur-md shadow-md border border-purple-100 text-amber-500 animate-spin-slow">
          <Sparkles className="w-5 h-5" />
        </div>

        {/* Centerpiece Laptop Mockup */}
        <div className="relative z-10 w-[84%] bg-slate-900 rounded-2xl p-2.5 shadow-2xl border-4 border-slate-800">
          {/* Laptop Screen */}
          <div className="relative bg-gradient-to-b from-slate-50 to-indigo-50/50 rounded-xl overflow-hidden border border-slate-200 aspect-[16/10] p-4 flex flex-col justify-between">
            {/* Laptop Screen Header */}
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="h-2 w-28 bg-slate-200 rounded-full" />
              <div className="w-3 h-3 rounded-full bg-indigo-200" />
            </div>

            {/* Laptop Screen Body - Grid of creators */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Creator 1 */}
              <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full overflow-hidden relative mb-1.5 ring-2 ring-purple-100">
                  <Image src="/images/anjali.jpg" alt="Creator" fill className="object-cover" />
                </div>
                <div className="h-1.5 w-10 bg-slate-800 rounded-full mb-1" />
                <div className="h-1 w-7 bg-purple-400 rounded-full" />
              </div>

              {/* Creator 2 */}
              <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full overflow-hidden relative mb-1.5 ring-2 ring-blue-100">
                  <Image src="/images/priya.jpg" alt="Creator" fill className="object-cover" />
                </div>
                <div className="h-1.5 w-10 bg-slate-800 rounded-full mb-1" />
                <div className="h-1 w-7 bg-blue-400 rounded-full" />
              </div>

              {/* Creator 3 */}
              <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-full overflow-hidden relative mb-1.5 ring-2 ring-emerald-100">
                  <Image src="/images/neha.jpg" alt="Creator" fill className="object-cover" />
                </div>
                <div className="h-1.5 w-10 bg-slate-800 rounded-full mb-1" />
                <div className="h-1 w-7 bg-emerald-400 rounded-full" />
              </div>
            </div>

            {/* Laptop Screen Chart / Metrics preview */}
            <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100 flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-500" />
                <div className="h-2 w-16 bg-slate-200 rounded-full" />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                <CheckCircle2 className="w-3 h-3" />
                98% Matched
              </div>
            </div>
          </div>

          {/* Laptop Base Stand */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-48 h-2.5 bg-slate-700 rounded-b-xl shadow-md" />
        </div>

        {/* Floating Left Creator Highlight Card */}
        <div className="absolute -left-2 sm:left-2 top-8 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-purple-100 flex items-center gap-3 transition-transform hover:-translate-y-1">
          <div className="w-11 h-11 rounded-xl overflow-hidden relative ring-2 ring-purple-500/20 shadow-sm flex-shrink-0">
            <Image src="/images/anjali.jpg" alt="Anjali" fill className="object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-800">Anjali S.</span>
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-full font-semibold">
                AI Pro
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Top Rated Beauty Creator</p>
          </div>
        </div>

        {/* Floating Right Creator Highlight Card */}
        <div className="absolute -right-2 sm:right-2 bottom-8 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-blue-100 flex items-center gap-3 transition-transform hover:-translate-y-1">
          <div className="w-11 h-11 rounded-xl overflow-hidden relative ring-2 ring-blue-500/20 shadow-sm flex-shrink-0">
            <Image src="/images/priya.jpg" alt="Priya" fill className="object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-800">Priya R.</span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full font-semibold">
                Verified
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">210K Followers · 6.4% Eng.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
