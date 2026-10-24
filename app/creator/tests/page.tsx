"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CreatorNav } from "@/components/creator/CreatorNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  SKILL_TESTS_CATALOG,
  getStoredSkillPassport,
  getTestSubmissions,
  SkillPassportItem,
  TestSubmissionRecord,
} from "@/lib/skill-passport-store";
import { CREATORS_DATA, Creator } from "@/lib/creators-data";
import { getStoredCreators, getCreatorById } from "@/lib/creators-store";
import { getCurrentUser } from "@/lib/auth";
import {
  FileCheck2,
  ShieldCheck,
  Award,
  Sparkles,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Check,
  Search,
} from "lucide-react";

export default function SkillTestsPage() {
  const [creator, setCreator] = useState<Creator>(CREATORS_DATA[0]);
  const [passportItems, setPassportItems] = useState<SkillPassportItem[]>([]);
  const [submissions, setSubmissions] = useState<TestSubmissionRecord[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    const user = getCurrentUser();
    const stored = getStoredCreators();
    const matched = user ? getCreatorById(user.id) || stored[0] : stored[0];
    if (matched) {
      setCreator(matched);
      setPassportItems(getStoredSkillPassport(matched.id));
      setSubmissions(getTestSubmissions(matched.id));
    }

    async function fetchDbSubmissions() {
      try {
        const queryParam = user?.id ? `?creatorId=${encodeURIComponent(user.id)}` : "";
        const res = await fetch(`/api/v1/tests/submissions${queryParam}`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            const mappedDbSubs: TestSubmissionRecord[] = json.data.map((sub: any) => ({
              id: sub.id,
              testId: sub.skill_tests?.title || sub.test_id,
              creatorId: matched?.id || "ananya-rao",
              score: Number(sub.score) || 85,
              passed: sub.status === "passed",
              submittedAt: sub.submitted_at,
              quizScore: Math.round(Number(sub.score) || 85),
              promptScore: Math.round(Number(sub.score) || 85),
              feedback: sub.feedback || "Benchmark evaluation completed.",
              certificateId:
                sub.answers?.__certificate?.certificateId ||
                sub.answers?.certificateId ||
                `CERT-${sub.id.substring(0, 8).toUpperCase()}`,
            }));

            setSubmissions((prev) => {
              const ids = new Set(mappedDbSubs.map((m) => m.id));
              // Local submissions not confirmed by server database cannot be displayed as verified passes
              const unmapped = prev
                .filter((p) => !ids.has(p.id))
                .map((p) => ({
                  ...p,
                  passed: false,
                  certificateId: "",
                  feedback: "Local draft - pending authoritative server verification.",
                }));
              return [...mappedDbSubs, ...unmapped];
            });
          }
        }
      } catch (err) {
        console.warn("Submissions DB sync notice:", err);
      }
    }
    fetchDbSubmissions();

    const handleUpdate = () => {
      const refreshed = getStoredCreators();
      const current = user ? getCreatorById(user.id) || refreshed[0] : refreshed[0];
      if (current) {
        setCreator(current);
        setPassportItems(getStoredSkillPassport(current.id));
        setSubmissions(getTestSubmissions(current.id));
      }
      fetchDbSubmissions();
    };

    window.addEventListener("skill-passport-updated", handleUpdate);
    return () => window.removeEventListener("skill-passport-updated", handleUpdate);
  }, []);

  const filteredTests = SKILL_TESTS_CATALOG.filter((test) => {
    if (categoryFilter === "All") return true;
    return test.category === categoryFilter;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <CreatorNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header & Overview */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                AI Skill Benchmark Assessments
              </h1>
              <Badge variant="purple" size="sm">
                Standardized AI Tests
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Pass technical benchmark assessments to earn official <strong>Test Verified</strong> badges on your Skill Passport.
            </p>
          </div>

          <Link href="/creator/passport">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>View Skill Passport</span>
            </Button>
          </Link>
        </div>

        {/* Value Proposition Callout Banner */}
        <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Tier 3 Accreditation Engine</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Why Take AI Skill Benchmark Tests?
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Brand marketing directors prioritize creators with verifiable technical competence. Passing an assessment evaluates parameter precision, CFG scale mastery, and generation prompt structure with auto-graded credentialing.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/20 text-center">
                <span className="text-2xl font-extrabold text-white block">3x</span>
                <span className="text-[11px] text-blue-200 font-medium">Higher Brand Match Priority</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/20 text-center">
                <span className="text-2xl font-extrabold text-emerald-400 block">+40%</span>
                <span className="text-[11px] text-emerald-200 font-medium">Higher Average Collab Rate</span>
              </div>
            </div>
          </div>
        </section>

        {/* Filter Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {["All", "Generative Imagery", "AI Video Production", "Generative Audio", "Commercial Strategy", "Advanced Workflows"].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>

        {/* Tests Catalog Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => {
            // Check if creator has passed or submitted this test
            const passportEntry = passportItems.find(
              (p) => p.testResult?.testId === test.id || (p.skillName.toLowerCase() === test.associatedSkill.toLowerCase() && p.testResult)
            );
            const isPassed = Boolean(passportEntry?.testResult?.passed);
            const score = passportEntry?.testResult?.score;

            return (
              <Card
                key={test.id}
                className="hover:shadow-lg transition border-slate-200/90 flex flex-col justify-between"
              >
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {test.category}
                    </span>
                    <Badge
                      variant={test.difficulty === "Master" ? "purple" : "info"}
                      size="sm"
                    >
                      {test.difficulty}
                    </Badge>
                  </div>

                  <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                    {test.title}
                  </CardTitle>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {test.description}
                  </p>
                </CardHeader>

                <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Meta info: duration, passing score */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-700 font-semibold">{test.durationMinutes} Minutes</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-slate-700 font-semibold">Pass: {test.passingScore}%</span>
                      </div>
                    </div>

                    {/* Tools Covered */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Tools Evaluated:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {test.aiToolsCovered.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Reward Badge */}
                    <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase block">
                          Earns Credential:
                        </span>
                        <span className="font-bold text-slate-800">{test.rewardBadge}</span>
                      </div>
                    </div>
                  </div>

                  {/* Test Action & Status */}
                  <div className="pt-3 border-t border-slate-100">
                    {isPassed ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Passed ({score}%)</span>
                        </div>
                        <Link href={`/creator/tests/${test.id}`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            Retake / Review
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <Link href={`/creator/tests/${test.id}`} className="block">
                        <Button
                          variant="gradient"
                          size="md"
                          className="w-full justify-center gap-1.5 shadow-md shadow-blue-500/15"
                        >
                          <span>Start Assessment</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Assessment FAQ */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Assessment Structure & Grading FAQ
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm">1. Benchmark Technical Quiz</h4>
              <p className="leading-relaxed">
                Evaluates latent space dynamics, CFG scales, noise seeds, temporal consistency, and prompt weighting syntax.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm">2. Practical Prompt Challenge</h4>
              <p className="leading-relaxed">
                You are presented with an enterprise brand brief. You write and optimize the exact generation prompt, parameters, and workflow.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
              <h4 className="font-bold text-slate-900 text-sm">3. Instant Skill Passport Upgrade</h4>
              <p className="leading-relaxed">
                Passing with ≥ 80% automatically upgrades the corresponding skill to <strong>Test Verified</strong> with a cryptographic certificate.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
