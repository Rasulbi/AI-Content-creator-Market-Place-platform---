"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { requestPasswordReset } from "@/lib/auth";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role")?.toLowerCase();
  const initialEmail = searchParams.get("email") || "";
  const initialError = searchParams.get("error");

  const isInfluencer = roleParam === "influencer" || roleParam === "creator";
  const loginUrl = isInfluencer ? "/login/influencer" : "/login/brand";

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError ? decodeURIComponent(initialError) : null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialError) {
      setErrorMessage(decodeURIComponent(initialError));
    }
  }, [initialError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await requestPasswordReset(trimmed);

      if (!res.success) {
        setErrorMessage(res.error || "Failed to process password reset. Please try again.");
      } else {
        setSuccessMessage(
          res.message ||
            "If an account exists with this email address, a password reset link has been sent. Please check your inbox and spam folder."
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 sm:p-10 transition-all">
        {/* Navigation & Logo */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href={loginUrl}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
          <Logo size="sm" />
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Forgot Password?
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Enter your registered email address and we&apos;ll send you a secure link to reset your password.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage ? (
          <div className="space-y-6 animate-fadeIn">
            <div
              role="status"
              className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-3.5 leading-relaxed"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900 mb-1">Check your inbox</p>
                <p className="text-emerald-700">{successMessage}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Didn&apos;t receive an email? Check your spam folder or try requesting again in a few minutes.
            </p>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage(null);
                  setErrorMessage(null);
                }}
                className="w-full py-3 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Request another link
              </button>

              <Link
                href={loginUrl}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold text-center hover:bg-slate-800 transition"
              >
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="recovery-email"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="recovery-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition disabled:opacity-60 disabled:bg-slate-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending reset link...</span>
                </>
              ) : (
                <span>Send Password Reset Link</span>
              )}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">
                Remember your password?{" "}
                <Link
                  href={loginUrl}
                  className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  Log in
                </Link>
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
