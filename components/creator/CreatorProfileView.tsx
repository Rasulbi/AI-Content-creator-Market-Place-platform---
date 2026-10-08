"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Creator, PortfolioProject } from "@/lib/creators-data";
import { Logo } from "@/components/ui/Logo";
import {
  CheckCircle2,
  Users,
  TrendingUp,
  MapPin,
  Star,
  Bookmark,
  Sparkles,
  ArrowLeft,
  Mail,
  Send,
  Calendar,
  ShieldCheck,
  Check,
  ExternalLink,
  Layers,
  Award,
  Clock,
  DollarSign,
  Share2,
  X,
  FolderKanban,
  Zap,
} from "lucide-react";

interface CreatorProfileViewProps {
  creator: Creator;
}

export function CreatorProfileView({ creator }: CreatorProfileViewProps) {
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);

  // Invitation form state
  const [campaignTitle, setCampaignTitle] = useState(
    `Campaign Collab with ${creator.name}`
  );
  const [deliverables, setDeliverables] = useState("2 Instagram Reels + 1 Product Review");
  const [offeredBudget, setOfferedBudget] = useState(creator.priceRange.split("-")[0].trim() || "₹ 25,000");
  const [timeline, setTimeline] = useState("2 Weeks");
  const [inviteSent, setInviteSent] = useState(false);

  const handleSendInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSent(true);
    setTimeout(() => {
      setInviteSent(false);
      setInviteModalOpen(false);
      alert(`Invitation sent successfully to ${creator.name}! Escrow contract prepared.`);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Top Navigation */}
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
          <button
            type="button"
            onClick={() => setIsShortlisted(!isShortlisted)}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              isShortlisted
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isShortlisted ? "fill-purple-600 text-purple-600" : ""}`} />
            <span>{isShortlisted ? "Shortlisted" : "Shortlist"}</span>
          </button>

          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#6355F6] hover:bg-[#5244e6] active:bg-[#4335d5] shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Contact / Invite</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Profile Hero Header Card */}
        <div className="relative bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
          {/* Header Gradient Banner */}
          <div className="h-40 sm:h-52 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_50%)]" />
            <div className="absolute top-4 right-4 flex gap-2">
              <span className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/20 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {creator.baseMatchScore}% AI Match Engine
              </span>
            </div>
          </div>

          {/* Profile Identity Row */}
          <div className="px-6 sm:px-8 pb-8 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
              {/* Avatar */}
              <div className="flex items-end gap-5">
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden ring-4 ring-white shadow-xl bg-white flex-shrink-0">
                  <Image
                    src={creator.avatar}
                    alt={creator.name}
                    fill
                    className="object-cover"
                    priority
                  />
                  {creator.isVerified && (
                    <div
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-white shadow"
                      title="Verified AI Creator"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {creator.name}
                    </h1>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      Verified Creator
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-500 mt-1">
                    {creator.professionalTitle}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsShortlisted(!isShortlisted)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 cursor-pointer ${
                    isShortlisted
                      ? "bg-purple-100 text-purple-800 border-purple-300"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent"
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isShortlisted ? "fill-purple-600" : ""}`} />
                  <span>{isShortlisted ? "Shortlisted" : "Shortlist"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-md shadow-indigo-600/20 hover:opacity-95 transition cursor-pointer flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Campaign Offer</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Followers
                </span>
                <span className="text-lg font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  {creator.followers}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Engagement Rate
                </span>
                <span className="text-lg font-black text-emerald-600 mt-0.5 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  {creator.engagementRate}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Location
                </span>
                <span className="text-lg font-black text-slate-900 mt-0.5 flex items-center gap-1.5 truncate">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {creator.location}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Client Rating
                </span>
                <span className="text-lg font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {creator.clientRating.toFixed(1)}/5
                  <span className="text-xs text-slate-400 font-normal">({creator.reviewsCount})</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (1 col): Bio, Skills, Brand Collabs, Availability */}
          <div className="space-y-6">
            {/* Bio Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                About Creator
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {creator.bio}
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>Availability:</span>
                </span>
                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  {creator.availability}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-indigo-500" />
                  <span>Pricing / Rate:</span>
                </span>
                <span className="font-bold text-slate-900">
                  {creator.priceRange}
                </span>
              </div>
            </div>

            {/* Skills & Verified Skills */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Skills & Badges
                </h3>
                <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-bold">
                  {creator.verifiedSkills.length} Verified
                </span>
              </div>

              <div className="space-y-2">
                {creator.skills.map((skill) => {
                  const isVerified = creator.verifiedSkills.includes(skill);
                  return (
                    <div
                      key={skill}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold ${
                        isVerified
                          ? "bg-purple-50/70 text-purple-900 border border-purple-200/60"
                          : "bg-slate-50 text-slate-700 border border-slate-200/40"
                      }`}
                    >
                      <span>{skill}</span>
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Self-attested</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Previous Brand Collaborations */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                Brand Collaborations
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Verified work delivered for leading enterprise & D2C brands:
              </p>
              <div className="flex flex-wrap gap-2">
                {creator.previousBrandCollabs.map((brand) => (
                  <span
                    key={brand}
                    className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200"
                  >
                    {brand}
                  </span>
                ))}
              </div>
            </div>

            {/* Platforms & Content Formats */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                Platforms & Formats
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 mb-1.5">Platforms:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {creator.platforms.map((p) => (
                      <span
                        key={p}
                        className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-400 mb-1.5">Content Formats:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {creator.contentTypes.map((c) => (
                      <span
                        key={c}
                        className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (2 cols): Portfolio Showcase & Client Reviews */}
          <div className="lg:col-span-2 space-y-8">
            {/* PORTFOLIO SECTION */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Portfolio Gallery ({creator.portfolio.length} Featured / {creator.portfolioCount} Total)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live proof-of-work campaigns and creative assets
                  </p>
                </div>

                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
                  Verified Evidence
                </span>
              </div>

              {/* Portfolio Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {creator.portfolio.map((proj) => (
                  <div
                    key={proj.id}
                    className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Project Image */}
                      <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                        <Image
                          src={proj.image}
                          alt={proj.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {proj.category}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 sm:p-5">
                        <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                          {proj.brand} · {proj.contentType}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {proj.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                          {proj.description}
                        </p>

                        {/* Tools Used */}
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">
                            Tools Used:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {proj.toolsUsed.map((tool) => (
                              <span
                                key={tool}
                                className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium"
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Stats Banner */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                      <span className="text-emerald-600 font-bold">{proj.engagement}</span>
                      <span className="text-slate-500">{proj.reach}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Client Reviews Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Client Ratings & Reviews ({creator.reviewsCount})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verified feedback from brands who hired {creator.name}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold text-amber-800">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{creator.clientRating.toFixed(1)} / 5.0 Average</span>
                </div>
              </div>

              <div className="space-y-4">
                {creator.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{rev.reviewer}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-semibold text-indigo-600">{rev.brand}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({rev.role})</span>
                      </div>
                      <div className="flex items-center text-amber-500 text-xs font-bold gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{rev.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed italic">
                      &quot;{rev.comment}&quot;
                    </p>

                    <div className="text-[10px] text-slate-400 font-medium">{rev.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Campaign Invitation Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl overflow-hidden relative ring-2 ring-indigo-500/20">
                <Image src={creator.avatar} alt={creator.name} fill className="object-cover" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Send Campaign Invitation to {creator.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {creator.category} · {creator.followers} Followers
                </p>
              </div>
            </div>

            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Deliverables Required
                </label>
                <input
                  type="text"
                  value={deliverables}
                  onChange={(e) => setDeliverables(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Offered Budget
                  </label>
                  <input
                    type="text"
                    value={offeredBudget}
                    onChange={(e) => setOfferedBudget(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Timeline
                  </label>
                  <input
                    type="text"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    required
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-[11px] text-purple-700 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Payments are held securely in Escrow until you review and approve creator deliverables.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={inviteSent}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{inviteSent ? "Sending..." : "Send Invitation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
