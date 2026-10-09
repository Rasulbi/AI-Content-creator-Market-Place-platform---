"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreatorNav } from "@/components/creator/CreatorNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { CREATORS_DATA, Creator, PortfolioProject } from "@/lib/creators-data";
import { getStoredCreators, getCreatorById, addCreatorPortfolio } from "@/lib/creators-store";
import { linkProjectToSkill, getStoredSkillPassport } from "@/lib/skill-passport-store";
import { getCurrentUser } from "@/lib/auth";
import {
  FolderKanban,
  Sparkles,
  Terminal,
  FileText,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  ArrowLeft,
  Eye,
  Plus,
  X,
  Layers,
  Wand2,
} from "lucide-react";

const SAMPLE_MEDIA_PRESETS = [
  { label: "Skincare Dew Droplet", url: "/images/portfolio-skincare.jpg" },
  { label: "Sunscreen Aesthetic", url: "/images/glowup-cream.jpg" },
  { label: "Editorial Fashion Look", url: "/images/portfolio-fashion.jpg" },
  { label: "Culinary Macro ASMR", url: "/images/portfolio-food.jpg" },
  { label: "Minimalist Tech Device", url: "/images/portfolio-tech.jpg" },
];

const POPULAR_AI_TOOLS = [
  "Midjourney v6",
  "Runway Gen-3",
  "Flux.1 Dev",
  "ElevenLabs",
  "Kling AI",
  "ComfyUI",
  "Claude 3.5 Sonnet",
  "CapCut AI",
  "Topaz Video AI",
  "Magnific AI",
];

export default function AddPortfolioProjectPage() {
  const router = useRouter();

  const [creator, setCreator] = useState<Creator>(CREATORS_DATA[0]);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [contentType, setContentType] = useState("AI Commercial Reel & UGC");
  const [category, setCategory] = useState("Beauty & Skincare");
  const [selectedTools, setSelectedTools] = useState<string[]>([
    "Midjourney v6",
    "Runway Gen-3",
  ]);
  const [customToolInput, setCustomToolInput] = useState("");
  const [mediaUrl, setMediaUrl] = useState("/images/portfolio-skincare.jpg");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [prompt, setPrompt] = useState("");
  const [processEvidence, setProcessEvidence] = useState("");
  const [results, setResults] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    const stored = getStoredCreators();
    const matched = user ? getCreatorById(user.id) || stored[0] : stored[0];
    if (matched) {
      setCreator(matched);
      setCategory(matched.category);
      if (matched.skills && matched.skills.length > 0) {
        setSelectedSkills([matched.skills[0]]);
      }
    }
  }, []);

  const handleToggleTool = (tool: string) => {
    if (selectedTools.includes(tool)) {
      setSelectedTools(selectedTools.filter((t) => t !== tool));
    } else {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  const handleAddCustomTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customToolInput.trim()) return;
    if (!selectedTools.includes(customToolInput.trim())) {
      setSelectedTools([...selectedTools, customToolInput.trim()]);
    }
    setCustomToolInput("");
  };

  const handleToggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);

    const newProject: Omit<PortfolioProject, "id"> = {
      title: title.trim(),
      description: description.trim(),
      brand: brand.trim() || "Independent Creation",
      category,
      contentType,
      toolsUsed: selectedTools.length > 0 ? selectedTools : ["Generative Studio Tools"],
      image: mediaUrl,
      results: results.trim() || "Organic engagement campaign asset with verified prompt logs.",
      engagement: "8.5% Engagement Rate",
      reach: "1.2M Total Reach",
      prompt: prompt.trim() || "Cinematic diffusion generation with calibrated lighting parameters and high temporal consistency.",
      processEvidence: processEvidence.trim() || "1. Concept ideation & prompt optimization. 2. Generative passes. 3. Color grading and audio mastering.",
      aspectRatio,
      mediaType: "image",
      skillsTagged: selectedSkills,
    };

    const updated = addCreatorPortfolio(creator.id, newProject);

    // Also link associated skills in Skill Passport to upgrade them to Portfolio Evidence!
    if (updated && updated.portfolio && updated.portfolio.length > 0) {
      const createdProject = updated.portfolio[0];
      selectedSkills.forEach((skill) => {
        linkProjectToSkill(
          creator.id,
          skill,
          createdProject.id,
          `Backed by newly added portfolio project '${createdProject.title}' with prompt & workflow logs.`
        );
      });
    }

    setIsSubmitting(false);
    setIsSuccess(true);

    setTimeout(() => {
      router.push("/creator/portfolio");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <CreatorNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/creator/portfolio"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Portfolio Gallery</span>
          </Link>
          <Badge variant="purple" size="sm">
            Verification Evidence Creator
          </Badge>
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Add Portfolio Project
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Provide the generation prompt, tools used, media asset, and process evidence. Adding this project upgrades linked skills on your Skill Passport.
          </p>
        </div>

        {isSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold">
              Project published successfully! Associated skills have been upgraded to &quot;Portfolio Evidence&quot;. Redirecting...
            </span>
          </div>
        )}

        {/* Two-Column Form & Real-time Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form (7 Cols) */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
            {/* Basic Project Info */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderKanban className="w-4.5 h-4.5 text-blue-600" />
                  <span>Project Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Botanical Facial Serum 14-Day Hydration Story"
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-blue-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Brand / Client Name
                    </label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Aurora Botanicals, Nykaa, or Spec Project"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Content Type *
                    </label>
                    <select
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500"
                    >
                      <option value="Instagram Reel & UGC">Instagram Reel & UGC</option>
                      <option value="AI Commercial Video">AI Commercial Video</option>
                      <option value="Hyper-Realistic UGC">Hyper-Realistic UGC</option>
                      <option value="Product Review & Tutorial">Product Review & Tutorial</option>
                      <option value="Cinematic Reel Lookbook">Cinematic Reel Lookbook</option>
                      <option value="Generative Stills & Macro">Generative Stills & Macro</option>
                      <option value="Voiceover & Dubbing">Voiceover & Dubbing</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe the campaign objective, visual aesthetic, and creative hook..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* AI Tools Selection */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-indigo-600" />
                  <span>AI Tools Used *</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {POPULAR_AI_TOOLS.map((tool) => {
                    const isSelected = selectedTools.includes(tool);
                    return (
                      <button
                        type="button"
                        key={tool}
                        onClick={() => handleToggleTool(tool)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer select-none ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {tool}
                      </button>
                    );
                  })}
                </div>

                {/* Add custom tool */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customToolInput}
                    onChange={(e) => setCustomToolInput(e.target.value)}
                    placeholder="Add custom tool (e.g. Luma, Hedra, SyncLabs)..."
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddCustomTool}
                  >
                    Add Tool
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Media Asset Preview & Selector */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="w-4.5 h-4.5 text-blue-600" />
                  <span>Media Asset</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    Select Sample Media Preset or Custom Image URL
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {SAMPLE_MEDIA_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset.url}
                        onClick={() => setMediaUrl(preset.url)}
                        className={`p-2 rounded-xl border text-left text-xs transition cursor-pointer ${
                          mediaUrl === preset.url
                            ? "border-blue-600 bg-blue-50/50 font-bold text-blue-900"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="Or paste image asset URL..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700">Aspect Ratio:</span>
                  {["9:16", "4:5", "16:9", "1:1"].map((ratio) => (
                    <button
                      type="button"
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition ${
                        aspectRatio === ratio
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Prompt & Parameters */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="w-4.5 h-4.5 text-blue-600" />
                  <span>AI Generation Prompt & Parameters *</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Generation Prompt
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Paste the exact prompt used: e.g. Ultra-detailed macro of serum bottle, morning sunlight rim lighting, Hasselblad X2D --ar 9:16 --v 6.0 --stylize 250"
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 font-mono text-slate-800 focus:outline-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Including seeds, lighting cues, and version tags builds authentic verification credibility.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Process & Verification Evidence */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-purple-600" />
                  <span>Workflow Process & Verification Evidence *</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Step-by-step Workflow & Evidence
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={processEvidence}
                    onChange={(e) => setProcessEvidence(e.target.value)}
                    placeholder="1. Prompt ideation in Midjourney. 2. Camera zoom motion in Runway Gen-3. 3. Voiceover synthesis with ElevenLabs clone. 4. Final color grading and sound design."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 text-slate-800 focus:outline-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Campaign Impact / Results Summary
                  </label>
                  <input
                    type="text"
                    value={results}
                    onChange={(e) => setResults(e.target.value)}
                    placeholder="e.g. 1.8M organic views, 14,000 saves, 18% CTR to checkout"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                  />
                </div>

                {/* Skill tagging */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Link to Profile Skills (Upgrades skill to Portfolio Evidence):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {creator.skills.map((skill) => {
                      const isTagged = selectedSkills.includes(skill);
                      return (
                        <button
                          type="button"
                          key={skill}
                          onClick={() => handleToggleSkill(skill)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${
                            isTagged
                              ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {isTagged && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/creator/portfolio">
                <Button type="button" variant="outline" size="md">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="gradient"
                size="md"
                isLoading={isSubmitting}
                className="gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Publish Project to Portfolio</span>
              </Button>
            </div>
          </form>

          {/* Right Live Preview Card (5 Cols) */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Real-Time Live Preview</span>
            </div>

            <Card className="overflow-hidden border-slate-300 shadow-lg bg-white">
              <div className="relative h-60 w-full bg-slate-900">
                <Image
                  src={mediaUrl}
                  alt={title || "Project Preview"}
                  fill
                  sizes="400px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="text-[11px] font-bold bg-slate-900/90 text-white px-2.5 py-1 rounded-full backdrop-blur-xs">
                    {contentType}
                  </span>
                  <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
                    {aspectRatio}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[11px] text-blue-300 font-semibold block">
                    {brand || "Brand Collaboration"}
                  </span>
                  <h3 className="text-base font-black leading-snug line-clamp-1">
                    {title || "Untitled AI Project"}
                  </h3>
                </div>
              </div>

              <CardContent className="p-5 space-y-4">
                <p className="text-xs text-slate-600 line-clamp-2">
                  {description || "Enter a project description to see live preview updates..."}
                </p>

                {/* Tools Used */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Tools Used:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTools.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded-md"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Prompt Preview */}
                {prompt && (
                  <div className="p-2.5 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono">
                    <span className="text-blue-400 font-bold block mb-0.5 text-[10px]">
                      PROMPT:
                    </span>
                    <p className="line-clamp-2">{prompt}</p>
                  </div>
                )}

                {/* Results Preview */}
                {results && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
                    <span className="font-bold block text-[10px] uppercase text-emerald-600">
                      Results:
                    </span>
                    <p className="line-clamp-1 text-[11px]">{results}</p>
                  </div>
                )}

                {/* Skills Benefited */}
                {selectedSkills.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-purple-700 block mb-1">
                      Upgrades to Portfolio Evidence:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedSkills.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded-md border border-purple-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
