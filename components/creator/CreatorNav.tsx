"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { getCurrentUser, logout, User as AuthUser } from "@/lib/auth";
import { CREATORS_DATA, Creator } from "@/lib/creators-data";
import { getStoredCreators, getCreatorById } from "@/lib/creators-store";
import { AIChatbotModal } from "@/components/ai/AIChatbotModal";
import { detectLegacyData, migrateLegacyDataToDatabase } from "@/lib/sync/local-storage-migrator";
import {
  LayoutDashboard,
  User,
  Zap,
  FolderKanban,
  PlusCircle,
  FileCheck2,
  ShieldCheck,
  Bot,
  Bell,
  ChevronDown,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Award,
} from "lucide-react";

export function CreatorNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [creator, setCreator] = useState<Creator>(CREATORS_DATA[0]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    // Background idempotent migration of legacy localStorage data
    if (user) {
      const detection = detectLegacyData();
      if (detection.hasLegacyData) {
        migrateLegacyDataToDatabase()
          .then((summary) => {
            if (summary.succeeded > 0) {
              console.log(`[Database Sync] Migrated ${summary.succeeded} legacy records to database.`);
            }
          })
          .catch((err) => console.warn("[Database Sync] Migration notice:", err));
      }
    }

    const stored = getStoredCreators();
    const matched = user ? getCreatorById(user.id) || stored[0] : stored[0];
    if (matched) {
      setCreator(matched);
    }

    const handleUpdate = () => {
      const refreshed = getStoredCreators();
      const current = user ? getCreatorById(user.id) || refreshed[0] : refreshed[0];
      if (current) setCreator(current);
    };

    window.addEventListener("creators-store-updated", handleUpdate);
    return () => window.removeEventListener("creators-store-updated", handleUpdate);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const navLinks = [
    {
      name: "Dashboard",
      href: "/creator/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/creator/dashboard",
    },
    {
      name: "Profile",
      href: "/creator/profile",
      icon: User,
      active: pathname === "/creator/profile",
    },
    {
      name: "Skills",
      href: "/creator/skills",
      icon: Zap,
      active: pathname === "/creator/skills",
    },
    {
      name: "Portfolio",
      href: "/creator/portfolio",
      icon: FolderKanban,
      active: pathname === "/creator/portfolio",
    },
    {
      name: "Add Project",
      href: "/creator/portfolio/new",
      icon: PlusCircle,
      active: pathname === "/creator/portfolio/new",
    },
    {
      name: "Skill Tests",
      href: "/creator/tests",
      icon: FileCheck2,
      active: pathname.startsWith("/creator/tests"),
    },
    {
      name: "Skill Passport",
      href: "/creator/passport",
      icon: ShieldCheck,
      badge: "Verified",
      active: pathname === "/creator/passport",
    },
    {
      name: "AI Assistant",
      href: "/assistant",
      icon: Bot,
      badge: "New",
      active: pathname === "/assistant",
    },
  ];

  return (
    <>
      {/* Top Header - Sophisticated Dark Navy V2 */}
      <header className="sticky top-0 z-40 bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-4 sm:gap-6">
          <Logo size="sm" theme="light" />

          {/* Verification Badge */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1 rounded-full text-xs font-semibold text-indigo-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Creator Portal &bull; {creator.category}</span>
          </div>
        </div>

        {/* Right Tools & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick AI Assistant Launch Button */}
          <button
            type="button"
            onClick={() => setChatbotOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          {/* Public Profile View Link */}
          <Link
            href={`/creators/${creator.id}`}
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl border border-slate-700/60 transition"
            title="Preview how brands see your profile"
          >
            <span>Public Profile</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          {/* Notifications */}
          <button
            type="button"
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer border border-transparent hover:border-slate-700/60"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#0B0F19]" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              type="button"
              aria-label="User navigation menu"
              data-testid="creator-user-menu"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700/80 transition-colors cursor-pointer select-none"
            >
              <div
                className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-indigo-500/40"
                style={{ width: "32px", height: "32px", position: "relative" }}
              >
                <Image
                  src={creator.avatar || "/images/anjali.jpg"}
                  alt={creator.name}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </div>
              <div className="hidden md:block text-left pr-1">
                <p className="text-xs font-bold text-white leading-tight">
                  {creator.name}
                </p>
                <p className="text-[10px] text-emerald-400 font-semibold leading-none mt-0.5">
                  Verified Creator
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0F172A] rounded-2xl shadow-2xl border border-slate-800 py-2 z-50 animate-fadeIn">
                <div className="px-4 py-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-white">{creator.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {currentUser?.email || "creator@marketplace.com"}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-slate-300 font-medium">
                      {creator.availability}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  {currentUser?.role === "brand" && (
                    <Link
                      href="/brand/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-indigo-400 hover:text-white hover:bg-slate-800/80 transition"
                    >
                      <ExternalLink className="w-4 h-4 text-indigo-400" />
                      <span>Switch to Brand View</span>
                    </Link>
                  )}
                  <Link
                    href="/creator/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium transition"
                  >
                    <User className="w-4 h-4 text-indigo-400" />
                    <span>Manage Profile</span>
                  </Link>
                  <Link
                    href="/creator/passport"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium transition"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>Skill Passport</span>
                  </Link>
                  <Link
                    href={`/creators/${creator.id}`}
                    target="_blank"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium transition"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                    <span>View Public Page</span>
                  </Link>
                </div>

                <div className="border-t border-slate-800 pt-1">
                  <button
                    type="button"
                    data-testid="creator-signout-btn"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 font-medium cursor-pointer transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Primary Navigation Tabs Bar */}
      <nav className="bg-[#0d1322] border-b border-slate-800/90 px-4 sm:px-8 py-2 overflow-x-auto scrollbar-none hidden md:block">
        <div className="flex items-center gap-1.5 sm:gap-2 max-w-7xl mx-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 select-none ${
                  link.active
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    link.active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                <span>{link.name}</span>
                {link.badge && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      link.active
                        ? "bg-white/20 text-white"
                        : "bg-indigo-900/60 text-indigo-300 border border-indigo-500/30"
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0B0F19] border-b border-slate-800 px-4 py-3 space-y-1 animate-fadeIn">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                  link.active
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </div>
                {link.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/70 text-indigo-300 font-bold border border-indigo-500/30">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
          {currentUser?.role === "brand" && (
            <Link
              href="/brand/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-indigo-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ExternalLink className="w-4 h-4 text-indigo-400" />
              <span>Switch to Brand View</span>
            </Link>
          )}
        </div>
      )}

      {/* AI Assistant Modal */}
      <AIChatbotModal
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
      />
    </>
  );
}
