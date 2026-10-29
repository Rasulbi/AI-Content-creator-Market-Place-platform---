import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

/**
 * Premium Loading Skeleton matching the exact layout and typography
 * of CreatorProfileView for smooth streaming and instant navigation.
 */
export function CreatorProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans" aria-busy="true" aria-label="Loading creator profile">
      {/* Top Navigation Skeleton */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/brand/dashboard"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <Logo size="sm" />
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-24 bg-slate-200/80 rounded-xl animate-pulse" />
          <div className="h-8 w-32 bg-slate-200/80 rounded-xl animate-pulse" />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Profile Hero Header Card Skeleton */}
        <div className="relative bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
          {/* Header Gradient Banner Placeholder */}
          <div className="h-40 sm:h-52 bg-gradient-to-r from-slate-200 via-slate-150 to-slate-200 relative overflow-hidden animate-pulse">
            <div className="absolute top-4 right-4 h-6 w-36 bg-white/40 rounded-full" />
          </div>

          {/* Profile Identity Row */}
          <div className="px-6 sm:px-8 pb-8 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
              {/* Avatar Placeholder */}
              <div className="flex items-end gap-5">
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden ring-4 ring-white shadow-xl bg-slate-200 animate-pulse flex-shrink-0" />

                <div className="mb-2 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="h-7 w-48 bg-slate-200 rounded-lg animate-pulse" />
                    <div className="h-5 w-24 bg-slate-200 rounded-full animate-pulse" />
                  </div>
                  <div className="h-4 w-36 bg-slate-200/80 rounded animate-pulse" />
                </div>
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex items-center gap-2">
                <div className="h-9 w-28 bg-slate-200 rounded-xl animate-pulse" />
                <div className="h-9 w-32 bg-slate-200 rounded-xl animate-pulse" />
              </div>
            </div>

            {/* Metrics Pills Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                  <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Left Column (2 cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio Card Skeleton */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="h-5 w-32 bg-slate-200 rounded-md animate-pulse" />
              <div className="space-y-2">
                <div className="h-3.5 w-full bg-slate-200/80 rounded animate-pulse" />
                <div className="h-3.5 w-11/12 bg-slate-200/80 rounded animate-pulse" />
                <div className="h-3.5 w-4/5 bg-slate-200/80 rounded animate-pulse" />
              </div>

              {/* Skills Tags Placeholder */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
                <div className="flex flex-wrap gap-2 pt-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-6 w-20 bg-slate-100 border border-slate-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
            </div>

            {/* Portfolio Grid Skeleton */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 bg-slate-200 rounded-md animate-pulse" />
                <div className="h-4 w-20 bg-slate-200/80 rounded animate-pulse" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200/80 overflow-hidden bg-slate-50 space-y-3 p-3">
                    <div className="w-full aspect-video rounded-xl bg-slate-200 animate-pulse" />
                    <div className="space-y-1.5 px-1">
                      <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-slate-200/70 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar Column (1 col) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-6 shadow-xs sticky top-24">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                <div className="h-7 w-36 bg-slate-200 rounded-lg animate-pulse" />
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="h-10 w-full bg-slate-200 rounded-xl animate-pulse" />
                <div className="h-10 w-full bg-slate-200/70 rounded-xl animate-pulse" />
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-100">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-3 w-24 bg-slate-200/80 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-slate-200/80 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
