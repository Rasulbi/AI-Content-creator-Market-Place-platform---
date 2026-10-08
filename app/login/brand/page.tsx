import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Checklist } from "@/components/ui/FeatureList";
import { LoginForm } from "@/components/auth/LoginForm";
import { BrandIllustration } from "@/components/ui/BrandIllustration";

export const metadata = {
  title: "Brand Login - AI Creator Marketplace",
  description: "Access your brand account to hire verified AI creators and run high-converting campaigns.",
};

export default function BrandLoginPage() {
  const brandBenefits = [
    "Search verified creators",
    "Compare portfolios & skills",
    "Run campaign with AI matching",
    "Track performance & results",
  ];

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
      {/* Left Column: Brand Showcase Panel (Light Lavender/Purple Background) */}
      <div className="w-full lg:w-[46%] xl:w-[44%] bg-[#F5F3FF] border-r border-purple-100 flex flex-col justify-between p-8 sm:p-12 lg:p-14">
        <div>
          {/* Logo */}
          <div className="mb-12">
            <Logo size="md" />
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-2 mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Welcome, Brand!
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Find the best AI creators for your next campaign.
            </p>
          </div>

          {/* Checklist */}
          <Checklist items={brandBenefits} theme="purple" className="mb-10" />
        </div>

        {/* Bottom Vector/Laptop Illustration */}
        <div className="pt-6">
          <BrandIllustration />
        </div>
      </div>

      {/* Right Column: Brand Login Form */}
      <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16">
        {/* Top bar with Back to home */}
        <div className="flex justify-between items-center w-full max-w-md mx-auto mb-8 sm:mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
            Brand Portal
          </span>
        </div>

        {/* Center LoginForm */}
        <div className="my-auto">
          <LoginForm
            role="brand"
            title="Brand Login"
            subtitle="Access your brand account"
            defaultEmailPlaceholder="you@company.com"
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
