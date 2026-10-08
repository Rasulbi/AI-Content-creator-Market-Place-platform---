"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { logout } from "@/lib/auth";
import {
  Bell,
  Home,
  User,
  Award,
  Briefcase,
  TrendingUp,
  Settings,
  Sparkles,
  CheckCircle2,
  DollarSign,
  ChevronDown,
  LogOut,
  ExternalLink,
  Video,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function CreatorDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState<"pending" | "accepted" | "declined">(
    "pending"
  );

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleAcceptInvite = () => {
    setInvitationStatus("accepted");
    alert("Campaign invitation accepted! Brand will be notified to fund escrow.");
  };

  const handleDeclineInvite = () => {
    setInvitationStatus("declined");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <Logo size="sm" />

        {/* Center badge */}
        <div className="hidden md:flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold text-blue-700">
          <Award className="w-3.5 h-3.5" />
          <span>Verified AI Creator Portal</span>
        </div>

        {/* Right profile */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 p-1.5 pr-2 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden relative ring-2 ring-blue-500/20">
                <Image
                  src="/images/anjali.jpg"
                  alt="Anjali Sharma"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-900 leading-tight">
                  <span>Anjali Sharma</span>
                  <CheckCircle2 className="w-3 h-3 text-blue-500" />
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Verified Creator
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50">
                <Link
                  href="/creator/dashboard"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Home className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
                <Link
                  href="/login/brand"
                  className="px-4 py-2 text-xs font-semibold text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Switch to Brand View
                </Link>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Left Sidebar */}
        <aside className="w-56 hidden lg:flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            {[
              { name: "Dashboard", icon: Home },
              { name: "My Profile", icon: User },
              { name: "Skill Tests", icon: ShieldCheck },
              { name: "Brand Collabs", icon: Briefcase },
              { name: "Analytics", icon: TrendingUp },
              { name: "Settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setActiveTab(item.name)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#1E60F2] text-white shadow-md shadow-blue-500/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* Verification Badge Box */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 text-center">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 mx-auto mb-2">
              <Zap className="w-5 h-5 fill-blue-500" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">
              AI Verification Level 3
            </h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Top 5% Creator badge active. High priority in brand matching.
            </p>
          </div>
        </aside>

        {/* Center Main Content */}
        <main className="flex-1 space-y-6 min-w-0">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-600/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 backdrop-blur-md px-3 py-1 rounded-full mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified Creator Dashboard</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Welcome back, Anjali! 👋
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 mt-1">
                You have 1 new high-match brand invitation waiting for your response.
              </p>
            </div>

            <Link
              href="/brand/dashboard"
              className="py-2.5 px-4 rounded-xl bg-white text-blue-700 text-xs font-bold hover:bg-blue-50 shadow-md transition shrink-0 text-center"
            >
              Preview Brand Search
            </Link>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Active Campaigns</span>
                <Briefcase className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">3</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                2 in review · 1 published
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">This Month&apos;s Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">₹ 84,500</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                +24% from last month
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">AI Match Score</span>
                <Sparkles className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">94%</div>
              <div className="text-[11px] text-purple-600 font-semibold mt-1">
                Category: Skincare & Beauty
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Engagement Index</span>
                <TrendingUp className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">8.7%</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Top 2% among 125K creators
              </div>
            </div>
          </div>

          {/* New Campaign Invitation Alert */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-100 ring-2 ring-indigo-500/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900">
                  New Brand Campaign Match
                </h3>
              </div>
              <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full">
                94% Match
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-xl overflow-hidden relative border border-slate-200 flex-shrink-0">
                  <Image
                    src="/images/glowup-cream.jpg"
                    alt="GlowUp Skincare"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    GlowUp Skincare – Natural Face Cream Launch
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Deliverables: 1 Instagram Reel + 1 Honest Review Post
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-1.5 font-medium">
                    <span className="text-indigo-600 font-bold">
                      Budget: ₹ 25,000
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> 2 Weeks
                    </span>
                  </div>
                </div>
              </div>

              {invitationStatus === "pending" ? (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={handleDeclineInvite}
                    className="flex-1 md:flex-initial py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptInvite}
                    className="flex-1 md:flex-initial py-2 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition cursor-pointer"
                  >
                    Accept Offer (₹25,000)
                  </button>
                </div>
              ) : invitationStatus === "accepted" ? (
                <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Offer Accepted & Escrow Created</span>
                </div>
              ) : (
                <div className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                  Offer Declined
                </div>
              )}
            </div>
          </div>

          {/* AI Skill Verifications */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              AI Verification Scores
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                  <span>AI Video & Reels</span>
                  <span className="text-indigo-600">98% (Master)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full w-[98%]" />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Verified high consistency in lip-sync & product shots.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                  <span>Prompting & Quality</span>
                  <span className="text-purple-600">95/100 (Expert)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full w-[95%]" />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Demonstrated prompt fidelity for brand compliance.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                  <span>Audience Trust</span>
                  <span className="text-emerald-600">92% (Authentic)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full w-[92%]" />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Zero bot followers detected in recent audit.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
