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
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <Logo size="sm" />

          {/* Verification Badge */}
          <div className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 px-3 py-1 rounded-full text-xs font-semibold text-blue-700">
            <Award className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Creator Portal · {creator.category}</span>
          </div>
        </div>

        {/* Right Tools & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick AI Assistant Launch Button */}
          <button
            type="button"
            onClick={() => setChatbotOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-xs hover:opacity-95 transition cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          {/* Public Profile View Link */}
          <Link
            href={`/creators/${creator.id}`}
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            title="Preview how brands see your profile"
          >
            <span>Public Profile</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          {/* Notifications */}
          <button
            type="button"
            className="relative p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer select-none"
            >
              <div
                className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-blue-500/30"
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
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {creator.name}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold leading-none mt-0.5">
                  Verified Creator
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fadeIn">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{creator.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {currentUser?.email || "anjali@creator.com"}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] text-slate-600 font-medium">
                      {creator.availability}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href="/creator/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Manage Profile
                  </Link>
                  <Link
                    href="/creator/passport"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    Skill Passport
                  </Link>
                  <Link
                    href={`/creators/${creator.id}`}
                    target="_blank"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                    View Public Page
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Primary Navigation Tabs Bar */}
      <nav className="bg-white border-b border-slate-200/90 px-4 sm:px-8 py-1.5 overflow-x-auto scrollbar-none hidden md:block">
        <div className="flex items-center gap-1 sm:gap-2 max-w-7xl mx-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 select-none ${
                  link.active
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    link.active
                      ? "text-blue-400"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <span>{link.name}</span>
                {link.badge && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      link.active
                        ? "bg-blue-500 text-white"
                        : "bg-blue-100 text-blue-700"
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
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1 animate-fadeIn">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                  link.active
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </div>
                {link.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
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
