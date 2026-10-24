"use client";

import React, { useState } from "react";
import {
  Sparkles,
  X,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Lightbulb,
} from "lucide-react";
import { GeneratedProfileDraft } from "@/lib/validations/ai-profile";

interface AIProfileAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  initialNiche?: string;
  initialSkills?: string[];
  onApplyDraft: (draft: {
    name: string;
    headline: string;
    bio: string;
    category: string;
    skills: string[];
    aiTools: string[];
  }) => Promise<void>;
}

export function AIProfileAssistantModal({
  isOpen,
  onClose,
  initialName = "",
  initialNiche = "General AI",
  initialSkills = [],
  onApplyDraft,
}: AIProfileAssistantModalProps) {
  // Input phase states
  const [name, setName] = useState(initialName || "");
  const [niche, setNiche] = useState(initialNiche || "Beauty & Skincare");
  const [skillsInput, setSkillsInput] = useState(
    initialSkills.length > 0 ? initialSkills.join(", ") : "Prompt Engineering, Midjourney v6, Runway Gen-3"
  );
  const [experience, setExperience] = useState("2+ years creating generative visual campaigns");
  const [workDescription, setWorkDescription] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [contentCategory, setContentCategory] = useState("UGC Reels");
  const [campaignType, setCampaignType] = useState("Product Commercials");

  // Output draft state
  const [draft, setDraft] = useState<GeneratedProfileDraft | null>(null);
  const [editedHeadline, setEditedHeadline] = useState("");
  const [editedBio, setEditedBio] = useState("");
  const [editedIntro, setEditedIntro] = useState("");

  // Loading & status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedSkills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (parsedSkills.length === 0) {
      setErrorMessage("Please enter at least one skill or AI tool.");
      return;
    }

    setIsGenerating(true);

    try {
      const payload = {
        name: name.trim() || "AI Creator",
        niche: niche.trim(),
        skills: parsedSkills,
        experience: experience.trim(),
        workDescription: workDescription.trim(),
        portfolioLinks: portfolioLink.trim() ? [portfolioLink.trim()] : [],
        contentCategories: [contentCategory.trim()],
        campaignTypes: [campaignType.trim()],
      };

      const res = await fetch("/api/ai/generate-creator-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to generate AI profile draft.");
      }

      const generated: GeneratedProfileDraft = json.data;
      setDraft(generated);
      setEditedHeadline(generated.professionalHeadline);
      setEditedBio(generated.bio);
      setEditedIntro(generated.shortIntroduction);
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!draft) return;
    setErrorMessage(null);
    setIsApplying(true);

    try {
      await onApplyDraft({
        name: name.trim() || "AI Creator",
        headline: editedHeadline.trim(),
        bio: editedBio.trim(),
        category: draft.niche,
        skills: draft.skills,
        aiTools: draft.suggestedTools,
      });

      setSuccessMessage("AI Profile draft approved and applied to your profile!");
      setTimeout(() => {
        onClose();
        setDraft(null);
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save profile. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleDiscard = () => {
    setDraft(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50/50 via-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                AI Profile Assistant
                <span className="text-[11px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                  Draft Generator
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Ground your professional biography, skills, and headline in authentic creative evidence.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {!draft ? (
            /* Phase 1: Creator Input Form */
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Patel"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Creative Niche / Category
                  </label>
                  <input
                    type="text"
                    required
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. Beauty & Skincare, Tech & AI, Fashion"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Core Skills & AI Tools (comma separated)
                </label>
                <input
                  type="text"
                  required
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="e.g. Midjourney v6, Runway Gen-3, Prompt Engineering, UGC Reels"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Experience Summary
                  </label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. 3 years in commercial GenAI media"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Portfolio Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={portfolioLink}
                    onChange={(e) => setPortfolioLink(e.target.value)}
                    placeholder="https://instagram.com/mywork or YouTube URL"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Describe Your Creative Approach & Work (Optional)
                </label>
                <textarea
                  rows={3}
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  placeholder="Briefly describe your production workflow, preferred aesthetic, and the types of brand deliverables you specialize in..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-3 px-5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Structured Draft...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Generate Profile Draft</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Phase 2: Generated Draft Review & Approval */
            <div className="space-y-6">
              {/* Draft Status Notification */}
              <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold">
                    Profile Draft Generated ({draft.isFallback ? "Contextual Heuristic Assistant" : draft.provider})
                  </p>
                  <p className="text-amber-700">
                    This is an editable preview draft. Your live public profile will not be changed until you review, edit, and click <strong>Approve & Apply</strong>.
                  </p>
                </div>
              </div>

              {/* Editable Headline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Suggested Professional Headline
                </label>
                <input
                  type="text"
                  value={editedHeadline}
                  onChange={(e) => setEditedHeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                />
              </div>

              {/* Editable Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Professional Biography
                </label>
                <textarea
                  rows={6}
                  value={editedBio}
                  onChange={(e) => setEditedBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm leading-relaxed rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                />
              </div>

              {/* Extracted Skills & Tools Badges */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Keywords & Tools Tagged
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {draft.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-semibold px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-100 rounded-lg"
                    >
                      {skill}
                    </span>
                  ))}
                  {draft.suggestedTools.map((tool, idx) => (
                    <span
                      key={`tool-${idx}`}
                      className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Completeness Suggestions */}
              {draft.completenessSuggestions.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Completeness Suggestions for Higher Match Ranking
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {draft.completenessSuggestions.map((sug, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-indigo-600 font-bold">•</span>
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={isApplying}
                  className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Adjust Inputs & Regenerate</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isApplying}
                    className="py-2.5 px-4 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={isApplying}
                    className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving to Profile...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Approve & Apply to Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
