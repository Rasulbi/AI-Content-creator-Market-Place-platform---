import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Checklist } from "@/components/ui/FeatureList";
import { LoginForm } from "@/components/auth/LoginForm";
import { CreatorIllustration } from "@/components/ui/CreatorIllustration";

export const metadata = {
  title: "Influencer Login - AI Creator Marketplace",
  description: "Access your creator account, verify your skills, and get hired by premium brands.",
};

export default function InfluencerLoginPage() {
  const creatorBenefits = [
    "Build your creator profile",
    "Take skill tests & get verified",
    "Get matched with top brands",
    "Grow your portfolio & reputation",
  ];

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
      {/* Left Column: Creator Showcase Panel (Light Blue Background) */}
      <div className="w-full lg:w-[46%] xl:w-[44%] bg-[#EEF7FF] border-r border-blue-100 flex flex-col justify-between p-8 sm:p-12 lg:p-14">
        <div>
          {/* Logo */}
          <div className="mb-12">
            <Logo size="md" />
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-2 mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Welcome, <span className="text-[#1E60F2]">Creator!</span>
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Showcase your skills, get verified and get hired.
            </p>
          </div>

          {/* Checklist */}
          <Checklist items={creatorBenefits} theme="blue" className="mb-10" />
        </div>

        {/* Bottom Vector/Laptop Illustration */}
        <div className="pt-6">
          <CreatorIllustration />
        </div>
      </div>

      {/* Right Column: Influencer Login Form */}
      <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16">
        {/* Top bar with Back to home */}
        <div className="flex justify-between items-center w-full max-w-md mx-auto mb-8 sm:mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
            Creator Portal
          </span>
        </div>

        {/* Center LoginForm */}
        <div className="my-auto">
          <LoginForm
            role="influencer"
            title="Influencer Login"
            subtitle="Access your creator account"
            defaultEmailPlaceholder="you@creator.com"
            signupText="Sign up"
          />
        </div>

        {/* Bottom subtle copyright */}
        <div className="w-full max-w-md mx-auto pt-8 text-center text-xs text-slate-400">
          Protected by enterprise-grade encryption.
        </div>
      </div>
    </div>
  );
}
