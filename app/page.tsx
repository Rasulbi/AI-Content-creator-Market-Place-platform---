import React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { AccountTypeCard } from "@/components/auth/AccountTypeCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { HeroIllustration } from "@/components/ui/HeroIllustration";
import { HeroFeatures } from "@/components/ui/HeroFeatures";

export const metadata = {
  title: "AI Creator Marketplace - Where Brands Find Verified AI Creators",
  description:
    "Connect with skilled AI content creators, verify their expertise, and bring your creative vision to life with automated AI matching.",
};

export default function AccountSelectionPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFE] flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <nav className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between">
        <Logo size="md" />

        <div className="text-sm font-medium text-slate-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-purple-600 font-semibold hover:text-purple-700 hover:underline transition-colors"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Main Hero & Selection Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-10 py-4 sm:py-8 flex flex-col lg:flex-row items-center lg:items-stretch gap-12 lg:gap-16 justify-between">
        {/* Left Column: Value Proposition & Visual Showcase */}
        <div className="flex-1 w-full flex flex-col justify-between max-w-2xl lg:max-w-none">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Where Brands Find <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Verified AI Creators
              </span>
            </h1>

            <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-xl">
              Connect with skilled AI content creators, verify their expertise, and bring your creative vision to life.
            </p>

            {/* Visual Centerpiece Illustration */}
            <div className="pt-2 pb-4">
              <HeroIllustration />
            </div>
          </div>

          {/* 4 Feature Highlights */}
          <div className="mt-6">
            <HeroFeatures />
          </div>
        </div>

        {/* Right Column: Account Type Selection Card Container */}
        <div className="w-full lg:w-[480px] xl:w-[500px] flex items-center">
          <div className="w-full bg-white rounded-3xl p-6 sm:p-9 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col">
            {/* Header */}
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome Back!
              </h2>
              <p className="text-slate-500 text-sm mt-1.5 font-medium">
                Choose your account type to continue
              </p>
            </div>

            {/* Two Selectable Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
              {/* Brand Card */}
              <AccountTypeCard
                type="brand"
                title="Brand / Company"
                description="Find and hire verified AI creators for your campaigns."
                buttonText="Login as Brand →"
                href="/login/brand"
              />

              {/* Influencer Card */}
              <AccountTypeCard
                type="influencer"
                title="Influencer / Creator"
                description="Showcase your skills, get verified and get hired."
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
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200/60">
                💡 <span className="font-medium text-slate-600">Quick Hackathon Demo:</span> Click either button to preview live login
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Subdued Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-6 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
        <div>
          © 2026 AI Creator Marketplace. Built for Hackathon Demo.
        </div>
        <div className="flex gap-5 text-slate-500">
          <Link href="/brand/dashboard" className="hover:text-purple-600 transition-colors">
            Brand Dashboard Preview
          </Link>
          <span>•</span>
          <Link href="/creator/dashboard" className="hover:text-blue-600 transition-colors">
            Creator Dashboard Preview
          </Link>
        </div>
      </footer>
    </div>
  );
}
