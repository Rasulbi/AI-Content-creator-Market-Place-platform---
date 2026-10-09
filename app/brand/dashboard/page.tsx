"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { logout, getCurrentUser, User as AuthUser } from "@/lib/auth";
import { Creator } from "@/lib/creators-data";
import { getStoredCreators } from "@/lib/creators-store";
import {
  CAMPAIGN_PRESETS,
  CampaignRequirements,
  rankCreatorsForCampaign,
} from "@/lib/ai-matching";
import { CreatorCard } from "@/components/creator/CreatorCard";
import { VerifiedCreatorCard } from "@/components/creator/VerifiedCreatorCard";
import {
  VerifyCreatorsOutput,
  CreatorVerificationItem,
  VerificationStatus,
} from "@/lib/ai/verification-types";
import { AIChatbotModal } from "@/components/ai/AIChatbotModal";
import { AIContentSuggestions } from "@/components/ai/AIContentSuggestions";
import {
  Search,
  Bell,
  Home,
  Megaphone,
  Bookmark,
  FolderKanban,
  Settings,
  Sparkles,
  ChevronDown,
  LogOut,
  ExternalLink,
  Bot,
  Lightbulb,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Briefcase,
  Flame,
  Plus,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  Filter,
  Layers,
  XCircle,
  RotateCcw,
} from "lucide-react";

export default function BrandDashboardPage() {
  const router = useRouter();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    "Dashboard" | "Campaigns" | "Find Creators" | "Shortlist" | "Content Studio" | "Projects" | "Settings"
  >("Find Creators");

  // Selected Campaign Preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>("camp-skincare");

  // Current campaign requirements state
  const activePreset = useMemo(() => {
    return CAMPAIGN_PRESETS.find((p) => p.id === selectedPresetId) || CAMPAIGN_PRESETS[0];
  }, [selectedPresetId]);

  const [brandName, setBrandName] = useState("GlowUp Skincare");
  const [campaignProduct, setCampaignProduct] = useState(activePreset.productOrService);
  const [campaignCategory, setCampaignCategory] = useState<string>(activePreset.category);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [campaignGoal, setCampaignGoal] = useState(activePreset.campaignGoal);
  const [targetAudience, setTargetAudience] = useState(activePreset.targetAudience);
  const [contentTypes, setContentTypes] = useState<string[]>(activePreset.contentType);
  const [platform, setPlatform] = useState(activePreset.platform);
  const [budget, setBudget] = useState(activePreset.budget);
  const [duration, setDuration] = useState(activePreset.deadline);
  const [notes, setNotes] = useState(activePreset.notes || "");

  // Search filter query
  const [searchQuery, setSearchQuery] = useState("");

  // AI Profile Verification State
  // CRITICAL REQUIREMENT: Do NOT automatically display creator profiles before AI verification!
  const [hasVerified, setHasVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationStageText, setVerificationStageText] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationOutput, setVerificationOutput] = useState<VerifyCreatorsOutput | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | VerificationStatus>("All");

  // Legacy analysis state for backwards compatibility
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisCounter, setAnalysisCounter] = useState<number>(0);

  // Shortlisted creator IDs
  const [shortlistedIds, setShortlistedIds] = useState<string[]>(["ananya-rao"]);

  // User menu & Chatbot modal state
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  // Current logged in user & creators catalog
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [creatorsCatalog, setCreatorsCatalog] = useState<Creator[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user?.companyName) {
      setBrandName(user.companyName);
    }
    setCreatorsCatalog(getStoredCreators());

    const handleCatalogUpdate = () => {
      setCreatorsCatalog(getStoredCreators());
    };

    window.addEventListener("creators-store-updated", handleCatalogUpdate);
    return () => window.removeEventListener("creators-store-updated", handleCatalogUpdate);
  }, []);

  // When changing preset, update the form and require re-verification
  const handleSelectPreset = (preset: CampaignRequirements) => {
    setSelectedPresetId(preset.id || "");
    setCampaignProduct(preset.productOrService);
    setCampaignCategory(preset.category);
    setIsCustomCategory(false);
    setCustomCategoryInput("");
    setCampaignGoal(preset.campaignGoal);
    setTargetAudience(preset.targetAudience);
    setContentTypes(preset.contentType);
    setPlatform(preset.platform);
    setBudget(preset.budget);
    setDuration(preset.deadline);
    setNotes(preset.notes || "");

    // Reset verification so creators aren't automatically revealed
    setHasVerified(false);
    setVerificationOutput(null);
    setVerificationError(null);
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

  /**
   * Triggers the real AI-Powered Profile Verification Workflow
   */
  const handleVerifyWithAI = async () => {
    if (!brandName.trim() || !campaignProduct.trim()) {
      setVerificationError("Please provide both Brand Name and Product Name to start AI verification.");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    setVerificationProgress(20);
    setVerificationStageText("Initializing AI verification engine & loading campaign parameters...");

    const t1 = setTimeout(() => {
      setVerificationProgress(50);
      setVerificationStageText("Auditing creator identity, verified skills, and past brand collaborations...");
    }, 450);

    const t2 = setTimeout(() => {
      setVerificationProgress(85);
      setVerificationStageText("Cross-referencing platform engagement telemetry and calculating accuracy scores...");
    }, 950);

    try {
      const res = await fetch("/api/ai/verify-creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          productName: campaignProduct.trim(),
          category: campaignCategory,
          platform,
          targetAudience,
          contentTypes,
          budget,
          deadline: duration,
          notes,
          creators: creatorsCatalog.length > 0 ? creatorsCatalog : undefined,
        }),
      });

      clearTimeout(t1);
      clearTimeout(t2);

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Verification failed (HTTP ${res.status})`);
      }

      setVerificationProgress(100);
      setVerificationStageText("AI profile verification complete!");
      setVerificationOutput(json.data);
      setHasVerified(true);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setVerificationError(err.message || "Failed to complete AI verification audit. Please retry.");
    } finally {
      setTimeout(() => {
        setIsVerifying(false);
      }, 350);
    }
  };

  const handleRunAiAnalysis = () => {
    handleVerifyWithAI();
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
    const catalog = creatorsCatalog.length > 0 ? creatorsCatalog : getStoredCreators();
    const list = rankCreatorsForCampaign(catalog, currentCampaignConfig);

    // Filter by shortlist if on shortlist tab
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
  }, [currentCampaignConfig, activeTab, shortlistedIds, searchQuery, analysisCounter, creatorsCatalog]);

  // Verified Creators list filtered by status, shortlist tab, and search query
  const displayedVerifiedCreators = useMemo(() => {
    if (!verificationOutput) return [];
    let list = [...verificationOutput.verifications];

    // Filter by verification status filter (All, Verified, Partially Verified, Not Verified)
    if (statusFilter !== "All") {
      list = list.filter((item) => item.verificationStatus === statusFilter);
    }

    // Filter by shortlist if on shortlist tab
    if (activeTab === "Shortlist") {
      list = list.filter((item) => shortlistedIds.includes(item.creatorId));
    }

    // Apply text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.creatorName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.professionalTitle.toLowerCase().includes(q) ||
          item.verifiedSkills.some((s) => s.toLowerCase().includes(q))
      );
    }

    return list;
  }, [verificationOutput, statusFilter, activeTab, shortlistedIds, searchQuery]);

  const topMatch = rankedCreators[0];
  const topVerifiedMatch = verificationOutput?.verifications[0];

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
              placeholder="Search creators by name, skill (e.g. UGC, Reels, CapCut), or category..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Right Tools & Profile */}
        <div className="flex items-center gap-3">
          {/* Quick AI Assistant Launch Button */}
          <button
            type="button"
            onClick={() => setChatbotOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow hover:opacity-95 transition cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">AI Advisor</span>
          </button>

          <button
            type="button"
            className="relative p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* User Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 p-1.5 pr-2 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden relative ring-2 ring-purple-500/20">
                <Image
                  src={currentUser?.avatarUrl || "/images/brand-user.jpg"}
                  alt="Brand Profile"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser?.name || "Aarav Mehta"}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {currentUser?.companyName || "GlowUp Skincare"}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fadeIn">
                <Link
                  href="/creator/dashboard"
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
              { name: "Find Creators", icon: Search },
              {
                name: "Shortlist",
                icon: Bookmark,
                badge: shortlistedIds.length > 0 ? shortlistedIds.length : undefined,
              },
              { name: "Content Studio", icon: Lightbulb, badge: "AI" },
              { name: "Campaigns", icon: Megaphone, badge: "2" },
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

        {/* Center Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* TAB: FIND CREATORS & SMART MATCHING */}
          {(activeTab === "Find Creators" || activeTab === "Shortlist") && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Column 1: Campaign Requirements Form (5 cols on xl) */}
              <div className="xl:col-span-5 space-y-6">
                {/* 1-Click Presets Bar */}
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

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                            {p.category === "Gaming" && "🎮 "}
                            {p.category === "Education" && "📚 "}
                            {p.category === "Agriculture" && "🌾 "}
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
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                        <FolderKanban className="w-4 h-4" />
                      </div>
                      <h2 className="text-base font-bold text-slate-900">
                        Campaign Objectives & Brief
                      </h2>
                    </div>
                  </div>

                  {/* Brand & Product Inputs */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>Brand Name</span>
                          <span className="text-[10px] text-indigo-600 font-semibold">Required</span>
                        </label>
                        <input
                          type="text"
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          placeholder="e.g. GlowUp Skincare, Nike, Cult.fit..."
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>Product Name</span>
                          <span className="text-[10px] text-indigo-600 font-semibold">Required</span>
                        </label>
                        <input
                          type="text"
                          value={campaignProduct}
                          onChange={(e) => setCampaignProduct(e.target.value)}
                          placeholder="e.g. Hydra-Glow Serum 2.0"
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>Target Industry</span>
                          {isCustomCategory && (
                            <span className="text-[10px] text-purple-600 font-bold">Custom</span>
                          )}
                        </label>
                        <select
                          value={isCustomCategory ? "Others" : campaignCategory}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHasVerified(false);
                            setVerificationOutput(null);
                            setVerificationError(null);
                            if (val === "Others") {
                              setIsCustomCategory(true);
                              setCampaignCategory(customCategoryInput.trim() || "Gaming");
                            } else {
                              setIsCustomCategory(false);
                              setCampaignCategory(val);
                            }
                          }}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                        >
                          <optgroup label="Predefined Industries (5+ Profiles Each)">
                            <option value="Beauty & Skincare">🧴 Beauty & Skincare (5 profiles)</option>
                            <option value="Fashion">👗 Fashion (5 profiles)</option>
                            <option value="Technology">📱 Technology (5 profiles)</option>
                            <option value="Fitness & Wellness">🏋️ Fitness & Wellness (5 profiles)</option>
                            <option value="Food">🥗 Food (5 profiles)</option>
                            <option value="Travel & Lifestyle">✈️ Travel & Lifestyle (5 profiles)</option>
                          </optgroup>
                          <optgroup label="Featured Additional Industries">
                            <option value="Gaming">🎮 Gaming (5 profiles)</option>
                            <option value="Education">📚 Education (5 profiles)</option>
                            <option value="Agriculture">🌾 Agriculture (5 profiles)</option>
                          </optgroup>
                          <optgroup label="Custom / New Industries">
                            <option value="Others">✨ Others (Pick or Type Custom Industry)</option>
                          </optgroup>
                        </select>

                        {/* Custom Industry Input & Quick Suggestion Chips */}
                        {isCustomCategory && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                            <label className="block text-[11px] font-bold text-purple-900">
                              Enter Custom Industry:
                            </label>
                            <input
                              type="text"
                              value={campaignCategory}
                              onChange={(e) => {
                                setCustomCategoryInput(e.target.value);
                                setCampaignCategory(e.target.value);
                                setHasVerified(false);
                                setVerificationOutput(null);
                              }}
                              placeholder="e.g. Gaming, Education, Agriculture, Web3..."
                              className="w-full p-2 rounded-lg border border-purple-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                            />
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 font-semibold block">Quick Selection:</span>
                              <div className="flex flex-wrap gap-1">
                                {[
                                  { label: "🎮 Gaming", val: "Gaming" },
                                  { label: "📚 Education", val: "Education" },
                                  { label: "🌾 Agriculture", val: "Agriculture" },
                                  { label: "💰 Web3 & Finance", val: "Finance" },
                                  { label: "🏡 Real Estate", val: "Real Estate" },
                                ].map((chip) => (
                                  <button
                                    key={chip.val}
                                    type="button"
                                    onClick={() => {
                                      setCampaignCategory(chip.val);
                                      setCustomCategoryInput(chip.val);
                                      setHasVerified(false);
                                      setVerificationOutput(null);
                                    }}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer ${
                                      campaignCategory.toLowerCase() === chip.val.toLowerCase()
                                        ? "bg-purple-600 text-white border-purple-600"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                    }`}
                                  >
                                    {chip.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Target Platform
                        </label>
                        <select
                          value={platform}
                          onChange={(e) => {
                            setPlatform(e.target.value);
                            setHasVerified(false);
                            setVerificationOutput(null);
                          }}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Instagram">Instagram</option>
                          <option value="YouTube">YouTube</option>
                          <option value="TikTok">TikTok</option>
                        </select>
                      </div>
                    </div>

                    {/* Content Types */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Required Content Format
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
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                                  isSelected
                                    ? "bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold"
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
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Budget
                        </label>
                        <select
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
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
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="1 Week">1 Week</option>
                          <option value="2 Weeks">2 Weeks</option>
                          <option value="3 Weeks">3 Weeks</option>
                          <option value="1 Month">1 Month</option>
                        </select>
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Campaign Brief Notes
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Key brand messaging, aesthetic guidelines..."
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    {/* Verification Error Notice */}
                    {verificationError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold">{verificationError}</p>
                          <button
                            type="button"
                            onClick={handleVerifyWithAI}
                            className="mt-1 text-xs text-rose-700 underline font-bold hover:text-rose-900 cursor-pointer"
                          >
                            Retry Verification
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Prominent "Verify with AI" Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleVerifyWithAI}
                        disabled={isVerifying}
                        className="w-full py-3.5 px-4 rounded-xl text-white text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                      >
                        {isVerifying ? (
                          <>
                            <Sparkles className="w-4 h-4 animate-spin text-white" />
                            <span>AI is analyzing creator profiles...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-300" />
                            <Sparkles className="w-4 h-4 text-purple-200" />
                            <span>Verify with AI</span>
                          </>
                        )}
                      </button>
                      <p className="text-[11px] text-slate-500 text-center mt-2">
                        Multi-factor audit: Authenticity (25%), Brand Relevance (30%), Niche (25%), Engagement (10%), Profile (10%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Creator Cards & Ranking (7 cols on xl) */}
              <div className="xl:col-span-7 space-y-6">
                {/* STATE 1: AI Verification in Progress */}
                {isVerifying && (
                  <div className="bg-white rounded-3xl p-8 sm:p-10 text-center border border-indigo-100 shadow-md space-y-5 animate-pulse">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/30">
                      <Sparkles className="w-8 h-8 animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        AI is analyzing creator profiles...
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        {verificationStageText || "Evaluating brand, product, and platform alignment against marketplace creator registry."}
                      </p>
                    </div>
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>Verification Progress</span>
                        <span>{verificationProgress}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full transition-all duration-300"
                          style={{ width: `${verificationProgress}%` }}
                        />
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2 text-[11px] text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Evidence-based scoring · Server-side secure credentials</span>
                    </div>
                  </div>
                )}

                {/* STATE 2: Empty State Before User Runs AI Verification */}
                {!hasVerified && !isVerifying && (
                  <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/90 shadow-sm space-y-6">
                    <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-inner">
                      <ShieldCheck className="w-10 h-10 text-indigo-600" />
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow">
                        <Sparkles className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div className="max-w-md mx-auto">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900">
                        AI Profile Verification Required
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                        To ensure accurate creator recommendations, creator profiles are only displayed after a multi-factor AI audit against your brand, product, and platform requirements.
                      </p>
                    </div>

                    {/* Verification Readiness Checklist */}
                    <div className="max-w-md mx-auto bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2.5 text-xs">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Campaign Parameters Ready for Audit:
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Brand Name:</span>
                        <span className="font-bold text-slate-900">{brandName || "Enter Brand Name"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Product Name:</span>
                        <span className="font-bold text-slate-900">{campaignProduct || "Enter Product Name"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Target Niche & Platform:</span>
                        <span className="font-bold text-indigo-600">{campaignCategory} &bull; {platform}</span>
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={handleVerifyWithAI}
                        className="py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/25 hover:opacity-95 transition cursor-pointer inline-flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        <span>Verify with AI Now</span>
                      </button>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Click to audit credentials, past brand collaborations, engagement reliability, and accuracy scores.
                      </p>
                    </div>
                  </div>
                )}

                {/* STATE 3: Verification Complete - Display Creator Profiles & Scores */}
                {hasVerified && verificationOutput && (
                  <>
                    {/* AI Verification Results Summary Header */}
                    <div className="bg-gradient-to-r from-indigo-50/90 via-blue-50/90 to-purple-50/90 rounded-3xl p-5 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-indigo-100 flex items-center justify-center text-emerald-600">
                          <ShieldCheck className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900">
                              AI Profile Verification Complete
                            </h3>
                            <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-100 shadow-sm">
                              {verificationOutput.provider}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Verified against &quot;{verificationOutput.campaignSummary.brandName}&quot; &bull; &quot;{verificationOutput.campaignSummary.productName}&quot;
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleVerifyWithAI}
                          disabled={isVerifying}
                          className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                          title="Re-run AI verification"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
                          <span>Re-Verify</span>
                        </button>
                      </div>
                    </div>

                    {/* Authenticity & Demo Transparency Banner */}
                    <div className="bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200/90 rounded-2xl p-4 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <span>Profile Evaluation & Campaign Match Disclaimers</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-700">
                        <div className="bg-white/85 p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                          <span className="font-bold text-amber-900 block mb-0.5">🧪 Demo Sandbox Profiles:</span>
                          <span>
                            Creator profiles displayed in this demo registry are simulated sandbox accounts for marketplace evaluation. Fictional accounts are explicitly flagged with demo indicators and do not pretend to be live Instagram/YouTube accounts.
                          </span>
                        </div>
                        <div className="bg-white/85 p-2.5 rounded-xl border border-blue-200/80 shadow-2xs">
                          <span className="font-bold text-indigo-900 block mb-0.5">📊 AI Match Score (Not Account Authenticity Proof):</span>
                          <span>
                            The AI score is strictly a Campaign Requirements Matching Score. Actual creator account authenticity, identity verification, and live handle ownership require independent offline KYC & OAuth platform access tokens.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Filter Badges (All, Verified, Partially Verified, Not Verified) */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {[
                        { id: "All", label: "All Matched Profiles", count: verificationOutput.verifications.length },
                        {
                          id: "Verified",
                          label: "Match Verified",
                          count: verificationOutput.verifiedCount,
                          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
                        },
                        {
                          id: "Partially Verified",
                          label: "Partially Matched",
                          count: verificationOutput.partiallyVerifiedCount,
                          color: "text-amber-700 bg-amber-50 border-amber-200",
                        },
                        {
                          id: "Not Verified",
                          label: "Low Match",
                          count: verificationOutput.notVerifiedCount,
                          color: "text-rose-700 bg-rose-50 border-rose-200",
                        },
                      ].map((pill) => {
                        const isSelected = statusFilter === pill.id;
                        return (
                          <button
                            key={pill.id}
                            type="button"
                            onClick={() => setStatusFilter(pill.id as typeof statusFilter)}
                            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                              isSelected
                                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                : pill.color || "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span>{pill.label}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {pill.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Filter state banner if in Shortlist tab */}
                    {activeTab === "Shortlist" && (
                      <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs font-semibold text-purple-800 flex items-center justify-between">
                        <span>Showing Shortlisted Creators ({displayedVerifiedCreators.length})</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("Find Creators")}
                          className="text-purple-600 underline cursor-pointer"
                        >
                          View All Creators
                        </button>
                      </div>
                    )}

                    {/* Verified Creators List */}
                    <div className="space-y-5">
                      {displayedVerifiedCreators.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                            <Bookmark className="w-7 h-7" />
                          </div>
                          <h4 className="text-base font-bold text-slate-800">
                            No verified creators match current filter ({statusFilter})
                          </h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Try switching status filter tabs or adjusting your search keyword.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("All");
                              setSearchQuery("");
                            }}
                            className="py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer"
                          >
                            Reset Filters to All
                          </button>
                        </div>
                      ) : (
                        displayedVerifiedCreators.map((item) => (
                          <VerifiedCreatorCard
                            key={item.creatorId}
                            item={item}
                            isShortlisted={shortlistedIds.includes(item.creatorId)}
                            onToggleShortlist={handleToggleShortlist}
                          />
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB: DASHBOARD OVERVIEW */}
          {activeTab === "Dashboard" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black">
                    Brand Campaign Control Center
                  </h1>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1">
                    Manage active sponsorships, shortlists, and creator match results for {currentUser?.companyName || "GlowUp Skincare"}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("Find Creators")}
                  className="py-2.5 px-5 rounded-xl bg-white text-indigo-700 text-xs font-bold hover:bg-blue-50 transition shadow"
                >
                  Find New Creators
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold">Active Campaigns</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">2</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold">Shortlisted Creators</div>
                  <div className="text-2xl font-bold text-purple-600 mt-1">{shortlistedIds.length}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold">Top AI Match Score</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">{topMatch?.match.totalScore || 94}%</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold">Escrow Committed</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">₹ 60,000</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CAMPAIGNS */}
          {activeTab === "Campaigns" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Active Brand Campaigns</h2>
                  <p className="text-xs text-slate-500">Track campaign briefs, deliverables, and matched talent</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("Find Creators")}
                  className="py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
                >
                  + New Campaign
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Recruiting Creators
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">
                      Hydra-Glow Daily Moisturizer Launch
                    </h4>
                    <p className="text-xs text-slate-600">
                      Deliverable: 3x Instagram Reels · Budget: ₹ 25,000 - ₹ 35,000 · Category: Beauty & Skincare
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPresetId("camp-skincare");
                      setActiveTab("Find Creators");
                    }}
                    className="py-2 px-4 rounded-xl bg-white border border-slate-200 text-xs font-semibold hover:bg-slate-100"
                  >
                    View Matches (6)
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      In Review
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">
                      Next-Gen AI Mechanical Keyboard Showcase
                    </h4>
                    <p className="text-xs text-slate-600">
                      Deliverable: 1 YouTube Review + 2 Shorts · Budget: ₹ 35,000 · Category: Technology
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPresetId("camp-tech");
                      setActiveTab("Find Creators");
                    }}
                    className="py-2 px-4 rounded-xl bg-white border border-slate-200 text-xs font-semibold hover:bg-slate-100"
                  >
                    View Matches (6)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONTENT STUDIO */}
          {activeTab === "Content Studio" && (
            <AIContentSuggestions
              initialNiche={campaignCategory}
              initialPlatform={platform}
            />
          )}

          {/* TAB: PROJECTS */}
          {activeTab === "Projects" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Project Contracts & Escrow</h2>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">Contract #4092: Ananya Rao</span>
                  <p className="text-slate-500">Milestone 1: Storyboard approved · Milestone 2: Draft video in review</p>
                </div>
                <span className="text-emerald-600 font-bold">Escrow Funded (₹ 30,000)</span>
              </div>
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === "Settings" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Brand Settings</h2>
              <div className="space-y-4 max-w-md text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    defaultValue={currentUser?.companyName || "GlowUp Skincare"}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand Email</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.email || "marketing@glowup.com"}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => alert("Brand settings saved successfully!")}
                  className="py-2.5 px-5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FLOATING AI ASSISTANT BUTTON */}
      <button
        type="button"
        onClick={() => setChatbotOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer"
        aria-label="Open AI Assistant"
      >
        <Bot className="w-6 h-6" />
        <span className="hidden sm:inline text-xs font-bold pr-1">Ask AI Advisor</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </button>

      {/* AI CHATBOT MODAL */}
      <AIChatbotModal
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
        userRole="brand"
        userNiche={campaignCategory}
      />
    </div>
  );
}
