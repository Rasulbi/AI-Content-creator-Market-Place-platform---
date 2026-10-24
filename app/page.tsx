import React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { AccountTypeCard } from "@/components/auth/AccountTypeCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { HeroIllustration } from "@/components/ui/HeroIllustration";
import { HeroFeatures } from "@/components/ui/HeroFeatures";
import { Sparkles, ShieldCheck, Users, Zap, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "AI Creator Marketplace - Where Brands Find Verified AI Creators",
  description:
    "Connect with skilled AI content creators, verify their expertise, and bring your creative vision to life with automated AI matching.",
};

export default function AccountSelectionPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFE] flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navigation Bar with Glassmorphic Header */}
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-200/60 w-full transition-all">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-4 flex items-center justify-between">
          <Logo size="md" />

          <div className="flex items-center gap-4">
            <Link
              href="/assistant"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100/80 hover:bg-indigo-50/70 border border-slate-200/70 px-3 py-1.5 rounded-xl transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>AI Assistant</span>
            </Link>

            <div className="text-xs sm:text-sm font-medium text-slate-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Hero & Selection Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 sm:py-10 flex flex-col lg:flex-row items-center lg:items-stretch gap-10 lg:gap-14 justify-between">
        {/* Left Column: Value Proposition & Visual Showcase */}
        <div className="flex-1 w-full flex flex-col justify-between max-w-2xl lg:max-w-none">
          <div className="space-y-4">
            {/* V2 Live Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-200/80 px-3 py-1 rounded-full text-xs font-bold text-indigo-700">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span>Version 2.0 • Verified AI Creative Marketplace</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Where Brands Find <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Verified AI Creators
              </span>
            </h1>

            <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-xl">
              Connect with skilled AI content creators, verify their skills with standardized benchmarks, and bring high-converting video campaigns to life.
            </p>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-lg py-2">
              <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/70">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Creators</span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-0.5">50+ Verified</div>
              </div>
              <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/70">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Match Rate</span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-0.5">98.4% Accuracy</div>
              </div>
              <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/70">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Skill Audits</span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-0.5">Multi-Factor Verified</div>
              </div>
            </div>

            {/* Visual Centerpiece Illustration */}
            <div className="pt-2 pb-2">
              <HeroIllustration />
            </div>
          </div>

          {/* 4 Feature Highlights */}
          <div className="mt-4">
            <HeroFeatures />
          </div>
        </div>

        {/* Right Column: Account Type Selection Card Container */}
        <div className="w-full lg:w-[490px] xl:w-[510px] flex items-center">
          <div className="w-full bg-white rounded-3xl p-6 sm:p-9 shadow-xl shadow-slate-200/60 border border-slate-200/80 flex flex-col relative overflow-hidden">
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

            {/* Header */}
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome Back
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-medium">
                Choose your account workspace to continue
              </p>
            </div>

            {/* Two Selectable Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
              {/* Brand Card */}
              <AccountTypeCard
                type="brand"
                title="Brand / Company"
                description="Find and hire verified AI creators for your marketing campaigns."
                buttonText="Login as Brand →"
                href="/login/brand"
              />

              {/* Influencer Card */}
              <AccountTypeCard
                type="influencer"
                title="Influencer / Creator"
                description="Showcase your skills, get verified and land paid sponsorships."
                buttonText="Login as Influencer →"
                href="/login/influencer"
              />
            </div>

            {/* OR Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                  OR
                </span>
              </div>
            </div>

            {/* Continue with Google */}
            <GoogleButton role="brand" text="Continue with Google" />

            {/* Quick Demo Hint */}
            <div className="mt-6 text-center">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-medium text-slate-600">Quick Preview:</span> Click either button to preview live portal
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Subdued Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/60">
        <div>
          © 2026 AI Creator Marketplace. Enterprise AI Talent Platform.
        </div>
        <div className="flex gap-5 text-slate-500 font-medium">
          <Link href="/brand/dashboard" className="hover:text-indigo-600 transition-colors">
            Brand Dashboard Preview
          </Link>
          <span>•</span>
          <Link href="/creator/dashboard" className="hover:text-blue-600 transition-colors">
            Creator Dashboard Preview
          </Link>
          <span>•</span>
          <Link href="/assistant" className="hover:text-purple-600 transition-colors">
            AI Assistant
          </Link>
        </div>
      </footer>
    </div>
  );
}
