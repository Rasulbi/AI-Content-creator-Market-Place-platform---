"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { UserRole } from "@/lib/auth";
import { Building2, User, Mail, Lock, UserCircle, ArrowLeft, Loader2 } from "lucide-react";

function SignupFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role") as UserRole) || "brand";

  const [role, setRole] = useState<UserRole>(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isBrand = role === "brand";

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      alert("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Redirect to respective dashboard after mock registration
      if (role === "brand") {
        router.push("/brand/dashboard");
      } else {
        router.push("/creator/dashboard");
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFE] flex flex-col justify-between p-6 sm:p-10">
      {/* Top Bar */}
      <div className="w-full max-w-xl mx-auto flex items-center justify-between mb-8">
        <Logo size="md" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Link>
      </div>

      {/* Main Signup Card */}
      <div className="w-full max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/60 border border-slate-100">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Create your account
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Join the premier marketplace for verified AI creators
          </p>
        </div>

        {/* Account Role Selector Pills */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setRole("brand")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              isBrand
                ? "bg-white text-purple-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Brand / Company</span>
          </button>
          <button
            type="button"
            onClick={() => setRole("influencer")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              !isBrand
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Influencer / Creator</span>
          </button>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <UserCircle className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isBrand ? "Marketing Director" : "Anjali Sharma"}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isBrand ? "you@company.com" : "you@creator.com"}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a secure password (min 6 chars)"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl text-white text-sm font-semibold shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-2 ${
              isBrand
                ? "bg-[#6355F6] hover:bg-[#5344e7] shadow-purple-600/25"
                : "bg-[#1E60F2] hover:bg-[#1551d7] shadow-blue-600/25"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create {isBrand ? "Brand" : "Creator"} Account</span>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
              OR
            </span>
          </div>
        </div>

        <GoogleButton role={role} text="Sign up with Google" />

        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link
            href={isBrand ? "/login/brand" : "/login/influencer"}
            className="font-semibold text-purple-600 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>

      <div className="w-full max-w-xl mx-auto text-center text-xs text-slate-400 mt-6">
        © 2026 AI Creator Marketplace
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignupFormContent />
    </Suspense>
  );
}
