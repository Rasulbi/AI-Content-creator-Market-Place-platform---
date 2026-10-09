"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreatorNav } from "@/components/creator/CreatorNav";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import {
  getStoredSkillPassport,
  calculatePassportSummary,
  SkillPassportItem,
  VerificationStatus,
} from "@/lib/skill-passport-store";
import { CREATORS_DATA, Creator, PortfolioProject } from "@/lib/creators-data";
import { getStoredCreators, getCreatorById } from "@/lib/creators-store";
import { getCurrentUser } from "@/lib/auth";
import {
  ShieldCheck,
  Award,
  Sparkles,
  CheckCircle2,
  FileCheck2,
  FolderKanban,
  ExternalLink,
  QrCode,
  Share2,
  Copy,
  Check,
  Search,
  Filter,
  Eye,
  Info,
  Clock,
  Printer,
  ChevronRight,
  Zap,
} from "lucide-react";

export default function SkillPassportPage() {
  const [creator, setCreator] = useState<Creator>(CREATORS_DATA[0]);
  const [passportItems, setPassportItems] = useState<SkillPassportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect Evidence Dossier Modal
  const [inspectItem, setInspectItem] = useState<SkillPassportItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
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

    window.addEventListener("skill-passport-updated", handleUpdate);
    window.addEventListener("creators-store-updated", handleUpdate);
    return () => {
      window.removeEventListener("skill-passport-updated", handleUpdate);
      window.removeEventListener("creators-store-updated", handleUpdate);
    };
  }, []);

  const passportSummary = calculatePassportSummary(passportItems);

  const handleCopyPassportLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/creators/${creator.id}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePrintPassport = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const filteredItems = passportItems.filter((item) => {
    const matchesFilter =
      statusFilter === "All" || item.status === statusFilter;
    const matchesSearch =
      item.skillName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans print:bg-white">
      <div className="print:hidden">
        <CreatorNav />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Skill Passport™
              </h1>
              <Badge variant="purple" size="sm">
                Official Marketplace Accreditation
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Cryptographically verifiable creator credentials with tangible generation prompts, benchmark test scores, and brand endorsements.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPassportLink}
              className="gap-1.5"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? "Link Copied!" : "Share Passport"}</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrintPassport}
              className="gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Export PDF</span>
            </Button>
          </div>
        </div>

        {/* Official Passport Hero Credential Card */}
        <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            {/* Identity & Seal */}
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden ring-4 ring-white/10 shadow-2xl shrink-0">
                <Image
                  src={creator.avatar || "/images/anjali.jpg"}
                  alt={creator.name}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
                <span className="absolute bottom-2 right-2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950" />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                    {creator.name}
                  </h2>
                  <span className="text-xs bg-blue-500/20 text-blue-300 font-bold px-2.5 py-0.5 rounded-full border border-blue-400/30">
                    PASS-AI-849204
                  </span>
                </div>

                <p className="text-slate-300 text-sm font-medium">
                  {creator.professionalTitle} · {creator.category}
                </p>

                <p className="text-xs text-slate-400 max-w-xl">
                  {creator.experience || "4+ Years in GenAI Content Creation, Beauty UGC & Visual Storytelling."}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Cryptographically Signed</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{creator.clientRating || 4.9} / 5.0 Brand Rating</span>
                  </span>
                  <span>·</span>
                  <span className="text-slate-400">Issued Oct 2026</span>
                </div>
              </div>
            </div>

            {/* Overall Score Badge */}
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-center shrink-0 w-full lg:w-64 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                Verification Score
              </span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-white">
                  {passportSummary.overallScore}
                </span>
                <span className="text-sm font-bold text-slate-400">/ 100</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 h-full rounded-full"
                  style={{ width: `${passportSummary.overallScore}%` }}
                />
              </div>
              <span className="text-xs font-bold text-emerald-400 block pt-1">
                {passportSummary.tierBadge}
              </span>
            </div>
          </div>
        </section>

        {/* 4 Verification Statuses Explainer Banner */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Verification Status Legend
            </h3>
            <span className="text-xs text-slate-500">
              4 distinct verification stages certified by marketplace protocol
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <StatusBadge status="Claimed" size="sm" />
                <span className="text-[11px] font-bold text-slate-400">
                  {passportSummary.claimedCount} Skills
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Self-declared skills submitted by the creator. Awaiting project proof or technical benchmark test.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <StatusBadge status="Portfolio Evidence" size="sm" />
                <span className="text-[11px] font-bold text-purple-600">
                  {passportSummary.portfolioEvidenceCount} Skills
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Backed by real production project with prompt syntax, version parameters, and workflow steps.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <StatusBadge status="Test Verified" size="sm" />
                <span className="text-[11px] font-bold text-blue-600">
                  {passportSummary.testVerifiedCount} Skills
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Validated via standardized AI technical benchmark assessment evaluating latent space and CFG mastery.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <StatusBadge status="Client Verified" size="sm" />
                <span className="text-[11px] font-bold text-emerald-700">
                  {passportSummary.clientVerifiedCount} Skills
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Formally endorsed and reviewed by paying brand clients on completed commercial collaborations.
              </p>
            </div>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            {["All", "Client Verified", "Test Verified", "Portfolio Evidence", "Claimed"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    statusFilter === status
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {status}
                </button>
              )
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search skill passport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-blue-500"
            />
          </div>
        </div>

        {/* Main Skill Passport Table & Detailed Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider px-2">
            <span>Verified Skill Competencies ({filteredItems.length})</span>
            <span>Accreditation Details</span>
          </div>

          <div className="space-y-4">
            {filteredItems.map((item) => {
              // Find matching portfolio projects
              const matchingProjects = (creator.portfolio || []).filter(
                (p) =>
                  item.portfolioProjectIds.includes(p.id) ||
                  p.skillsTagged?.includes(item.skillName)
              );

              return (
                <Card
                  key={item.id}
                  className="hover:shadow-md transition border-slate-200/90 overflow-hidden"
                >
                  <div className="p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Left: Skill name, Score, Status */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-extrabold text-slate-900">
                          {item.skillName}
                        </h3>
                        <StatusBadge status={item.status} size="md" />
                        <span className="text-xs text-slate-400 font-medium">
                          {item.category}
                        </span>
                      </div>

                      {/* Evidence Summary Text */}
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        {item.evidence.summary}
                      </p>

                      {/* Associated Tools & Proof Hashes */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {item.associatedTools &&
                          item.associatedTools.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                            >
                              {t}
                            </span>
                          ))}

                        {item.evidence.auditBadgeHash && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                            Hash: {item.evidence.auditBadgeHash}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Linked Portfolio Projects */}
                    <div className="lg:w-64 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Portfolio Projects ({matchingProjects.length})
                      </span>
                      {matchingProjects.length > 0 ? (
                        <div className="flex items-center gap-2">
                          {matchingProjects.slice(0, 3).map((proj) => (
                            <Link
                              key={proj.id}
                              href="/creator/portfolio"
                              className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-500 transition shrink-0"
                              title={`${proj.title} (${proj.brand})`}
                            >
                              <Image
                                src={proj.image || "/images/portfolio-skincare.jpg"}
                                alt={proj.title}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            </Link>
                          ))}
                          {matchingProjects.length > 3 && (
                            <span className="text-xs font-bold text-slate-500">
                              +{matchingProjects.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          No projects linked yet
                        </span>
                      )}
                    </div>

                    {/* Right: Test Result & Action */}
                    <div className="flex items-center justify-between lg:justify-end gap-6 w-full lg:w-auto shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                      {/* Test Result Tag */}
                      {item.testResult ? (
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-blue-700 block">
                            {item.testResult.score}% Benchmark
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.testResult.certificateId}
                          </span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-medium">
                            Score
                          </span>
                          <span className="text-sm font-extrabold text-slate-800">
                            {item.score} / 100
                          </span>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectItem(item)}
                        className="gap-1.5 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Evidence Dossier</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </main>

      {/* Inspect Evidence Dossier Modal */}
      {inspectItem && (
        <Modal
          isOpen={Boolean(inspectItem)}
          onClose={() => setInspectItem(null)}
          title={`Accreditation Dossier: ${inspectItem.skillName}`}
          description={`Skill Passport Cryptographic Evidence & Verification Trail`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Top Score & Status Header */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold block">
                  Skill Competency
                </span>
                <h3 className="text-lg font-black text-white">{inspectItem.skillName}</h3>
                <div className="mt-1.5">
                  <StatusBadge status={inspectItem.status} size="sm" />
                </div>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black text-emerald-400 block">
                  {inspectItem.score}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Accreditation Index
                </span>
              </div>
            </div>

            {/* Evidence Audit Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Verification Proof & Audit Trail
              </h4>
              <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed">
                {inspectItem.evidence.summary}
              </p>
            </div>

            {/* Verification Criteria */}
            {inspectItem.evidence.criteriaMet && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Validation Standards Met:
                </h4>
                <div className="space-y-1.5">
                  {inspectItem.evidence.criteriaMet.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/60 text-xs text-emerald-950 font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Certificate if present */}
            {inspectItem.testResult && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-blue-600" />
                    <span>Standardized AI Assessment Certificate</span>
                  </span>
                  <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[11px]">
                    Passed {inspectItem.testResult.score}%
                  </span>
                </div>
                <p className="text-blue-800 font-semibold">{inspectItem.testResult.testName}</p>
                <div className="flex justify-between text-blue-600 text-[11px] pt-1 border-t border-blue-200">
                  <span>Certificate ID: {inspectItem.testResult.certificateId}</span>
                  <span>Accuracy: {inspectItem.testResult.benchmarkAccuracy}</span>
                </div>
              </div>
            )}

            {/* Verification Hash & Signer */}
            <div className="p-3.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono space-y-1 border border-slate-200">
              <div className="flex justify-between">
                <span>Verified By:</span>
                <span className="font-bold text-slate-900">
                  {inspectItem.evidence.verifiedBy || "Automated AI Skill Benchmark Engine (v2.4)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Timestamp:</span>
                <span>{inspectItem.evidence.submittedDate} UTC</span>
              </div>
              {inspectItem.evidence.auditBadgeHash && (
                <div className="flex justify-between text-blue-700 font-bold">
                  <span>Cryptographic Hash:</span>
                  <span>{inspectItem.evidence.auditBadgeHash}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setInspectItem(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
