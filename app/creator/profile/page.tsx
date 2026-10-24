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
import { CREATORS_DATA, Creator } from "@/lib/creators-data";
import {
  getStoredCreators,
  getCreatorById,
  updateCreator,
  upsertCreator,
  addCreatorSkill,
  removeCreatorSkill,
  addCreatorAiTool,
  removeCreatorAiTool,
} from "@/lib/creators-store";
import {
  getStoredSkillPassport,
  SkillPassportItem,
  addSkillToPassport,
} from "@/lib/skill-passport-store";
import { getCurrentUser, updateUserProfile, fetchUserProfile } from "@/lib/auth";
import { AIProfileAssistantModal } from "@/components/creator/AIProfileAssistantModal";
import {
  User,
  Sparkles,
  MapPin,
  DollarSign,
  Clock,
  Award,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Plus,
  Trash2,
  Save,
  Wand2,
  Cpu,
  Layers,
  ShieldCheck,
  Check,
  AlertCircle,
  Share2,
  Loader2,
  FileCheck,
} from "lucide-react";

function mapDbAvailabilityToUi(
  dbAvailability?: string | null
): "Available for immediate hire" | "Available in 1 week" | "Booked this month" {
  if (dbAvailability === "busy") return "Available in 1 week";
  if (dbAvailability === "unavailable") return "Booked this month";
  return "Available for immediate hire";
}

function mapUiAvailabilityToDb(
  uiAvailability?: string
): "available" | "busy" | "unavailable" {
  if (uiAvailability === "Available in 1 week") return "busy";
  if (uiAvailability === "Booked this month") return "unavailable";
  return "available";
}

export default function CreatorProfilePage() {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [passportItems, setPassportItems] = useState<SkillPassportItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form edit states
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [availability, setAvailability] = useState<
    "Available for immediate hire" | "Available in 1 week" | "Booked this month"
  >("Available for immediate hire");
  const [priceRange, setPriceRange] = useState("");
  const [location, setLocation] = useState("");

  // Skill & Tool input states
  const [newSkillInput, setNewSkillInput] = useState("");
  const [newToolInput, setNewToolInput] = useState("");
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [skillAddError, setSkillAddError] = useState<string | null>(null);
  const [skillAddSuccess, setSkillAddSuccess] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; bio?: string }>({});

  // AI Audit State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<{
    overallReadinessScore?: number;
    strengths?: string[];
    potentialImprovementAreas?: string[];
    relevantSkills?: string[];
    recommendedCampaignTypes?: string[];
    engine?: "ai_model" | "heuristic_fallback";
    provider?: string;
    isFallback?: boolean;
    fallbackReason?: string;
  } | null>(null);

  // AI Profile Assistant Modal State
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  const handleApplyAiDraft = async (draft: {
    name: string;
    headline: string;
    bio: string;
    category: string;
    skills: string[];
    aiTools: string[];
  }) => {
    setName(draft.name);
    setBio(draft.bio);

    const res = await updateUserProfile({
      name: draft.name,
      bio: draft.bio,
      category: draft.category,
      aiTools: draft.aiTools,
      location: location.trim(),
      availability: mapUiAvailabilityToDb(availability),
      experience,
      priceRange,
    });

    if (res.error || !res.user) {
      throw new Error(res.error || "Failed to update profile.");
    }

    if (creator) {
      draft.aiTools.forEach((tool) => {
        addCreatorAiTool(creator.id, tool);
      });
    }

    setSaveSuccess(true);
    await loadProfile();
  };


  const loadProfile = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // 1. Fetch authoritative authenticated profile from server
      const { user, profile, error } = await fetchUserProfile();

      if (error || !user) {
        // Do not silently fall back to mock data when unauthenticated
        setLoadError(
          error || "Authentication required. Please log in to your creator account to view your profile."
        );
        setIsLoading(false);
        return;
      }

      // 2. Build live creator model backed by authenticated database records
      const creatorId = user.id;
      const creatorName = profile?.name || user.name || "AI Creator";
      const creatorBio = profile?.bio ?? user.bio ?? "";
      const creatorLocation = profile?.location ?? user.location ?? "";
      const creatorExperience =
        profile?.experience ||
        (profile?.experienceYears
          ? `${profile.experienceYears} Years in GenAI Content Creation & Visual Storytelling`
          : "GenAI Content Creator & Visual Storyteller");
      const creatorAvailability = mapDbAvailabilityToUi(profile?.availability);
      const creatorPriceRange =
        profile?.priceRange ||
        (profile?.hourlyRate ? `₹${profile.hourlyRate}/hr` : "₹3,500 - ₹6,000/hr");
      const creatorTools =
        Array.isArray(profile?.aiTools) && profile.aiTools.length > 0
          ? profile.aiTools
          : ["Midjourney v6", "Runway Gen-3"];

      const liveCreator: Creator = {
        id: creatorId,
        name: creatorName,
        professionalTitle: `AI ${profile?.category || "Creative"} Specialist`,
        category: profile?.category || "General AI",
        avatar: user.avatarUrl || "/images/anjali.jpg",
        followers: "Verified Creator",
        followersCount: 0,
        engagementRate: "Active",
        engagementNum: 0,
        location: creatorLocation || "Remote",
        experience: creatorExperience,
        clientRating: profile?.clientRating || 5.0,
        reviewsCount: profile?.totalReviews || 0,
        reviews: [],
        isVerified: profile?.isVerified || false,
        priceRange: creatorPriceRange,
        bio: creatorBio,
        aiTools: creatorTools,
        previousBrandCollabs: [],
        contentTypes: ["AI Commercial Reel & UGC"],
        platforms: profile?.platforms || ["Instagram Reels", "YouTube Shorts"],
        baseMatchScore: 85,
        availability: creatorAvailability,
        portfolioCount: 0,
        skills: [],
        verifiedSkills: [],
        portfolio: [],
      };

      upsertCreator(liveCreator);
      setCreator(liveCreator);
      setName(creatorName);
      setBio(creatorBio);
      setExperience(creatorExperience);
      setAvailability(creatorAvailability);
      setPriceRange(creatorPriceRange);
      setLocation(creatorLocation);
      setPassportItems(getStoredSkillPassport(creatorId));
    } catch (err: any) {
      setLoadError(err?.message || "An unexpected error occurred while loading your profile.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();

    const handleUpdate = () => {
      const user = getCurrentUser();
      if (user) {
        const refreshed = getStoredCreators();
        const current = getCreatorById(user.id);
        if (current) {
          setCreator(current);
          setPassportItems(getStoredSkillPassport(current.id));
        }
      }
    };

    window.addEventListener("creators-store-updated", handleUpdate);
    window.addEventListener("skill-passport-updated", handleUpdate);
    return () => {
      window.removeEventListener("creators-store-updated", handleUpdate);
      window.removeEventListener("skill-passport-updated", handleUpdate);
    };
  }, []);

  const handleSaveProfile = async () => {
    if (!creator) return;
    const trimmedName = name.trim();
    const trimmedBio = bio.trim();
    const errors: { name?: string; bio?: string } = {};

    if (trimmedName.length < 2) {
      errors.name = "Full name must be at least 2 characters.";
    } else if (trimmedName.length > 100) {
      errors.name = "Full name cannot exceed 100 characters.";
    }

    if (trimmedBio.length > 1000) {
      errors.bio = "Bio cannot exceed 1000 characters.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    setSaveError(null);

    try {
      // 1. Persist to Supabase backend and await confirmation
      const res = await updateUserProfile({
        name: trimmedName,
        bio: trimmedBio,
        location: location.trim(),
        availability: mapUiAvailabilityToDb(availability),
        experience,
        priceRange,
      });

      if (res.error || !res.user) {
        setSaveError(res.error || "Failed to update profile on server.");
        setSaveSuccess(false);
        return;
      }

      // 2. Only update local state and display success when server confirms update
      const updated = updateCreator(creator.id, {
        name: trimmedName,
        bio: trimmedBio,
        experience,
        availability,
        priceRange,
        location: location.trim(),
      });
      if (updated) {
        setCreator(updated);
      }
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e: any) {
      setSaveError(e?.message || "An unexpected network error occurred while updating profile.");
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creator || isAddingSkill) return;
    const skillName = newSkillInput.trim();
    if (!skillName || skillName.length < 2) {
      setSkillAddError("Skill name must be at least 2 characters.");
      return;
    }

    setIsAddingSkill(true);
    setSkillAddError(null);
    setSkillAddSuccess(null);

    try {
      const res = await fetch("/api/v1/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill_name: skillName,
          category: "AI Creative Discipline",
          status: "claimed",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        let msg = json.error || `Server rejected skill (HTTP ${res.status}).`;
        if (res.status === 401) {
          msg = "Authentication required. Please log in to add skills.";
        }
        setSkillAddError(msg);
        return;
      }

      // Only commit local stores when server confirms success
      addCreatorSkill(creator.id, skillName);
      addSkillToPassport(creator.id, skillName, "AI Creative Discipline");

      // Update creator skills in active page state
      setCreator((prev) =>
        prev
          ? {
              ...prev,
              skills: prev.skills?.includes(skillName) ? prev.skills : [...(prev.skills || []), skillName],
            }
          : prev
      );

      setNewSkillInput("");
      setSkillAddSuccess(`Skill "${skillName}" added successfully.`);
      setTimeout(() => setSkillAddSuccess(null), 3000);
    } catch (e: any) {
      setSkillAddError(e?.message || "Network error while adding skill. Please retry.");
    } finally {
      setIsAddingSkill(false);
    }
  };

  const handleRemoveSkill = async (skill: string) => {
    if (!creator) return;
    try {
      const res = await fetch(`/api/v1/skills?skillId=${encodeURIComponent(skill)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error || "Failed to remove skill from server.");
        return;
      }
      removeCreatorSkill(creator.id, skill);
    } catch (e: any) {
      setSaveError(e?.message || "Network error while removing skill.");
    }
  };

  const handleAddTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creator) return;
    const toolName = newToolInput.trim();
    if (!toolName) return;
    const currentTools = creator.aiTools || [];
    if (currentTools.includes(toolName)) {
      setNewToolInput("");
      return;
    }
    const updatedTools = [...currentTools, toolName];
    try {
      const res = await updateUserProfile({ aiTools: updatedTools });
      if (res.error) {
        setSaveError(res.error);
        return;
      }
      addCreatorAiTool(creator.id, toolName);
      setNewToolInput("");
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save AI tool to server.");
    }
  };

  const handleRemoveTool = async (tool: string) => {
    if (!creator) return;
    const currentTools = creator.aiTools || [];
    const updatedTools = currentTools.filter((t) => t !== tool);
    try {
      const res = await updateUserProfile({ aiTools: updatedTools });
      if (res.error) {
        setSaveError(res.error);
        return;
      }
      removeCreatorAiTool(creator.id, tool);
    } catch (err: any) {
      setSaveError(err?.message || "Failed to remove AI tool from server.");
    }
  };

  const runAIAudit = async () => {
    if (!creator) return;
    setIsAuditing(true);
    setAuditError(null);
    try {
      const skills =
        creator.skills && creator.skills.length > 0
          ? creator.skills
          : creator.verifiedSkills || [];

      if (!skills || skills.length === 0) {
        setAuditResult(null);
        setAuditError("Please add at least one verified skill to your profile before running an AI audit.");
        return;
      }

      const res = await fetch("/api/ai/analyze-creator-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: creator.name,
          category: creator.category || "AI Content Creator",
          bio: creator.bio || "",
          skills: skills,
          portfolioCount: creator.portfolio?.length || 0,
          portfolioSamples: (creator.portfolio || []).slice(0, 3).map((p) => ({
            title: p.title,
            description: p.description || "",
            tools: p.toolsUsed || [],
            results: p.results,
          })),
          platforms: creator.platforms || ["Instagram"],
          contentTypes: creator.contentTypes || ["Reels", "UGC"],
          availability: creator.availability || "available",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        setAuditResult(null);
        setAuditError(json.error || `AI profile audit is currently unavailable (HTTP ${res.status}). Please try again later.`);
        return;
      }

      if (json.data) {
        const data = json.data;
        setAuditResult({
          overallReadinessScore: typeof data.overallReadinessScore === "number" ? data.overallReadinessScore : undefined,
          strengths: Array.isArray(data.strengths) ? data.strengths : [],
          potentialImprovementAreas: Array.isArray(data.potentialImprovementAreas) ? data.potentialImprovementAreas : [],
          relevantSkills: Array.isArray(data.relevantSkills) ? data.relevantSkills : [],
          recommendedCampaignTypes: Array.isArray(data.recommendedCampaignTypes) ? data.recommendedCampaignTypes : [],
          engine: data.engine,
          provider: data.provider,
          isFallback: !!data.isFallback,
          fallbackReason: data.fallbackReason,
        });
      } else {
        setAuditResult(null);
        setAuditError("No audit data received from the AI service. Please try again.");
      }
    } catch (err: any) {
      setAuditResult(null);
      setAuditError(err?.message || "Network error while connecting to AI profile audit service.");
    } finally {
      setIsAuditing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
        <CreatorNav />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading your creator profile...</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving verified data from server</p>
        </main>
      </div>
    );
  }

  if (loadError || !creator) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
        <CreatorNav />
        <main className="flex-1 max-w-md w-full mx-auto px-4 py-20 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Profile Unavailable</h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            {loadError || "Could not load creator profile. Please log in to your creator account."}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadProfile}>
              Retry Loading
            </Button>
            <Link href="/login/influencer">
              <Button variant="gradient" size="sm">
                Log In
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const currentAiTools = creator.aiTools || [
    "Midjourney v6",
    "Runway Gen-3",
    "Flux.1 Dev",
    "ElevenLabs",
    "Claude 3.5 Sonnet",
    "CapCut AI",
    "Topaz Video AI",
    "ComfyUI",
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <CreatorNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Creator Profile
              </h1>
              <Badge variant="purple" size="sm">
                Live Status: {creator.availability}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Manage your identity, experience, skills, and AI tool stack.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFieldErrors({});
                    setSaveError(null);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  data-testid="save-profile-btn"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                </Button>
              </>
            ) : (
              <>
                <Link href={`/creators/${creator.id}`} target="_blank">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="w-4 h-4 text-slate-500" />
                    <span>Public Preview</span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="ai-profile-assistant-btn"
                  onClick={() => setIsAiAssistantOpen(true)}
                  className="gap-1.5 text-violet-700 border-violet-200 bg-violet-50 hover:bg-violet-100 hover:text-violet-800"
                >
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  <span>AI Profile Assistant</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  data-testid="edit-profile-btn"
                  onClick={() => {
                    setFieldErrors({});
                    setSaveError(null);
                    setIsEditing(true);
                  }}
                  className="gap-1.5"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">
              Profile updated successfully! Changes have been saved.
            </span>
          </div>
        )}

        {saveError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-semibold">{saveError}</span>
          </div>
        )}

        {/* Profile Card Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 Cols): Details, Bio, Experience, Skills, Tools */}
          <div className="lg:col-span-2 space-y-6">
            {/* Identity & Bio Card */}
            <Card>
              <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>General Information</span>
                </CardTitle>
                <span className="text-xs text-slate-400 font-medium">
                  {isEditing ? "Editing Mode" : "View Mode"}
                </span>
              </CardHeader>

              <CardContent className="pt-6 space-y-5">
                {/* Avatar and Basic Header */}
                <div className="flex items-center gap-5">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-slate-200 shrink-0">
                    <Image
                      src={creator.avatar || "/images/anjali.jpg"}
                      alt={creator.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    {isEditing ? (
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Full Name (2–100 characters)
                        </label>
                        <input
                          type="text"
                          required
                          data-testid="profile-name-input"
                          minLength={2}
                          maxLength={100}
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                          }}
                          className={`w-full text-sm font-semibold px-3 py-2 rounded-xl border ${
                            fieldErrors.name ? "border-red-400 focus:outline-red-500" : "border-slate-300 focus:outline-blue-500"
                          }`}
                        />
                        {fieldErrors.name && (
                          <p className="text-red-500 text-xs mt-1 font-medium">{fieldErrors.name}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-slate-900">{creator.name}</h2>
                          <Badge variant="success" size="sm">
                            <Check className="w-3 h-3" />
                            Verified
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {creator.professionalTitle} · {creator.category}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio Field */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    Creator Bio (max 1000 characters)
                  </label>
                  {isEditing ? (
                    <div>
                      <textarea
                        rows={3}
                        maxLength={1000}
                        data-testid="profile-bio-input"
                        value={bio}
                        onChange={(e) => {
                          setBio(e.target.value);
                          if (fieldErrors.bio) setFieldErrors((prev) => ({ ...prev, bio: undefined }));
                        }}
                        className={`w-full text-sm p-3 rounded-xl border ${
                          fieldErrors.bio ? "border-red-400 focus:outline-red-500" : "border-slate-300 focus:outline-blue-500"
                        } text-slate-800`}
                        placeholder="Describe your creative style, experience, and value for brands (max 1000 characters)..."
                      />
                      <div className="flex justify-between items-center mt-1 text-[11px] text-slate-400">
                        {fieldErrors.bio ? (
                          <span className="text-red-500 font-medium">{fieldErrors.bio}</span>
                        ) : (
                          <span>Max 1000 characters</span>
                        )}
                        <span>{bio.length}/1000</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {creator.bio}
                    </p>
                  )}
                </div>

                {/* Experience Field */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    Professional Experience & Track Record
                  </label>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full text-sm p-3 rounded-xl border border-slate-300 focus:outline-blue-500 text-slate-800"
                      placeholder="Detail your years in GenAI, campaigns executed, and brand results..."
                    />
                  ) : (
                    <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                      <p className="leading-relaxed">
                        {creator.experience || experience}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60 text-xs text-slate-500">
                        <span>Brands Worked With:</span>
                        {(creator.previousBrandCollabs || []).map((b) => (
                          <span
                            key={b}
                            className="bg-white px-2 py-0.5 rounded-md font-semibold text-slate-700 border border-slate-200"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Availability Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    Availability Status
                  </label>
                  {isEditing ? (
                    <select
                      value={availability}
                      onChange={(e) =>
                        setAvailability(
                          e.target.value as
                            | "Available for immediate hire"
                            | "Available in 1 week"
                            | "Booked this month"
                        )
                      }
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-blue-500 bg-white"
                    >
                      <option value="Available for immediate hire">
                        Available for immediate hire
                      </option>
                      <option value="Available in 1 week">Available in 1 week</option>
                      <option value="Booked this month">Booked this month</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-800">
                        {creator.availability}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Tools Section */}
            <Card>
              <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-600" />
                    <span>AI Tools & Generation Stack</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    The software, models, and workflows you master to produce content.
                  </p>
                </div>
                <Badge variant="purple" size="sm">
                  {currentAiTools.length} Tools
                </Badge>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Tools Grid */}
                <div className="flex flex-wrap gap-2.5">
                  {currentAiTools.map((tool) => (
                    <span
                      key={tool}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200/80 text-xs font-semibold hover:bg-slate-200/70 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{tool}</span>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTool(tool)}
                          className="text-slate-400 hover:text-rose-600 transition p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                {/* Add Tool Form */}
                <form onSubmit={handleAddTool} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newToolInput}
                    onChange={(e) => setNewToolInput(e.target.value)}
                    placeholder="Add an AI tool (e.g. Sora, Kling AI, Topaz, FLUX.1)..."
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-indigo-500"
                  />
                  <Button type="submit" variant="secondary" size="sm" className="gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Tool</span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Skills & Verification Badges */}
            <Card>
              <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600" />
                    <span>Skills & Verification Statuses</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Skills with their respective verification level on your Skill Passport.
                  </p>
                </div>
                <Link href="/creator/skills">
                  <Button variant="ghost" size="sm" className="text-blue-600 text-xs">
                    Skills Hub →
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {creator.skills.map((skill) => {
                    const passportItem = passportItems.find(
                      (p) => p.skillName.toLowerCase() === skill.toLowerCase()
                    );
                    const status = passportItem?.status || (creator.verifiedSkills.includes(skill) ? "Test Verified" : "Claimed");

                    return (
                      <div
                        key={skill}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50/50 transition"
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-900 block">
                            {skill}
                          </span>
                          <StatusBadge status={status} size="sm" />
                        </div>

                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Skill Form */}
                {skillAddError && (
                  <div
                    role="alert"
                    className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between mt-2"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>{skillAddError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSkillAddError(null)}
                      className="text-[10px] font-bold text-rose-700 hover:text-rose-900 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {skillAddSuccess && (
                  <div
                    role="status"
                    className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between mt-2"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>{skillAddSuccess}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSkillAddSuccess(null)}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <form onSubmit={handleAddSkill} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    disabled={isAddingSkill}
                    value={newSkillInput}
                    onChange={(e) => {
                      setNewSkillInput(e.target.value);
                      if (skillAddError) setSkillAddError(null);
                    }}
                    placeholder="Add a new skill (e.g. Prompt Optimization, Diffusion Color Grading)..."
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-blue-500 disabled:bg-slate-100"
                  />
                  <Button type="submit" variant="default" size="sm" disabled={isAddingSkill} className="gap-1">
                    {isAddingSkill ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Skill</span>
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (1 Col): Rate Card, AI Audit Tool */}
          <div className="space-y-6">
            {/* Rates & Location Meta */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm">Rate Card & Location</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1 font-semibold">Standard Campaign Rate</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={priceRange}
                      onChange={(e) => setPriceRange(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                      <DollarSign className="w-4 h-4 text-amber-500" />
                      {creator.priceRange || "₹ 20,000 - ₹ 35,000"}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block mb-1 font-semibold">Location</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {creator.location || "Mumbai, India"}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Platforms</span>
                  <div className="flex gap-1.5">
                    {(creator.platforms || ["Instagram"]).map((p) => (
                      <span key={p} className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Profile Audit Card */}
            <Card className="border-indigo-200/80 bg-gradient-to-b from-indigo-50/40 to-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                    <Wand2 className="w-4 h-4 text-indigo-600" />
                    <span>AI Profile Auditor</span>
                  </div>
                  {auditResult && (
                    auditResult.isFallback || auditResult.engine === "heuristic_fallback" ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300"
                        title={auditResult.fallbackReason || "Evaluated using deterministic rule-based audit engine"}
                      >
                        <FileCheck className="w-3 h-3 text-amber-600" />
                        Rule-Based Audit
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-300"
                        title={`Generated via ${auditResult.provider || "AI Model"}`}
                      >
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        Model ({auditResult.provider || "Gemini"})
                      </span>
                    )
                  )}
                </div>
                <CardTitle className="text-base mt-1">Smart Profile Optimization</CardTitle>
                <p className="text-xs text-slate-500">
                  Analyze your bio, skills, and tools against top brand search queries.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="gradient"
                  size="sm"
                  isLoading={isAuditing}
                  onClick={runAIAudit}
                  className="w-full justify-center"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{auditResult ? "Re-Run Audit Analysis" : "Run Audit Analysis"}</span>
                </Button>

                {/* Loading state indicator */}
                {isAuditing && (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800 flex items-center gap-2 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                    <span>Analyzing profile against marketplace benchmarks...</span>
                  </div>
                )}

                {/* Error state alert */}
                {auditError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start justify-between gap-2 animate-fadeIn"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="font-semibold">{auditError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuditError(null)}
                      className="text-[11px] font-bold text-rose-700 hover:text-rose-900 cursor-pointer shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Provenance Banner & Results */}
                {auditResult && !isAuditing && (
                  <div className="space-y-3 pt-2 text-xs border-t border-indigo-100 animate-fadeIn">
                    {/* Provenance note */}
                    {auditResult.isFallback || auditResult.engine === "heuristic_fallback" ? (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                        <span className="font-bold flex items-center gap-1 text-amber-800">
                          <FileCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Deterministic Heuristic Fallback Active
                        </span>
                        <p className="mt-0.5 text-amber-700">
                          {auditResult.fallbackReason || "AI model was unavailable. Generated using rule-based profile analyzer."}
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-[11px] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Authentic evaluation generated via {auditResult.provider || "AI Model"}.</span>
                      </div>
                    )}

                    {typeof auditResult.overallReadinessScore === "number" && (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-indigo-100 shadow-xs">
                        <span className="font-semibold text-slate-700">Profile Readiness:</span>
                        <span className="font-black text-indigo-700 text-sm">
                          {auditResult.overallReadinessScore} / 100
                        </span>
                      </div>
                    )}

                    {auditResult.strengths && auditResult.strengths.length > 0 && (
                      <div>
                        <span className="font-bold text-emerald-700 block mb-1">Key Strengths:</span>
                        <ul className="space-y-1 text-slate-600 pl-3 list-disc">
                          {auditResult.strengths.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {auditResult.potentialImprovementAreas && auditResult.potentialImprovementAreas.length > 0 && (
                      <div>
                        <span className="font-bold text-amber-700 block mb-1">Recommended Upgrades:</span>
                        <ul className="space-y-1 text-slate-600 pl-3 list-disc">
                          {auditResult.potentialImprovementAreas.map((imp, idx) => (
                            <li key={idx}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Passport Link Card */}
            <Card className="bg-slate-900 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Official Credential</span>
                </div>
                <CardTitle className="text-white text-base">Skill Passport</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-300">
                  Generate verifiable evidence hashes and export your cryptographic Skill Passport for brand agencies.
                </p>
                <Link href="/creator/passport" className="block">
                  <Button variant="gradient" size="sm" className="w-full justify-center">
                    Open Skill Passport
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <AIProfileAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        initialName={name}
        initialNiche={creator?.category || "General AI"}
        initialSkills={creator?.skills || []}
        onApplyDraft={handleApplyAiDraft}
      />
    </div>
  );
}
