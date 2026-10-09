"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreatorNav } from "@/components/creator/CreatorNav";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { getCurrentUser, User as AuthUser } from "@/lib/auth";
import { CREATORS_DATA, Creator } from "@/lib/creators-data";
import { getStoredCreators, getCreatorById } from "@/lib/creators-store";
import {
  getStoredSkillPassport,
  calculatePassportSummary,
  SkillPassportItem,
  SKILL_TESTS_CATALOG,
} from "@/lib/skill-passport-store";
import { CreatorAIAnalysisSection } from "@/components/creator/CreatorAIAnalysisSection";
import { AIChatbotModal } from "@/components/ai/AIChatbotModal";
import {
  Sparkles,
  Bot,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  FileCheck2,
  FolderKanban,
  PlusCircle,
  ArrowRight,
  Clock,
  Award,
  ExternalLink,
  ChevronRight,
  Calendar,
  Layers,
  Zap,
  Check,
  X,
  Eye,
} from "lucide-react";

export default function CreatorDashboardPage() {
  const router = useRouter();

  const [creator, setCreator] = useState<Creator>(CREATORS_DATA[0]);
  const [passportItems, setPassportItems] = useState<SkillPassportItem[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState<"pending" | "accepted" | "declined">(
    "pending"
  );

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    const stored = getStoredCreators();
    const matched = user ? getCreatorById(user.id) || stored[0] : stored[0];
    if (matched) {
      setCreator(matched);
      setPassportItems(getStoredSkillPassport(matched.id));
    }

    const handleUpdate = () => {
      const refreshed = getStoredCreators();
      const current = user ? getCreatorById(user.id) || refreshed[0] : refreshed[0];
      if (current) {
        setCreator(current);
        setPassportItems(getStoredSkillPassport(current.id));
      }
    };

    window.addEventListener("creators-store-updated", handleUpdate);
    window.addEventListener("skill-passport-updated", handleUpdate);
    return () => {
      window.removeEventListener("creators-store-updated", handleUpdate);
      window.removeEventListener("skill-passport-updated", handleUpdate);
    };
  }, []);

  const passportSummary = calculatePassportSummary(passportItems);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Universal Creator Navigation */}
      <CreatorNav />

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome & Profile Summary Header */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl shrink-0">
                <Image
                  src={creator.avatar || "/images/anjali.jpg"}
                  alt={creator.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
                <span className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Welcome, {creator.name}
                  </h1>
                  <Badge variant="purple" size="sm" className="bg-purple-900/60 text-purple-200 border-purple-400/40">
                    <Sparkles className="w-3 h-3 text-purple-300" />
                    <span>{passportSummary.tierBadge}</span>
                  </Badge>
                </div>

                <p className="text-slate-300 text-sm mt-1 max-w-xl">
                  {creator.bio || "AI content creator delivering high-converting UGC tutorials and cinematic visual storytelling."}
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {creator.availability}
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    {creator.priceRange || "₹ 20,000 - ₹ 35,000"} / project
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                    <Award className="w-3.5 h-3.5 text-blue-400" />
                    {creator.clientRating || 4.9} / 5.0 Rating ({creator.reviewsCount || 38} reviews)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
              <Link href="/creator/passport" className="w-full sm:w-auto">
                <Button
                  variant="gradient"
                  size="md"
                  className="w-full justify-center shadow-lg shadow-indigo-500/25"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Skill Passport</span>
                </Button>
              </Link>
              <Link href="/creator/portfolio/new" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full justify-center bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Project</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Verification Status & Skill Metrics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Passport Index Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Passport Verification Score
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {passportSummary.overallScore}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
              <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Top 2%
              </span>
            </div>
            <div className="mt-3">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${passportSummary.overallScore}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex justify-between">
                <span>Accreditation Status</span>
                <span className="font-semibold text-slate-700">{passportSummary.tierBadge}</span>
              </p>
            </div>
          </div>

          {/* 4-Tier Verification Breakdown */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Verified Skills Pipeline
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Client Verified
                </span>
                <span className="font-bold text-slate-900">{passportSummary.clientVerifiedCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Test Verified
                </span>
                <span className="font-bold text-slate-900">{passportSummary.testVerifiedCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Portfolio Evidence
                </span>
                <span className="font-bold text-slate-900">{passportSummary.portfolioEvidenceCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Claimed
                </span>
                <span className="font-bold text-slate-700">{passportSummary.claimedCount}</span>
              </div>
            </div>
            <Link
              href="/creator/skills"
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
            >
              Manage & upgrade skills <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Portfolio Projects Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Portfolio Showcase
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <FolderKanban className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {creator.portfolio?.length || creator.portfolioCount || 0}
              </span>
              <span className="text-xs text-slate-500">Published Campaigns</span>
            </div>
            <div className="mt-3">
              <p className="text-[11px] text-slate-500">
                All projects equipped with generation prompts, model seeds & process proof.
              </p>
              <Link
                href="/creator/portfolio"
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-2"
              >
                Explore portfolio gallery <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Benchmark Tests Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                AI Skill Benchmark Tests
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileCheck2 className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {SKILL_TESTS_CATALOG.length}
              </span>
              <span className="text-xs text-slate-500">Available Tests</span>
              <span className="ml-auto text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[11px] text-slate-500">
                Earn &quot;Test Verified&quot; badges in Midjourney, Runway Gen-3 & ElevenLabs.
              </p>
              <Link
                href="/creator/tests"
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-2"
              >
                Take a benchmark test <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Verification Pipeline Explainer Bar */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                4-Tier Verification Ladder
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Each verification tier unlocks higher match ranking in brand campaign searches.
              </p>
            </div>
            <Link href="/creator/passport">
              <Button variant="outline" size="sm">
                View Full Skill Passport
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status="Claimed" size="sm" />
                <span className="text-xs font-bold text-slate-400">Tier 1</span>
              </div>
              <p className="text-xs text-slate-600">
                Self-declared skills on creator profile. Awaiting portfolio proof or test.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/70">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status="Portfolio Evidence" size="sm" />
                <span className="text-xs font-bold text-purple-400">Tier 2</span>
              </div>
              <p className="text-xs text-slate-600">
                Backed by real production project with prompt syntax and workflow breakdown.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/70">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status="Test Verified" size="sm" />
                <span className="text-xs font-bold text-blue-400">Tier 3</span>
              </div>
              <p className="text-xs text-slate-600">
                Validated via standardized AI technical benchmark with objective score.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/70">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status="Client Verified" size="sm" />
                <span className="text-xs font-bold text-emerald-500">Tier 4</span>
              </div>
              <p className="text-xs text-slate-600">
                Validated and rated by paying brands on delivered commercial collaborations.
              </p>
            </div>
          </div>
        </section>

        {/* Two-Column Workspace: Skill Passport Snapshot + Active Brand Invitations */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 Cols): Skill Passport Snapshot */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <span>Skill Passport Snapshot</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Your live verified skill index visible to enterprise brands and agencies.
                  </p>
                </div>
                <Link href="/creator/passport">
                  <Button variant="ghost" size="sm" className="text-blue-600 font-semibold gap-1">
                    <span>Passport Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-4 divide-y divide-slate-100">
                {passportItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{item.skillName}</span>
                        <StatusBadge status={item.status} size="sm" />
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {item.evidence.summary}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-slate-900">
                          {item.score}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          SCORE
                        </span>
                      </div>
                      <Link href="/creator/passport">
                        <Button variant="outline" size="sm" className="text-xs py-1 h-7">
                          Evidence
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Portfolio Highlights */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderKanban className="w-5 h-5 text-indigo-600" />
                    <span>Recent Portfolio Campaigns</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Projects demonstrating prompt engineering and production execution.
                  </p>
                </div>
                <Link href="/creator/portfolio">
                  <Button variant="ghost" size="sm" className="text-indigo-600 font-semibold gap-1">
                    <span>View All ({creator.portfolio?.length || 0})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(creator.portfolio || []).slice(0, 2).map((project) => (
                  <div
                    key={project.id}
                    className="border border-slate-200/80 rounded-xl overflow-hidden hover:shadow-md transition flex flex-col bg-slate-50/30"
                  >
                    <div className="relative h-40 w-full bg-slate-200">
                      <Image
                        src={project.image || "/images/portfolio-skincare.jpg"}
                        alt={project.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 300px"
                        className="object-cover"
                      />
                      <span className="absolute top-2 left-2 text-[10px] bg-slate-900/80 text-white font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                        {project.contentType}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {project.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      </div>

                      {project.prompt && (
                        <div className="mt-3 p-2 rounded-lg bg-white border border-slate-200 text-[10px] text-slate-600 font-mono line-clamp-1">
                          <span className="text-blue-600 font-bold">Prompt: </span>
                          {project.prompt}
                        </div>
                      )}

                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">{project.brand}</span>
                        <Link
                          href="/creator/portfolio"
                          className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                        >
                          Details <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (1 Col): Collabs & Available Tests */}
          <div className="space-y-6">
            {/* Incoming Brand Collaboration */}
            <Card className="border-blue-200/80 bg-gradient-to-b from-blue-50/40 to-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="info" size="sm">
                    New Brand Match
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-medium">Just now</span>
                </div>
                <CardTitle className="text-base mt-2">GlowUp Skincare</CardTitle>
                <p className="text-xs text-slate-500">
                  Targeted campaign: <strong>Botanical Serum Reel & 3D UGC</strong>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-3 rounded-xl border border-blue-100 text-xs space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Offered Budget:</span>
                    <span className="font-bold text-slate-900">₹ 35,000</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Timeline:</span>
                    <span className="font-semibold text-slate-800">Deliver in 10 days</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Required Verification:</span>
                    <span className="font-semibold text-emerald-700">Client Verified Skincare</span>
                  </div>
                </div>

                {invitationStatus === "pending" ? (
                  <div className="flex gap-2">
                    <Button
                      variant="emerald"
                      size="sm"
                      className="flex-1 justify-center"
                      onClick={() => setInvitationStatus("accepted")}
                    >
                      <Check className="w-4 h-4" />
                      <span>Accept Collab</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 justify-center"
                      onClick={() => setInvitationStatus("declined")}
                    >
                      <X className="w-4 h-4" />
                      <span>Decline</span>
                    </Button>
                  </div>
                ) : invitationStatus === "accepted" ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Invitation accepted! The brand team has been notified.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-xs">
                    Collaboration declined.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Test Recommendation */}
            <Card>
              <CardHeader className="pb-3">
                <Badge variant="warning" size="sm">
                  Recommended Skill Test
                </Badge>
                <CardTitle className="text-sm mt-2">
                  Temporal Consistency & Motion Direction
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Passing this test upgrades your &quot;AI Video Generation&quot; skill from Claimed to <strong>Test Verified</strong>.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-semibold text-slate-800">25 Minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Passing Score:</span>
                    <span className="font-semibold text-slate-800">80%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reward Badge:</span>
                    <span className="font-bold text-blue-600">Certified AI Motion Director</span>
                  </div>
                </div>

                <Link href="/creator/tests/temporal-video" className="block">
                  <Button variant="default" size="sm" className="w-full justify-center">
                    <span>Start Benchmark Test</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* AI Profile Auditor Card */}
            <Card className="bg-gradient-to-br from-indigo-900 to-purple-950 text-white border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>AI Profile Auditor</span>
                </div>
                <CardTitle className="text-white text-base mt-1">
                  Optimize Match Ranking
                </CardTitle>
                <p className="text-xs text-indigo-200">
                  Analyze your skills, bio, and portfolio with our backend AI engine to maximize brand discovery.
                </p>
              </CardHeader>
              <CardContent>
                <Link href="/creator/profile" className="block">
                  <Button
                    variant="gradient"
                    size="sm"
                    className="w-full justify-center bg-white text-slate-900 hover:bg-slate-100"
                  >
                    <span>Run AI Profile Audit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Floating AI Advisor Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setChatbotOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer font-bold text-xs sm:text-sm"
        >
          <Bot className="w-5 h-5 text-white animate-bounce" />
          <span className="hidden sm:inline text-xs font-bold pr-1">Ask AI Advisor</span>
        </button>
      </div>

      <AIChatbotModal
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
        userRole="creator"
        userNiche={creator.category}
        creatorId={creator.id}
        userName={creator.name}
      />
    </div>
  );
}
