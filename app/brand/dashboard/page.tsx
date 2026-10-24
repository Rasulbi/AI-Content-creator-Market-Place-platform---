"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { logout, getCurrentUser, updateUserProfile, User as AuthUser } from "@/lib/auth";
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
  saveCampaignVerificationAction,
  getCampaignVerificationsAction,
} from "@/actions/ai-actions";
import {
  getBrandCampaignMatchesAction,
  hireCreatorAction,
} from "@/actions/brand-actions";
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
  Menu,
  X,
  Smartphone,
  Shirt,
  Dumbbell,
  Utensils,
  Plane,
  Gamepad2,
  GraduationCap,
  Wheat,
  SlidersHorizontal,
  ArrowRight,
  Check,
} from "lucide-react";

export default function BrandDashboardPage() {
  const router = useRouter();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    "Dashboard" | "Campaigns" | "Find Creators" | "Shortlist" | "Content Studio" | "Projects" | "Settings"
  >("Find Creators");

  // Mobile sidebar drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  // Database campaigns state
  const [dbCampaigns, setDbCampaigns] = useState<any[]>([]);
  const [newCampaignModalOpen, setNewCampaignModalOpen] = useState(false);
  const [newCampTitle, setNewCampTitle] = useState("");
  const [newCampDesc, setNewCampDesc] = useState("");
  const [newCampCategory, setNewCampCategory] = useState("Beauty & Skincare");
  const [newCampBudgetMin, setNewCampBudgetMin] = useState("20000");
  const [newCampBudgetMax, setNewCampBudgetMax] = useState("35000");
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campNotice, setCampNotice] = useState<string | null>(null);
  const [campErrors, setCampErrors] = useState<{ title?: string; desc?: string; budget?: string; general?: string }>({});

  // Sent invitations and matches state
  const [brandMatches, setBrandMatches] = useState<any[]>([]);
  const [loadingBrandMatches, setLoadingBrandMatches] = useState(false);
  const [hiringMatchId, setHiringMatchId] = useState<string | null>(null);
  const [brandMatchNotice, setBrandMatchNotice] = useState<string | null>(null);

  const fetchBrandMatches = async () => {
    try {
      setLoadingBrandMatches(true);
      const res = await getBrandCampaignMatchesAction();
      if (res.success && Array.isArray(res.data)) {
        setBrandMatches(res.data);
      }
    } catch (e) {
      console.warn("Notice: could not load brand matches:", e);
    } finally {
      setLoadingBrandMatches(false);
    }
  };

  const handleHireCreator = async (matchId: string) => {
    setHiringMatchId(matchId);
    setBrandMatchNotice(null);
    try {
      const res = await hireCreatorAction({ match_id: matchId });
      if (res.success) {
        setBrandMatches((prev) =>
          prev.map((m) => (m.id === matchId ? { ...m, status: "hired" } : m))
        );
        setBrandMatchNotice(
          "Creator hired successfully! Collaboration status confirmed. Note: Payment processing is not available on this platform; payment and milestone terms must be agreed upon and settled separately between brand and creator."
        );
        setTimeout(() => setBrandMatchNotice(null), 6000);
      } else {
        alert(res.error || "Failed to hire creator.");
      }
    } catch (e: any) {
      alert(e?.message || "An error occurred while confirming collaboration.");
    } finally {
      setHiringMatchId(null);
    }
  };

  // Brand Settings state
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const handleSaveBrandSettings = async () => {
    setSettingsError(null);
    setSettingsSuccess(null);
    const trimmed = brandName.trim();
    if (trimmed.length < 2) {
      setSettingsError("Brand / Company name must be at least 2 characters.");
      return;
    }

    setIsSavingSettings(true);
    try {
      const res = await updateUserProfile({ companyName: trimmed });
      if (res.error || !res.user) {
        setSettingsError(res.error || "Failed to update brand profile on server.");
        return;
      }
      setCurrentUser(res.user);
      setSettingsSuccess("Brand settings saved successfully to database!");
      setTimeout(() => setSettingsSuccess(null), 4000);
    } catch (e: any) {
      setSettingsError(e?.message || "An unexpected network error occurred while saving settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user?.companyName) {
      setBrandName(user.companyName);
    }
    // Fetch database-backed creator profiles (with fallback to demo showcase)
    fetch("/api/v1/creators?demo=true")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCreatorsCatalog(json.data);
        } else {
          setCreatorsCatalog(getStoredCreators());
        }
      })
      .catch(() => {
        setCreatorsCatalog(getStoredCreators());
      });

    const handleCatalogUpdate = () => {
      fetch("/api/v1/creators?demo=true")
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setCreatorsCatalog(json.data);
          }
        })
        .catch(() => {});
    };

    window.addEventListener("creators-store-updated", handleCatalogUpdate);

    // Retrieve previous verification audits from database
    getCampaignVerificationsAction()
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const latest = res.data[0];
          if (latest.verifications_data) {
            setVerificationOutput(latest.verifications_data);
            setHasVerified(true);
          }
        }
      })
      .catch((e) => console.warn("Notice: could not load previous verifications:", e));

    // Fetch persisted campaigns from database
    fetch("/api/v1/campaigns?status=all")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.data) && json.data.length > 0) {
          setDbCampaigns(json.data);
        }
      })
      .catch((e) => console.warn("Notice: could not load campaigns from DB:", e));

    // Fetch sent invitations & matches from database
    fetchBrandMatches();

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

      // Persist verification audit to database
      saveCampaignVerificationAction({
        brandName: brandName.trim(),
        productName: campaignProduct.trim(),
        category: campaignCategory,
        platform,
        targetAudience,
        budget,
        deadline: duration,
        verificationsCount: json.data?.verifications?.length || 0,
        verificationsData: json.data,
      }).catch((e) => console.warn("Verification audit save notice:", e));
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

  // Rank creators dynamically based on form inputs (for comparison and fallback)
  const rankedCreators = useMemo(() => {
    const creatorsToRank = creatorsCatalog.length > 0 ? creatorsCatalog : getStoredCreators();
    let ranked = rankCreatorsForCampaign(creatorsToRank, currentCampaignConfig);

    if (activeTab === "Shortlist") {
      ranked = ranked.filter((item) => shortlistedIds.includes(item.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      ranked = ranked.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.professionalTitle.toLowerCase().includes(q) ||
          item.skills.some((s: string) => s.toLowerCase().includes(q))
      );
    }

    return ranked;
  }, [currentCampaignConfig, activeTab, shortlistedIds, searchQuery, creatorsCatalog]);

  // Filtered list of verified creators based on status & search
  const displayedVerifiedCreators = useMemo(() => {
    if (!verificationOutput) return [];
    let list = verificationOutput.verifications;

    if (statusFilter !== "All") {
      list = list.filter((item) => item.verificationStatus === statusFilter);
    }

    if (activeTab === "Shortlist") {
      list = list.filter((item) => shortlistedIds.includes(item.creatorId));
    }

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

  const getPresetIcon = (cat: string) => {
    switch (cat) {
      case "Beauty & Skincare":
        return Sparkles;
      case "Technology":
        return Smartphone;
      case "Fashion":
        return Shirt;
      case "Fitness & Wellness":
        return Dumbbell;
      case "Food":
        return Utensils;
      case "Travel & Lifestyle":
        return Plane;
      case "Gaming":
        return Gamepad2;
      case "Education":
        return GraduationCap;
      case "Agriculture":
        return Wheat;
      default:
        return Flame;
    }
  };

  const navItems = [
    { name: "Dashboard" as const, icon: Home },
    { name: "Find Creators" as const, icon: Search, badge: "AI Match" },
    {
      name: "Shortlist" as const,
      icon: Bookmark,
      badge: shortlistedIds.length > 0 ? String(shortlistedIds.length) : undefined,
    },
    { name: "Content Studio" as const, icon: Lightbulb, badge: "AI Studio" },
    { name: "Campaigns" as const, icon: Megaphone, badge: "2" },
    { name: "Projects" as const, icon: FolderKanban },
    { name: "Settings" as const, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* ============================================================ */}
      {/* 1. SOPHISTICATED DARK NAVY / CHARCOAL SIDEBAR                */}
      {/* ============================================================ */}
      <aside className="w-64 bg-[#0B0F19] text-slate-300 border-r border-slate-800/80 hidden lg:flex flex-col justify-between shrink-0 sticky top-0 h-screen z-30 select-none">
        <div>
          {/* Top Brand Logo Area */}
          <div className="px-5 py-5 border-b border-slate-800/80 flex items-center justify-between">
            <Logo size="sm" href="/" theme="light" />
          </div>

          {/* Workspace Switcher Pill */}
          <div className="px-3.5 py-3 border-b border-slate-800/60">
            <div className="bg-slate-900/90 rounded-2xl p-2.5 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center shrink-0 shadow-xs text-xs">
                  {brandName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {brandName || "Brand Portal"}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Brand Workspace</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setActiveTab(item.name)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-800 text-slate-300 border border-slate-700/60"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Pinned Bottom User & Workspace Switcher */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          {/* Quick Creator Portal Switch */}
          <Link
            href="/creator/dashboard"
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-indigo-300 border border-slate-800 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>Switch to Creator View</span>
            </div>
            <span className="text-[10px] text-slate-500">Demo</span>
          </Link>

          {/* User Account Card */}
          <div className="bg-slate-900/60 rounded-2xl p-2.5 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full overflow-hidden relative ring-1 ring-slate-700 shrink-0">
                <Image
                  src={currentUser?.avatarUrl || "/images/brand-user.jpg"}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser?.name || "Aarav Mehta"}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {currentUser?.email || "aarav@glowup.com"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MOBILE SIDEBAR DRAWER OVERLAY                                */}
      {/* ============================================================ */}
      {mobileSidebarOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#0B0F19] text-slate-300 flex flex-col justify-between p-4 shadow-2xl z-10 animate-slideDown">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <Logo size="sm" href="/" theme="light" />
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-900 rounded-2xl p-2.5 border border-slate-800">
                <div className="text-xs font-bold text-white">{brandName}</div>
                <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">● Brand Workspace</div>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.name);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2">
              <Link
                href="/creator/dashboard"
                onClick={() => setMobileSidebarOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-indigo-300 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Switch to Creator View</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-slate-900"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. MAIN LIGHT WORKSPACE AREA                                 */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-20 backdrop-blur-md bg-white/90 border-b border-slate-200/80 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Title */}
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Brand Workspace
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                {activeTab}
              </h1>
            </div>
          </div>

          {/* Center Search Bar */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search creators by skill, category, or tools..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Launch AI Advisor */}
            <button
              type="button"
              onClick={() => setChatbotOpen(true)}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-xs hover:opacity-95 transition cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Advisor</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            {/* Notifications */}
            <button
              type="button"
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer select-none"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden relative ring-2 ring-indigo-500/20">
                  <Image
                    src={currentUser?.avatarUrl || "/images/brand-user.jpg"}
                    alt="Brand Profile"
                    fill
                    className="object-cover"
                  />
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900">{brandName}</div>
                    <div className="text-[10px] text-slate-500">{currentUser?.email}</div>
                  </div>
                  <Link
                    href="/creator/dashboard"
                    className="px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"
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

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* ============================================================ */}
          {/* TAB 1: DASHBOARD OVERVIEW                                    */}
          {/* ============================================================ */}
          {activeTab === "Dashboard" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Hero Banner */}
              <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl overflow-hidden">
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30">
                      Enterprise Brand Portal
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
                      Welcome, {currentUser?.name || "Marketing Team"}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                      Discover verified AI creators, verify authenticity with multi-factor algorithms, and plan high-ROI vertical video campaigns for <strong className="text-white">{brandName}</strong>.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("Find Creators")}
                      className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs shadow-md shadow-indigo-500/30 hover:opacity-95 transition cursor-pointer flex items-center gap-2"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Find Creators</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("Content Studio")}
                      className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition cursor-pointer flex items-center gap-2"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                      <span>AI Content Studio</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Premium Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs card-hover">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold">Active Campaigns</span>
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <Megaphone className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">2 Active</div>
                  <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3" />
                    <span>+1 launched this month</span>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs card-hover">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold">Shortlisted Creators</span>
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <Bookmark className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-purple-700 mt-2">
                    {shortlistedIds.length} Saved
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-2">
                    <span>Ready for proposal outreach</span>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs card-hover">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold">Top AI Match Score</span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 mt-2">
                    {topMatch?.match.totalScore || 94}%
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-2">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Multi-factor benchmark verified</span>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs card-hover">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold">Active Collaborations</span>
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <FolderKanban className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">
                    {brandMatches.filter((m) => m.status === "hired").length}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-2">
                    <span>Direct project agreements</span>
                  </div>
                </div>
              </div>

              {/* Active Campaigns Showcase in Dashboard */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Current Campaign Briefs</h3>
                    <p className="text-xs text-slate-500">Campaigns recruiting AI creators</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("Campaigns")}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View All →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Recruiting Creators
                        </span>
                        <span className="text-xs font-bold text-slate-800">₹ 25k - ₹ 35k</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-2">
                        Hydra-Glow Daily Moisturizer Launch
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        3x Instagram Reels · Skincare Category
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Deadline: 2 Weeks</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPresetId("camp-skincare");
                          setActiveTab("Find Creators");
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        View Matches (6) →
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          In Review
                        </span>
                        <span className="text-xs font-bold text-slate-800">₹ 35,000</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-2">
                        Next-Gen AI Mechanical Keyboard
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        1 YouTube Review + 2 Shorts · Tech Category
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Deadline: 3 Weeks</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPresetId("camp-tech");
                          setActiveTab("Find Creators");
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        View Matches (6) →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: FIND CREATORS (The Core Marketplace Workspace)         */}
          {/* ============================================================ */}
          {activeTab === "Find Creators" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fadeIn">
              {/* Column 1: Campaign Brief Builder (5 cols on xl) */}
              <div className="xl:col-span-5 space-y-4">
                {/* 1-Click Campaign Presets Bar */}
                <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>1-Click Campaign Presets</span>
                    </div>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-bold border border-indigo-200/60">
                      Live AI Match
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Select a preset to test real-time creator matching across industries:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CAMPAIGN_PRESETS.map((p) => {
                      const isSelected = selectedPresetId === p.id;
                      const Icon = getPresetIcon(p.category);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPreset(p)}
                          className={`text-left p-2.5 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-50/80 text-indigo-900 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                              : "bg-slate-50/70 text-slate-700 border-slate-200/70 hover:bg-slate-100 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold truncate">
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-indigo-600" : "text-slate-500"}`} />
                            <span className="truncate">{p.category.split("&")[0].trim()}</span>
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
                <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                        <FolderKanban className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900">
                        Campaign Objectives & Brief
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {/* Brand & Product Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Brand Name</span>
                          <span className="text-[10px] text-indigo-600 font-semibold">Required</span>
                        </label>
                        <input
                          type="text"
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          placeholder="e.g. GlowUp Skincare, Nike..."
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                          <span>Product Name</span>
                          <span className="text-[10px] text-indigo-600 font-semibold">Required</span>
                        </label>
                        <input
                          type="text"
                          value={campaignProduct}
                          onChange={(e) => setCampaignProduct(e.target.value)}
                          placeholder="e.g. Hydra-Glow Serum 2.0"
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Target Industry & Platform */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Target Industry
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
                            <option value="Beauty & Skincare">Beauty & Skincare (5 profiles)</option>
                            <option value="Fashion">Fashion (5 profiles)</option>
                            <option value="Technology">Technology (5 profiles)</option>
                            <option value="Fitness & Wellness">Fitness & Wellness (5 profiles)</option>
                            <option value="Food">Food (5 profiles)</option>
                            <option value="Travel & Lifestyle">Travel & Lifestyle (5 profiles)</option>
                          </optgroup>
                          <optgroup label="Featured Additional Industries">
                            <option value="Gaming">Gaming (5 profiles)</option>
                            <option value="Education">Education (5 profiles)</option>
                            <option value="Agriculture">Agriculture (5 profiles)</option>
                          </optgroup>
                          <optgroup label="Custom / New Industries">
                            <option value="Others">Others (Type Custom Industry)</option>
                          </optgroup>
                        </select>

                        {isCustomCategory && (
                          <div className="mt-2 p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5">
                            <input
                              type="text"
                              value={campaignCategory}
                              onChange={(e) => {
                                setCustomCategoryInput(e.target.value);
                                setCampaignCategory(e.target.value);
                                setHasVerified(false);
                                setVerificationOutput(null);
                              }}
                              placeholder="e.g. Web3, Real Estate..."
                              className="w-full p-2 rounded-lg border border-purple-200 bg-white text-xs text-slate-900"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Platform
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

                    {/* Content Formats */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Content Formats Required
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {["Reels", "Product Review", "Lifestyle Content", "YouTube Breakdowns", "UGC"].map(
                          (tag) => {
                            const isSelected = contentTypes.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleContentType(tag)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                                  isSelected
                                    ? "bg-indigo-600 text-white font-bold shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Budget Bracket
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
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                      <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
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

                    {/* Prominent "Verify with AI" Action Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleVerifyWithAI}
                        disabled={isVerifying}
                        className="w-full py-3.5 px-4 rounded-2xl text-white text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
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
                      <p className="text-[11px] text-slate-400 text-center mt-2">
                        Multi-factor audit: Authenticity (25%), Brand Relevance (30%), Niche (25%), Engagement (10%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Creator Cards & Verification Results (7 cols on xl) */}
              <div className="xl:col-span-7 space-y-4">
                {/* STATE 1: AI Verification in Progress */}
                {isVerifying && (
                  <div className="bg-white rounded-3xl p-8 sm:p-10 text-center border border-indigo-100 shadow-md space-y-5 animate-pulse">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/30">
                      <Sparkles className="w-8 h-8 animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        AI is auditing marketplace creators...
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
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full transition-all duration-300"
                          style={{ width: `${verificationProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STATE 2: Empty State Before Verification */}
                {!hasVerified && !isVerifying && (
                  <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/90 shadow-xs space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-inner">
                      <ShieldCheck className="w-10 h-10 text-indigo-600" />
                    </div>

                    <div className="max-w-md mx-auto">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        AI Profile Verification Required
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                        To ensure high campaign conversion, creator profiles are revealed after an evidence-based multi-factor audit against your specific product requirements.
                      </p>
                    </div>

                    {/* Campaign Readiness Card */}
                    <div className="max-w-md mx-auto bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2 text-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Campaign Target:
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Brand & Product:</span>
                        <span className="font-bold text-slate-900">{brandName} &bull; {campaignProduct}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Industry & Platform:</span>
                        <span className="font-bold text-indigo-600">{campaignCategory} &bull; {platform}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Target Budget:</span>
                        <span className="font-semibold text-slate-800">{budget}</span>
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={handleVerifyWithAI}
                        className="py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/25 hover:opacity-95 transition cursor-pointer inline-flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        <span>Verify with AI Now</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STATE 3: Verification Complete - Display Creator Profiles & Scores */}
                {hasVerified && verificationOutput && (
                  <div className="space-y-4">
                    {/* Header Summary Card */}
                    <div className="bg-gradient-to-r from-indigo-50/90 via-blue-50/90 to-purple-50/90 rounded-3xl p-5 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-indigo-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900">
                              AI Verification Complete
                            </h3>
                            <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                              {verificationOutput.provider}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Verified for &quot;{verificationOutput.campaignSummary.brandName}&quot; &bull; &quot;{verificationOutput.campaignSummary.productName}&quot;
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleVerifyWithAI}
                        disabled={isVerifying}
                        className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
                        <span>Re-Verify</span>
                      </button>
                    </div>

                    {/* Status Filter Tabs */}
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
                                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                : pill.color || "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span>{pill.label}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                isSelected ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700"
                              }`}
                            >
                              {pill.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Verified Creators Cards Grid */}
                    <div className="space-y-4">
                      {displayedVerifiedCreators.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                            <Bookmark className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">
                            No creators match current filter ({statusFilter})
                          </h4>
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
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: SHORTLIST                                             */}
          {/* ============================================================ */}
          {activeTab === "Shortlist" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Your Creator Shortlist</h2>
                  <p className="text-xs text-slate-500">
                    Saved candidates ready for collaboration invitations and project briefs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("Find Creators")}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition"
                >
                  + Add More Creators
                </button>
              </div>

              {shortlistedIds.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
                  <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">No creators shortlisted yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Click the bookmark icon on any creator card to save them to your shortlist.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("Find Creators")}
                    className="py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                  >
                    Explore Creators
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {rankedCreators
                    .filter((r) => shortlistedIds.includes(r.id))
                    .map((item) => (
                      <CreatorCard
                        key={item.id}
                        creator={item}
                        match={item.match}
                        isShortlisted={true}
                        onToggleShortlist={handleToggleShortlist}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: CONTENT STUDIO (AI Generation)                         */}
          {/* ============================================================ */}
          {activeTab === "Content Studio" && (
            <div className="animate-fadeIn">
              <AIContentSuggestions
                initialNiche={campaignCategory}
                initialPlatform={platform}
              />
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: CAMPAIGNS                                             */}
          {/* ============================================================ */}
          {activeTab === "Campaigns" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Active Brand Campaigns
                  </h2>
                  <p className="text-xs text-slate-500">
                    Track deliverables, milestone statuses, and creator contracts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCampErrors({});
                    setNewCampaignModalOpen(true);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
                >
                  + New Campaign
                </button>
              </div>

              {campNotice && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold">
                  {campNotice}
                </div>
              )}

              {/* Campaigns Grid */}
              <div className="space-y-4">
                {/* Database Persisted Campaigns */}
                {dbCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-hover"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                          {camp.status || "active"}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Supabase Live
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1.5">
                        {camp.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {camp.description} &bull; Budget: ₹ {Number(camp.budget_min || 0).toLocaleString()} - ₹ {Number(camp.budget_max || 0).toLocaleString()} &bull; Category: {camp.category}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPresetId("camp-skincare");
                        setActiveTab("Find Creators");
                      }}
                      className="py-2 px-4 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 shadow-2xs cursor-pointer"
                    >
                      Find Matches
                    </button>
                  </div>
                ))}

                {/* Preset Campaigns */}
                <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-hover">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Recruiting Creators
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1.5">
                      Hydra-Glow Daily Moisturizer Launch
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Deliverable: 3x Instagram Reels · Budget: ₹ 25,000 - ₹ 35,000 · Category: Beauty & Skincare
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPresetId("camp-skincare");
                      setActiveTab("Find Creators");
                    }}
                    className="py-2 px-4 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 shadow-2xs cursor-pointer"
                  >
                    View Matches (6)
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-hover">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      In Review
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1.5">
                      Next-Gen AI Mechanical Keyboard Showcase
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Deliverable: 1 YouTube Review + 2 Shorts · Budget: ₹ 35,000 · Category: Technology
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPresetId("camp-tech");
                      setActiveTab("Find Creators");
                    }}
                    className="py-2 px-4 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 shadow-2xs cursor-pointer"
                  >
                    View Matches (6)
                  </button>
                </div>
              </div>

              {/* ============================================================ */}
              {/* ACTIVE INVITATIONS & PROPOSALS SECTION                      */}
              {/* ============================================================ */}
              <div className="pt-8 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>Active Invitations & Proposals</span>
                      {brandMatches.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {brandMatches.length}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Real-time status of brand collaboration invites sent to creators
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchBrandMatches}
                    disabled={loadingBrandMatches}
                    className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                    title="Refresh invitations"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingBrandMatches ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {brandMatchNotice && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{brandMatchNotice}</span>
                  </div>
                )}

                {loadingBrandMatches && brandMatches.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/60">
                    Loading sent invitations...
                  </div>
                ) : brandMatches.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {brandMatches.map((match) => (
                      <div
                        key={match.id}
                        className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                              {match.creator_profiles?.name?.charAt(0) || "C"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {match.creator_profiles?.name || "Creator"}
                                </span>
                                {match.creator_profiles?.is_verified && (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-bold flex items-center gap-0.5">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                    Verified
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                Campaign: <strong className="text-slate-700">{match.campaigns?.title || "Collaboration Campaign"}</strong> &bull; Category: {match.campaigns?.category || match.creator_profiles?.category}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                                match.status === "accepted"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : match.status === "invited"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : match.status === "hired"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {match.status === "invited"
                                ? "Pending Creator Response"
                                : match.status === "accepted"
                                ? "Invitation Accepted"
                                : match.status === "hired"
                                ? "Creator Hired (In Progress)"
                                : `Status: ${match.status}`}
                            </span>
                          </div>
                        </div>

                        {match.proposal_notes && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                            <span className="font-semibold text-slate-700 block mb-0.5">Proposal Brief & Terms:</span>
                            <span className="text-slate-600 italic">{match.proposal_notes}</span>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
                          <div className="text-slate-500 text-[11px]">
                            Sent on {new Date(match.created_at).toLocaleDateString()} &bull; Match Score: <strong className="text-indigo-600 font-bold">{match.match_score}%</strong>
                          </div>

                          {match.status === "accepted" && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-emerald-600 font-medium hidden sm:inline">
                                Creator accepted proposal! Ready to hire:
                              </span>
                              <button
                                type="button"
                                disabled={hiringMatchId === match.id}
                                onClick={() => handleHireCreator(match.id)}
                                className="py-2 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{hiringMatchId === match.id ? "Confirming Collaboration..." : "Hire Creator & Start Project"}</span>
                              </button>
                            </div>
                          )}

                          {match.status === "invited" && (
                            <span className="text-[11px] text-purple-600 font-medium">
                              Waiting for creator to review proposal on their dashboard.
                            </span>
                          )}

                          {match.status === "hired" && (
                            <span className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                              Active project collaboration &bull; Payment processing is not yet available on this platform; payment and milestone terms must be agreed separately.
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
                    <p className="font-semibold text-slate-700">No active invitations yet</p>
                    <p className="mt-1 text-slate-400">
                      Explore the &quot;Find Creators&quot; tab or select a creator profile to send targeted collaboration briefs.
                    </p>
                  </div>
                )}
              </div>

              {/* Create Campaign Modal */}
              {newCampaignModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h3 className="text-base font-bold text-slate-900">Create New Campaign</h3>
                      <button
                        type="button"
                        onClick={() => setNewCampaignModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const errors: { title?: string; desc?: string; budget?: string; general?: string } = {};
                        const trimmedTitle = newCampTitle.trim();
                        const trimmedDesc = newCampDesc.trim();
                        const bMin = Number(newCampBudgetMin);
                        const bMax = Number(newCampBudgetMax);

                        if (!trimmedTitle || trimmedTitle.length < 5 || trimmedTitle.length > 200) {
                          errors.title = "Title must be between 5 and 200 characters";
                        }

                        if (!trimmedDesc || trimmedDesc.length < 20 || trimmedDesc.length > 4000) {
                          errors.desc = "Description must be between 20 and 4000 characters";
                        }

                        if (isNaN(bMin) || bMin < 0) {
                          errors.budget = "Minimum budget must be at least 0";
                        } else if (isNaN(bMax) || bMax < 0) {
                          errors.budget = "Maximum budget must be at least 0";
                        } else if (bMax < bMin) {
                          errors.budget = "Maximum budget cannot be less than minimum budget";
                        }

                        if (Object.keys(errors).length > 0) {
                          setCampErrors(errors);
                          return;
                        }

                        setCampErrors({});
                        setIsCreatingCampaign(true);
                        try {
                          const res = await fetch("/api/v1/campaigns", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              title: trimmedTitle,
                              description: trimmedDesc,
                              category: newCampCategory,
                              required_skills: [],
                              content_formats: ["Instagram Reels", "UGC"],
                              budget_min: bMin,
                              budget_max: bMax,
                              status: "active",
                            }),
                          });
                          const json = await res.json();
                          if (res.ok && json.data) {
                            setDbCampaigns((prev) => [json.data, ...prev]);
                            setNewCampaignModalOpen(false);
                            setNewCampTitle("");
                            setNewCampDesc("");
                            setCampErrors({});
                            setCampNotice("Campaign successfully saved to Supabase!");
                            setTimeout(() => setCampNotice(null), 4000);
                          } else {
                            setCampErrors({
                              general: json.error || "Failed to create campaign in database",
                            });
                          }
                        } catch (err: any) {
                          setCampErrors({
                            general: err?.message || "Network error. Please try again.",
                          });
                        } finally {
                          setIsCreatingCampaign(false);
                        }
                      }}
                      className="space-y-3 text-xs"
                    >
                      {campErrors.general && (
                        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                          <span>{campErrors.general}</span>
                        </div>
                      )}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Campaign Title (5–200 characters)</label>
                        <input
                          type="text"
                          required
                          minLength={5}
                          maxLength={200}
                          value={newCampTitle}
                          onChange={(e) => {
                            setNewCampTitle(e.target.value);
                            if (campErrors.title) setCampErrors((prev) => ({ ...prev, title: undefined }));
                          }}
                          placeholder="e.g. Summer Glow Skincare UGC Reel"
                          className={`w-full px-3 py-2 rounded-xl border ${
                            campErrors.title ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-indigo-500"
                          } focus:outline-none`}
                        />
                        {campErrors.title && <p className="text-red-500 text-[11px] mt-1 font-medium">{campErrors.title}</p>}
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Description & Deliverables (20–4000 characters)</label>
                        <textarea
                          rows={3}
                          required
                          minLength={20}
                          maxLength={4000}
                          value={newCampDesc}
                          onChange={(e) => {
                            setNewCampDesc(e.target.value);
                            if (campErrors.desc) setCampErrors((prev) => ({ ...prev, desc: undefined }));
                          }}
                          placeholder="Describe deliverables, creative brief, and expectations (minimum 20 characters)..."
                          className={`w-full px-3 py-2 rounded-xl border ${
                            campErrors.desc ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-indigo-500"
                          } focus:outline-none`}
                        />
                        {campErrors.desc && <p className="text-red-500 text-[11px] mt-1 font-medium">{campErrors.desc}</p>}
                      </div>
                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Industry</label>
                          <select
                            value={newCampCategory}
                            onChange={(e) => setNewCampCategory(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                          >
                            <option>Beauty & Skincare</option>
                            <option>Technology</option>
                            <option>Fashion</option>
                            <option>Fitness & Wellness</option>
                            <option>Food</option>
                            <option>Travel & Lifestyle</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Min Budget (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={newCampBudgetMin}
                            onChange={(e) => {
                              setNewCampBudgetMin(e.target.value);
                              if (campErrors.budget) setCampErrors((prev) => ({ ...prev, budget: undefined }));
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Max Budget (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={newCampBudgetMax}
                            onChange={(e) => {
                              setNewCampBudgetMax(e.target.value);
                              if (campErrors.budget) setCampErrors((prev) => ({ ...prev, budget: undefined }));
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          />
                        </div>
                      </div>
                      {campErrors.budget && <p className="text-red-500 text-[11px] mt-1 font-medium">{campErrors.budget}</p>}

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCampErrors({});
                            setNewCampaignModalOpen(false);
                          }}
                          className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatingCampaign}
                          className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                        >
                          {isCreatingCampaign ? "Saving to Supabase..." : "Create Campaign"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 6: PROJECTS                                              */}
          {/* ============================================================ */}
          {activeTab === "Projects" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 space-y-6 animate-fadeIn">
              <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Active Collaborations & Project Tracking
                  </h2>
                  <p className="text-xs text-slate-500">
                    Track deliverable progress and direct creator agreements
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Payment processing is not yet available on this platform</span>
                </div>
              </div>

              {/* Informational Notice Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Notice regarding project payments:</span>
                <p>
                  Payment processing, automated escrow, and digital wallet features are not currently operational on this platform. Payment and milestone terms must be agreed upon and settled separately between brand and creator via direct off-platform arrangements.
                </p>
              </div>

              {/* Dynamic Hired Collaborations */}
              {brandMatches.filter((m) => m.status === "hired").length > 0 ? (
                <div className="space-y-4">
                  {brandMatches
                    .filter((m) => m.status === "hired")
                    .map((match) => (
                      <div
                        key={match.id}
                        className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              Collaboration: {match.creator_profiles?.name || "Creator"}
                            </span>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                              In Progress
                            </span>
                          </div>
                          <p className="text-slate-500">
                            Campaign: <strong className="text-slate-700">{match.campaigns?.title || "Campaign"}</strong> &bull; Category: {match.campaigns?.category || match.creator_profiles?.category}
                          </p>
                          {match.proposal_notes && (
                            <p className="text-slate-600 italic pt-1 border-t border-slate-100">
                              Agreed Brief: {match.proposal_notes}
                            </p>
                          )}
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-xs font-bold text-slate-700 block">
                            Direct Agreement
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Deliverables in progress
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-10 rounded-2xl bg-slate-50/60 border border-dashed border-slate-200 text-center space-y-2">
                  <FolderKanban className="w-8 h-8 text-slate-300 mx-auto" />
                  <h3 className="text-xs font-bold text-slate-700">No active collaborations in progress</h3>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    When you accept proposals and hire creators from your Campaigns dashboard, active deliverables and contract details will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 7: SETTINGS                                              */}
          {/* ============================================================ */}
          {activeTab === "Settings" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 space-y-6 animate-fadeIn">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Brand Workspace Settings</h2>
                <p className="text-xs text-slate-500">Manage brand entity credentials and notification preferences</p>
              </div>
              <div className="space-y-4 max-w-md text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Brand Name</label>
                  <input
                    type="text"
                    defaultValue={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand Email</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.email || "brand@company.com"}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-xs"
                  />
                </div>
                {settingsError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{settingsError}</span>
                  </div>
                )}
                {settingsSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{settingsSuccess}</span>
                  </div>
                )}
                <button
                  type="button"
                  disabled={isSavingSettings}
                  onClick={handleSaveBrandSettings}
                  className="py-2.5 px-5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {isSavingSettings ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Settings...</span>
                    </>
                  ) : (
                    <span>Save Settings</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================ */}
      {/* 3. FLOATING AI ASSISTANT BUTTON                              */}
      {/* ============================================================ */}
      <button
        type="button"
        onClick={() => setChatbotOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-3.5 sm:p-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer"
        aria-label="Open AI Assistant"
      >
        <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
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
