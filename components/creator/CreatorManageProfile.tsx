"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Creator,
  PortfolioProject,
} from "@/lib/creators-data";
import {
  updateCreator,
  addCreatorSkill,
  removeCreatorSkill,
  addCreatorPortfolio,
  removeCreatorPortfolio,
} from "@/lib/creators-store";
import {
  Plus,
  Trash2,
  Check,
  X,
  Sparkles,
  FolderPlus,
  Upload,
  Clock,
  MapPin,
  DollarSign,
  Tag,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface CreatorManageProfileProps {
  creator: Creator;
  onProfileUpdated?: (updated: Creator) => void;
}

export function CreatorManageProfile({
  creator,
  onProfileUpdated,
}: CreatorManageProfileProps) {
  const [currentCreator, setCurrentCreator] = useState<Creator>(creator);

  // Skill input state
  const [newSkill, setNewSkill] = useState("");
  const [isSkillVerified, setIsSkillVerified] = useState(false);

  // Form states for general details
  const [bio, setBio] = useState(creator.bio || "");
  const [location, setLocation] = useState(creator.location || "");
  const [priceRange, setPriceRange] = useState(creator.priceRange || "₹ 20,000 - ₹ 35,000");
  const [availability, setAvailability] = useState(creator.availability);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(creator.platforms || ["Instagram"]);
  
  // New Portfolio Project Form State
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectBrand, setProjectBrand] = useState("");
  const [projectContentType, setProjectContentType] = useState("Instagram Reels");
  const [projectTools, setProjectTools] = useState("CapCut Pro, Sony FX3, Midjourney");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectResults, setProjectResults] = useState("");
  const [projectReach, setProjectReach] = useState("");
  const [projectImage, setProjectImage] = useState("/images/portfolio-skincare.jpg");

  // Notifications
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Add Skill
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;

    const updated = addCreatorSkill(currentCreator.id, newSkill.trim(), isSkillVerified);
    if (updated) {
      setCurrentCreator(updated);
      setNewSkill("");
      setIsSkillVerified(false);
      onProfileUpdated?.(updated);
    }
  };

  // 2. Remove Skill
  const handleRemoveSkill = (skill: string) => {
    const updated = removeCreatorSkill(currentCreator.id, skill);
    if (updated) {
      setCurrentCreator(updated);
      onProfileUpdated?.(updated);
    }
  };

  // 3. Add Portfolio Project
  const handleAddPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !projectDescription.trim()) {
      setErrorMsg("Please fill in project title and description.");
      return;
    }

    const tools = projectTools
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const newProject: Omit<PortfolioProject, "id"> = {
      title: projectTitle.trim(),
      brand: projectBrand.trim() || "Independent Project",
      category: currentCreator.category,
      contentType: projectContentType,
      toolsUsed: tools.length > 0 ? tools : ["CapCut", "Sony FX3"],
      image: projectImage,
      description: projectDescription.trim(),
      results: projectResults.trim() || "+18% Engagement Lift",
      engagement: "8.4%",
      reach: projectReach.trim() || "240K+ Views",
    };

    const updated = addCreatorPortfolio(currentCreator.id, newProject);
    if (updated) {
      setCurrentCreator(updated);
      setShowPortfolioModal(false);
      setProjectTitle("");
      setProjectBrand("");
      setProjectDescription("");
      setProjectResults("");
      setProjectReach("");
      setErrorMsg(null);
      onProfileUpdated?.(updated);
    }
  };

  // 4. Remove Portfolio Project
  const handleRemovePortfolio = (projectId: string) => {
    if (confirm("Are you sure you want to delete this portfolio project?")) {
      const updated = removeCreatorPortfolio(currentCreator.id, projectId);
      if (updated) {
        setCurrentCreator(updated);
        onProfileUpdated?.(updated);
      }
    }
  };

  // 5. Toggle Platform
  const togglePlatform = (plat: string) => {
    let next: string[];
    if (selectedPlatforms.includes(plat)) {
      next = selectedPlatforms.filter((p) => p !== plat);
    } else {
      next = [...selectedPlatforms, plat];
    }
    if (next.length === 0) next = ["Instagram"];
    setSelectedPlatforms(next);
  };

  // 6. Save Overall Details
  const handleSaveGeneralDetails = () => {
    const updated = updateCreator(currentCreator.id, {
      bio,
      location,
      priceRange,
      availability,
      platforms: selectedPlatforms,
    });

    if (updated) {
      setCurrentCreator(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onProfileUpdated?.(updated);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile changes saved successfully! Updates are now live in the brand matching engine.</span>
        </div>
      )}

      {/* 1. SKILLS & EXPERTISE MANAGEMENT */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Skills & Creative Expertise
            </h3>
            <p className="text-xs text-slate-500">
              Add technical tools, generative AI proficiencies, and niche specializations
            </p>
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            {currentCreator.skills.length} Active Skills
          </span>
        </div>

        {/* Current Skills Tags */}
        <div className="flex flex-wrap gap-2">
          {currentCreator.skills.map((skill) => {
            const isVerified = currentCreator.verifiedSkills?.includes(skill);
            return (
              <span
                key={skill}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  isVerified
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <span>{skill}</span>
                {isVerified && (
                  <span title="Verified Skill" className="inline-flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="hover:text-rose-600 transition ml-1 cursor-pointer"
                  title="Remove skill"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>

        {/* Add Skill Input Form */}
        <form onSubmit={handleAddSkill} className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-2">
          <div className="relative flex-1">
            <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="e.g. CapCut Pro, Midjourney v6, Skincare Storytelling, Sony FX3"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSkillVerified}
              onChange={(e) => setIsSkillVerified(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Mark Verified</span>
          </label>

          <button
            type="submit"
            disabled={!newSkill.trim()}
            className="py-2.5 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Skill</span>
          </button>
        </form>
      </div>

      {/* 2. PORTFOLIO PROJECTS MANAGEMENT */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Portfolio & Creative Work
            </h3>
            <p className="text-xs text-slate-500">
              Showcase past client collaborations, engagement metrics, and deliverables
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPortfolioModal(true)}
            className="py-2 px-3.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
          </button>
        </div>

        {/* Portfolio Projects Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentCreator.portfolio.map((proj) => (
            <div
              key={proj.id}
              className="rounded-2xl border border-slate-200/80 p-4 space-y-3 bg-white hover:border-slate-300 transition relative group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                    {proj.contentType}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{proj.title}</h4>
                  <p className="text-xs text-slate-500">Client: {proj.brand}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemovePortfolio(proj.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Delete project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">{proj.description}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span>Reach: {proj.reach}</span>
                <span className="font-semibold text-emerald-600">{proj.results}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. AVAILABILITY, PRICING & PLATFORMS */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Collaboration Preferences & Availability
            </h3>
            <p className="text-xs text-slate-500">
              Keep your booking status and price brackets up to date
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveGeneralDetails}
            className="py-2 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Availability Status
            </label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as Creator["availability"])}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Available for immediate hire">Available for immediate hire</option>
              <option value="Available in 1 week">Available in 1 week</option>
              <option value="Booked this month">Booked this month</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Base Price Range
            </label>
            <input
              type="text"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              placeholder="e.g. ₹ 20,000 - ₹ 35,000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Mumbai, India"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Active Platforms
          </label>
          <div className="flex flex-wrap gap-2">
            {["Instagram", "YouTube", "TikTok", "LinkedIn"].map((plat) => {
              const isSelected = selectedPlatforms.includes(plat);
              return (
                <button
                  key={plat}
                  type="button"
                  onClick={() => togglePlatform(plat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {plat}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Professional Bio
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Introduce your creative background, niche, and client achievements..."
            className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* MODAL: ADD PORTFOLIO PROJECT */}
      {showPortfolioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Add New Portfolio Project
              </h3>
              <button
                type="button"
                onClick={() => setShowPortfolioModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddPortfolio} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Title</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Hydration Serum 4K Macro Reel"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand / Client</label>
                  <input
                    type="text"
                    value={projectBrand}
                    onChange={(e) => setProjectBrand(e.target.value)}
                    placeholder="e.g. Nykaa / GlowUp"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Content Type</label>
                  <select
                    value={projectContentType}
                    onChange={(e) => setProjectContentType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900"
                  >
                    <option value="Instagram Reels">Instagram Reels</option>
                    <option value="UGC Review Video">UGC Review Video</option>
                    <option value="YouTube Longform">YouTube Longform</option>
                    <option value="3D Lookbook Shoot">3D Lookbook Shoot</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tools & AI Software</label>
                <input
                  type="text"
                  value={projectTools}
                  onChange={(e) => setProjectTools(e.target.value)}
                  placeholder="e.g. CapCut Pro, Midjourney, Sony FX3"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Description</label>
                <textarea
                  rows={2}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="What was the creative concept and how did you execute it?"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reach / Views</label>
                  <input
                    type="text"
                    value={projectReach}
                    onChange={(e) => setProjectReach(e.target.value)}
                    placeholder="e.g. 180K+ Views"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Key Results</label>
                  <input
                    type="text"
                    value={projectResults}
                    onChange={(e) => setProjectResults(e.target.value)}
                    placeholder="e.g. +22% Sales Lift"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPortfolioModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
