"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreatorNav } from "@/components/creator/CreatorNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { CREATORS_DATA, Creator, PortfolioProject } from "@/lib/creators-data";
import {
  getStoredCreators,
  getCreatorById,
  removeCreatorPortfolio,
} from "@/lib/creators-store";
import { getCurrentUser } from "@/lib/auth";
import {
  FolderKanban,
  PlusCircle,
  Sparkles,
  Terminal,
  FileText,
  Search,
  Filter,
  Trash2,
  Copy,
  Check,
  Eye,
  ExternalLink,
  Layers,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function PortfolioPage() {
  const [creator, setCreator] = useState<Creator>(CREATORS_DATA[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState("All");

  // Prompt & Process Evidence Inspector Modal
  const [inspectProject, setInspectProject] = useState<PortfolioProject | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const [dbProjects, setDbProjects] = useState<PortfolioProject[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    const stored = getStoredCreators();
    const matched = user ? getCreatorById(user.id) || stored[0] : stored[0];
    if (matched) {
      setCreator(matched);
    }

    // Load persisted portfolio projects from Supabase database
    async function fetchDbPortfolio() {
      try {
        const queryParam = user?.id ? `?creatorId=${encodeURIComponent(user.id)}` : "";
        const res = await fetch(`/api/v1/portfolio${queryParam}`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            setDbProjects(json.data);
          }
        }
      } catch (err) {
        console.warn("Portfolio DB fetch error:", err);
      }
    }
    fetchDbPortfolio();

    const handleUpdate = () => {
      const refreshed = getStoredCreators();
      const current = user ? getCreatorById(user.id) || refreshed[0] : refreshed[0];
      if (current) setCreator(current);
      fetchDbPortfolio();
    };

    window.addEventListener("creators-store-updated", handleUpdate);
    return () => window.removeEventListener("creators-store-updated", handleUpdate);
  }, []);

  const handleCopyPrompt = (promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (deletingId) return;
    if (!confirm("Are you sure you want to remove this project from your portfolio?")) {
      return;
    }

    setDeletingId(projectId);
    setDeleteError(null);
    setDeleteNotice(null);

    try {
      const res = await fetch(`/api/v1/portfolio/${encodeURIComponent(projectId)}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        let msg = json.error || `Server rejected project deletion (HTTP ${res.status}).`;
        if (res.status === 401) {
          msg = "Authentication required. Please log in to delete this project.";
        } else if (res.status === 403) {
          msg = "You are not authorized to delete this project.";
        } else if (res.status === 404) {
          msg = "Project not found or already removed from the server.";
        }
        setDeleteError(msg);
        return;
      }

      // 1. Delete from local cache
      removeCreatorPortfolio(creator.id, projectId);

      // 2. Delete from database state
      if (dbProjects) {
        setDbProjects((prev) => (prev ? prev.filter((p) => p.id !== projectId) : null));
      }

      // 3. Update active creator portfolio state
      setCreator((prev) =>
        prev
          ? {
              ...prev,
              portfolio: (prev.portfolio || []).filter((p) => p.id !== projectId),
            }
          : prev
      );

      setDeleteNotice("Project successfully deleted from your portfolio.");
      setTimeout(() => setDeleteNotice(null), 4000);
    } catch (e: any) {
      setDeleteError(e?.message || "Network error while deleting project. Please check your connection and retry.");
    } finally {
      setDeletingId(null);
    }
  };

  // Merge database projects with local store items (avoiding duplicates by id or title)
  const projects = React.useMemo(() => {
    const local = creator.portfolio || [];
    if (!dbProjects || dbProjects.length === 0) return local;

    const dbMap = new Map(dbProjects.map((p) => [p.id, p]));
    const localRemaining = local.filter((l) => !dbMap.has(l.id));
    return [...dbProjects, ...localRemaining];
  }, [creator.portfolio, dbProjects]);

  const filteredProjects = projects.filter((p) => {
    const matchesCategory =
      contentTypeFilter === "All" ||
      p.contentType.toLowerCase().includes(contentTypeFilter.toLowerCase()) ||
      p.category.toLowerCase().includes(contentTypeFilter.toLowerCase());
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.toolsUsed.some((tool) => tool.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <CreatorNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header & New Project CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Creator Portfolio Gallery
              </h1>
              <Badge variant="purple" size="sm">
                {projects.length} Published Projects
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Every project serves as verified evidence with generation prompts, tools used, and workflow processes.
            </p>
          </div>

          <Link href="/creator/portfolio/new">
            <Button variant="gradient" size="md" className="gap-2 shadow-md">
              <PlusCircle className="w-4.5 h-4.5" />
              <span>Add Portfolio Project</span>
            </Button>
          </Link>
        </div>

        {/* Delete Status / Error Alerts */}
        {deleteNotice && (
          <div
            role="status"
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between animate-fadeIn"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{deleteNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeleteNotice(null)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {deleteError && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center justify-between animate-fadeIn"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{deleteError}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeleteError(null)}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            {["All", "Reel", "UGC", "Lookbook", "Review", "Video"].map((filter) => (
              <button
                key={filter}
                onClick={() => setContentTypeFilter(filter)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  contentTypeFilter === filter
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, tool, or prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800"
            />
          </div>
        </div>

        {/* Portfolio Projects Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="overflow-hidden hover:shadow-lg transition border-slate-200/90 flex flex-col justify-between group"
            >
              {/* Media Preview Thumbnail */}
              <div className="relative h-56 w-full bg-slate-100 overflow-hidden">
                <Image
                  src={project.image || "/images/portfolio-skincare.jpg"}
                  alt={project.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                {/* Badges on image */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="text-[11px] font-bold bg-slate-900/90 text-white px-2.5 py-1 rounded-full backdrop-blur-xs">
                    {project.contentType}
                  </span>
                  {project.aspectRatio && (
                    <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
                      {project.aspectRatio}
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3">
                  <button
                    type="button"
                    onClick={() => handleDeleteProject(project.id)}
                    disabled={deletingId !== null}
                    className="p-1.5 rounded-lg bg-black/40 text-white/80 hover:text-rose-400 hover:bg-black/70 disabled:opacity-50 transition cursor-pointer"
                    title={deletingId === project.id ? "Deleting project..." : "Delete project"}
                  >
                    {deletingId === project.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Brand label & title overlay */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[11px] font-semibold text-blue-300 block">
                    {project.brand}
                  </span>
                  <h3 className="text-sm font-bold leading-snug line-clamp-1">
                    {project.title}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>

                  {/* Tools Used Tags */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      AI Tools Used:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.toolsUsed.map((tool) => (
                        <span
                          key={tool}
                          className="text-[11px] bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded-md border border-slate-200/60"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Prompt Preview Snippet */}
                  {project.prompt && (
                    <div className="p-2.5 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono relative overflow-hidden">
                      <div className="flex items-center justify-between mb-1 text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Terminal className="w-3 h-3" /> Prompt
                        </span>
                      </div>
                      <p className="line-clamp-2 text-slate-300">
                        {project.prompt}
                      </p>
                    </div>
                  )}

                  {/* Results preview */}
                  {project.results && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs">
                      <span className="font-bold block text-[10px] uppercase text-emerald-600">
                        Verified Impact:
                      </span>
                      <p className="line-clamp-1 text-[11px]">{project.results}</p>
                    </div>
                  )}
                </div>

                {/* Inspect Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setInspectProject(project)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Prompt & Evidence</span>
                  </button>

                  <span className="text-[11px] font-semibold text-slate-400">
                    {project.category}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {filteredProjects.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No projects found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add your first AI project with generation prompts and process evidence to build your portfolio.
            </p>
            <Link href="/creator/portfolio/new">
              <Button variant="gradient" size="sm" className="mt-4">
                Add Project Now
              </Button>
            </Link>
          </div>
        )}
      </main>

      {/* Inspect Prompt & Evidence Modal */}
      {inspectProject && (
        <Modal
          isOpen={Boolean(inspectProject)}
          onClose={() => setInspectProject(null)}
          title={inspectProject.title}
          description={`${inspectProject.contentType} · ${inspectProject.brand}`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Media Banner */}
            <div className="relative h-64 w-full rounded-xl overflow-hidden bg-slate-900">
              <Image
                src={inspectProject.image || "/images/portfolio-skincare.jpg"}
                alt={inspectProject.title}
                fill
                sizes="(max-width: 1024px) 100vw, 700px"
                className="object-contain"
              />
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Project Overview
              </h4>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                {inspectProject.description}
              </p>
            </div>

            {/* Tools Used */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                AI Generation Tools
              </h4>
              <div className="flex flex-wrap gap-2">
                {inspectProject.toolsUsed.map((tool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>{tool}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Full Prompt Inspector */}
            {inspectProject.prompt && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-blue-600" />
                    <span>Generation Prompt & Parameters</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(inspectProject.prompt!)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono border border-slate-800 leading-relaxed">
                  {inspectProject.prompt}
                </div>
              </div>
            )}

            {/* Process / Verification Evidence */}
            {inspectProject.processEvidence && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Workflow Process & Verification Evidence</span>
                </h4>
                <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-purple-950 leading-relaxed whitespace-pre-line">
                  {inspectProject.processEvidence}
                </div>
              </div>
            )}

            {/* Campaign Performance Metrics */}
            {inspectProject.results && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Campaign Results & Reach
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                    <span className="font-bold block text-[10px] text-emerald-600">ENGAGEMENT</span>
                    <span>{inspectProject.engagement || "9.2% Engagement"}</span>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900">
                    <span className="font-bold block text-[10px] text-blue-600">REACH & ROI</span>
                    <span>{inspectProject.results}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setInspectProject(null)}
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
