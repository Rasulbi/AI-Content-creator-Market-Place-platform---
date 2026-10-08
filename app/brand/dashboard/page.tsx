"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { logout } from "@/lib/auth";
import { CREATORS_DATA, Creator } from "@/lib/creators-data";
import {
  CAMPAIGN_PRESETS,
  CampaignRequirements,
  rankCreatorsForCampaign,
  MatchResult,
} from "@/lib/ai-matching";
import { CreatorCard } from "@/components/creator/CreatorCard";
import {
  Search,
  Bell,
  Home,
  Megaphone,
  Bookmark,
  FolderKanban,
  Settings,
  Sparkles,
  Info,
  Users,
  ChevronDown,
  LogOut,
  ExternalLink,
  Bot,
  Lightbulb,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Check,
  Filter,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  Flame,
} from "lucide-react";

export default function BrandDashboardPage() {
  const router = useRouter();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<"Dashboard" | "Campaigns" | "Find Creators" | "Shortlist" | "Projects" | "Settings">(
    "Find Creators"
  );

  // Selected Campaign Preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>("camp-skincare");

  // Current campaign requirements state
  const activePreset = useMemo(() => {
    return CAMPAIGN_PRESETS.find((p) => p.id === selectedPresetId) || CAMPAIGN_PRESETS[0];
  }, [selectedPresetId]);

  const [campaignProduct, setCampaignProduct] = useState(activePreset.productOrService);
  const [campaignCategory, setCampaignCategory] = useState(activePreset.category);
  const [campaignGoal, setCampaignGoal] = useState(activePreset.campaignGoal);
  const [targetAudience, setTargetAudience] = useState(activePreset.targetAudience);
  const [contentTypes, setContentTypes] = useState<string[]>(activePreset.contentType);
  const [platform, setPlatform] = useState(activePreset.platform);
  const [budget, setBudget] = useState(activePreset.budget);
  const [duration, setDuration] = useState(activePreset.deadline);
  const [notes, setNotes] = useState(activePreset.notes || "");

  // Search filter query
  const [searchQuery, setSearchQuery] = useState("");

  // AI Matching state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisCounter, setAnalysisCounter] = useState<number>(0);

  // Shortlisted creator IDs
  const [shortlistedIds, setShortlistedIds] = useState<string[]>(["ananya-rao"]);

  // User menu state
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // When changing preset, update the form
  const handleSelectPreset = (preset: CampaignRequirements) => {
    setSelectedPresetId(preset.id || "");
    setCampaignProduct(preset.productOrService);
    setCampaignCategory(preset.category);
    setCampaignGoal(preset.campaignGoal);
    setTargetAudience(preset.targetAudience);
    setContentTypes(preset.contentType);
    setPlatform(preset.platform);
    setBudget(preset.budget);
    setDuration(preset.deadline);
    setNotes(preset.notes || "");

    // Trigger AI re-evaluation
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisCounter((c) => c + 1);
    }, 500);
  };

  const toggleContentType = (tag: string) => {
    if (contentTypes.includes(tag)) {
      setContentTypes(contentTypes.filter((t) => t !== tag));
    } else {
      setContentTypes([...contentTypes, tag]);
    }
  };

  const handleToggleShortlist = (creatorId: string) => {
    if (shortlistedIds.includes(creatorId)) {
      setShortlistedIds(shortlistedIds.filter((id) => id !== creatorId));
    } else {
      setShortlistedIds([...shortlistedIds, creatorId]);
    }
  };

  const handleRunAiAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisCounter((c) => c + 1);
    }, 700);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Construct current campaign config object for AI scoring
  const currentCampaignConfig: CampaignRequirements = useMemo(() => {
    return {
      title: campaignProduct,
      productOrService: campaignProduct,
      category: campaignCategory,
      campaignGoal,
      targetAudience,
      requiredSkills: activePreset.requiredSkills,
      contentType: contentTypes,
      platform,
      budget,
      deadline: duration,
      notes,
    };
  }, [
    campaignProduct,
    campaignCategory,
    campaignGoal,
    targetAudience,
    activePreset.requiredSkills,
    contentTypes,
    platform,
    budget,
    duration,
    notes,
  ]);

  // Compute ranked creators using the AI Matching scoring engine
  const rankedCreators = useMemo(() => {
    const list = rankCreatorsForCampaign(CREATORS_DATA, currentCampaignConfig);

    // Apply shortlist filter if user clicked Shortlist tab
    if (activeTab === "Shortlist") {
      return list.filter((item) => shortlistedIds.includes(item.id));
    }

    // Apply text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.professionalTitle.toLowerCase().includes(q) ||
          item.skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCampaignConfig, activeTab, shortlistedIds, searchQuery, analysisCounter]);

  const topMatch = rankedCreators[0];
  const otherMatches = rankedCreators.slice(1);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-6">
          <Logo size="sm" />
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search creators by name, skill (e.g. UGC, Reels), or category..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Right: Notifications & User Profile */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* User Profile dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 p-1.5 pr-2 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden relative border border-slate-200">
                <Image
                  src="/images/brand-user.jpg"
                  alt="Brand User"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  Brand User
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Brand Account
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50">
                <Link
                  href="/brand/dashboard"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Home className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
                <Link
                  href="/login/influencer"
                  className="px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Switch to Creator View
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

      {/* Main Workspace Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Left Sidebar */}
        <aside className="w-56 hidden lg:flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            {[
              { name: "Dashboard", icon: Home },
              { name: "Campaigns", icon: Megaphone },
              { name: "Find Creators", icon: Search },
              {
                name: "Shortlist",
                icon: Bookmark,
                badge: shortlistedIds.length > 0 ? shortlistedIds.length : undefined,
              },
              { name: "Projects", icon: FolderKanban },
              { name: "Settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setActiveTab(item.name as typeof activeTab)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#6355F6] text-white shadow-md shadow-indigo-500/20"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? "bg-white text-indigo-700" : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Sidebar Promo Card */}
          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 rounded-2xl border border-indigo-100 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 mb-2">
              <Bot className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">
              Smarter Creator Matching with AI
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 mb-3">
              Weighted formula: 40% Skills, 25% Verification, 15% Portfolio, 10% Exp, 10% Ratings.
            </p>
            <button
              type="button"
              onClick={handleRunAiAnalysis}
              disabled={isAnalyzing}
              className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 text-white text-[11px] font-bold shadow hover:bg-indigo-700 transition cursor-pointer disabled:opacity-60"
            >
              {isAnalyzing ? "Recalculating..." : "Run AI Match Engine"}
            </button>
          </div>
        </aside>

        {/* Center Main Content Grid */}
        <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-w-0">
          {/* Column 1: Your Campaign Requirements (5 cols on xl) */}
          <div className="xl:col-span-5 space-y-6">
            {/* Quick Demo Campaign Presets Bar */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>1-Click Campaign Presets</span>
                </div>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
                  Test AI Re-Ranking
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Switching presets instantly tests how the AI re-ranks creators for that industry:
              </p>

              <div className="grid grid-cols-2 gap-2">
                {CAMPAIGN_PRESETS.map((p) => {
                  const isSelected = selectedPresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`text-left p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-50 text-purple-900 border-purple-300 ring-1 ring-purple-400"
                          : "bg-slate-50 text-slate-700 border-slate-200/70 hover:bg-slate-100"
                      }`}
                    >
                      <div className="truncate font-bold">
                        {p.category === "Beauty & Skincare" && "🧴 "}
                        {p.category === "Technology" && "📱 "}
                        {p.category === "Fashion" && "👗 "}
                        {p.category === "Fitness & Wellness" && "🏋️ "}
                        {p.category === "Food" && "🥗 "}
                        {p.category === "Travel & Lifestyle" && "✈️ "}
                        {p.category}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {p.productOrService.split("–")[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campaign Form Panel */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    Your Campaign Requirements
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  Brand Request
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Tell us what you need, and our AI will find the best matching creators for your campaign.
              </p>

              {/* Product / Service Card */}
              <div className="mb-4 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-xl overflow-hidden relative border border-slate-200 bg-white flex-shrink-0 shadow-sm">
                  <Image
                    src={
                      campaignCategory === "Beauty & Skincare"
                        ? "/images/glowup-cream.jpg"
                        : campaignCategory === "Technology"
                        ? "/images/portfolio-tech.jpg"
                        : campaignCategory === "Food"
                        ? "/images/portfolio-food.jpg"
                        : campaignCategory === "Fashion"
                        ? "/images/portfolio-fashion.jpg"
                        : "/images/glowup-cream.jpg"
                    }
                    alt="Product"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Product / Service
                  </div>
                  <input
                    type="text"
                    value={campaignProduct}
                    onChange={(e) => setCampaignProduct(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              {/* Category Selector */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category
                </label>
                <select
                  value={campaignCategory}
                  onChange={(e) => setCampaignCategory(e.target.value as typeof campaignCategory)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Beauty & Skincare">Beauty & Skincare</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Technology">Technology</option>
                  <option value="Fitness & Wellness">Fitness & Wellness</option>
                  <option value="Food">Food</option>
                  <option value="Travel & Lifestyle">Travel & Lifestyle</option>
                </select>
              </div>

              {/* Campaign Goal */}
              <div className="mb-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Campaign Goal</span>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={campaignGoal}
                  onChange={(e) => setCampaignGoal(e.target.value)}
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Target Audience */}
              <div className="mb-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Target Audience</span>
                </div>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Content Type Tags */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Content Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Reels", "Product Review", "Lifestyle Content", "YouTube Breakdowns", "UGC"].map(
                    (tag) => {
                      const isSelected = contentTypes.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleContentType(tag)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Budget & Duration */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Budget
                  </label>
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="₹ 15,000 - ₹ 25,000">₹ 15,000 - ₹ 25,000</option>
                    <option value="₹ 20,000 - ₹ 35,000">₹ 20,000 - ₹ 35,000</option>
                    <option value="₹ 35,000 - ₹ 50,000">₹ 35,000 - ₹ 50,000</option>
                    <option value="₹ 50,000+">₹ 50,000+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="1 Week">1 Week</option>
                    <option value="2 Weeks">2 Weeks</option>
                    <option value="3 Weeks">3 Weeks</option>
                    <option value="1 Month">1 Month</option>
                  </select>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Action Button: Analyze Creators with AI */}
              <button
                type="button"
                onClick={handleRunAiAnalysis}
                disabled={isAnalyzing}
                className="w-full py-3.5 px-4 rounded-xl text-white text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isAnalyzing ? "Analyzing Creators with AI..." : "Analyze Creators with AI"}
                </span>
              </button>
            </div>

            {/* Bottom Card: How AI Matching Works */}
            <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-100 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white text-indigo-600 shadow-sm flex-shrink-0">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  How AI Matching Works
                </h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Our algorithm calculates a multi-dimensional score across 5 key pillars:
                  <span className="font-semibold text-indigo-800"> Skill Match (40%)</span>,
                  <span className="font-semibold text-purple-800"> Verification (25%)</span>,
                  <span className="font-semibold text-blue-800"> Portfolio (15%)</span>,
                  <span className="font-semibold text-emerald-800"> Experience (10%)</span>, and
                  <span className="font-semibold text-amber-800"> Client Ratings (10%)</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Column 2: AI Analysis & Creator Cards (7 cols on xl) */}
          <div className="xl:col-span-7 space-y-6">
            {/* Top Analysis Complete Banner */}
            <div className="bg-gradient-to-r from-indigo-50/80 via-blue-50/80 to-purple-50/80 rounded-3xl p-5 border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    AI Analysis Complete
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Found {rankedCreators.length} verified creators ranked for &quot;{campaignCategory}&quot;
                  </p>
                </div>
              </div>

              {topMatch && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Best Match
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-extrabold text-indigo-600 bg-white px-2.5 py-1 rounded-full shadow-sm border border-indigo-100">
                    {topMatch.match.totalScore}% <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  </span>
                </div>
              )}
            </div>

            {/* Filter / View State Notice */}
            {activeTab === "Shortlist" && (
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs font-semibold text-purple-800 flex items-center justify-between">
                <span>Filtering by: Shortlisted Creators ({rankedCreators.length})</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("Find Creators")}
                  className="text-purple-600 underline cursor-pointer"
                >
                  View All Creators
                </button>
              </div>
            )}

            {/* List of Creators */}
            <div className="space-y-5">
              {rankedCreators.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
                  <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-slate-700">No creators found</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting your search filters or shortlist more creators.
                  </p>
                </div>
              ) : (
                rankedCreators.map((item, idx) => (
                  <CreatorCard
                    key={item.id}
                    creator={item}
                    match={item.match}
                    isShortlisted={shortlistedIds.includes(item.id)}
                    onToggleShortlist={handleToggleShortlist}
                    showDetailsDefault={idx === 0}
                  />
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
