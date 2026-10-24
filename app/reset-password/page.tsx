"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "@/lib/auth";

type SessionStatus = "checking" | "valid" | "invalid";

function ResetPasswordContent() {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function verifyRecoverySession() {
      try {
        if (typeof window !== "undefined") {
          const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
          const hashParams = new URLSearchParams(hash);
          const searchParams = new URLSearchParams(window.location.search);

          // 1. Immediately extract any explicit errors from Supabase in hash or query
          const errorDesc =
            hashParams.get("error_description") ||
            searchParams.get("error_description") ||
            hashParams.get("error") ||
            searchParams.get("error");

          if (errorDesc) {
            if (isMounted) {
              setErrorMessage(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
              setSessionStatus("invalid");
            }
            return;
          }

          // 2. Synchronously establish session if access_token & refresh_token are in hash fragment
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionData?.session?.user && !sessionErr) {
              if (isMounted) setSessionStatus("valid");
              return;
            }
          }

          // 3. Exchange code for session if PKCE code query parameter is present
          const code = searchParams.get("code");
          if (code) {
            const { data: exchangeData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeData?.session?.user && !exchangeErr) {
              if (isMounted) setSessionStatus("valid");
              return;
            }
          }

          // 4. Verify OTP if token_hash query parameter is present
          const tokenHash = searchParams.get("token_hash");
          if (tokenHash) {
            const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: "recovery",
            });
            if (verifyData?.session?.user && !verifyErr) {
              if (isMounted) setSessionStatus("valid");
              return;
            }
          }
        }

        // 5. Check existing session (from cookies or storage)
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (session?.user && !error) {
          if (isMounted) setSessionStatus("valid");
          return;
        }

        // 6. Listen for auth state change in case tokens are processed asynchronously
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session?.user) {
            if (isMounted) setSessionStatus("valid");
          }
        });

        // 7. Fallback verification window: give the client up to 1.5s to extract tokens
        const timer = setTimeout(async () => {
          const {
            data: { session: delayedSession },
          } = await supabase.auth.getSession();

          if (isMounted) {
            setSessionStatus(delayedSession?.user ? "valid" : "invalid");
          }
        }, 1500);

        return () => {
          subscription.unsubscribe();
          clearTimeout(timer);
        };
      } catch (err) {
        console.warn("[ResetPassword] Session verification error:", err);
        if (isMounted) setSessionStatus("invalid");
      }
    }

    verifyRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validations consistent with platform registration rules
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword.length > 100) {
      setErrorMessage("Password is too long (maximum 100 characters).");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      setLoading(true);
      const res = await updatePassword(newPassword);

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update password. Please try again.");
        if (
          res.error?.includes("invalid") ||
          res.error?.includes("expired") ||
          res.error?.includes("already been used")
        ) {
          setSessionStatus("invalid");
        }
      } else {
        setIsSuccess(true);
        // Clear passwords from memory
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred while updating your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 sm:p-10 transition-all">
        {/* Logo Header */}
        <div className="flex justify-center mb-8">
          <Logo size="md" />
        </div>

        {/* 1. Checking Session State */}
        {sessionStatus === "checking" && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <div>
              <p className="text-sm font-bold text-slate-800">Verifying Recovery Link...</p>
              <p className="text-xs text-slate-400 mt-1">
                Validating your secure password recovery session.
              </p>
            </div>
          </div>
        )}

        {/* 2. Invalid or Expired Session State */}
        {sessionStatus === "invalid" && !isSuccess && (
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Invalid or Expired Link
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                This password reset link is invalid, expired, or has already been used. For your security, password reset links can only be used once.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/forgot-password"
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                <span>Request a New Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/"
                className="w-full py-3 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Return to Marketplace
              </Link>
            </div>
          </div>
        )}

        {/* 3. Successful Password Update State */}
        {isSuccess && (
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Password Reset Complete!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                Your password has been successfully updated. You can now log in to your account with your new credentials.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/login/brand"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] transition text-center"
              >
                Log In as Brand
              </Link>

              <Link
                href="/login/influencer"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 hover:scale-[1.01] active:scale-[0.99] transition text-center"
              >
                Log In as Creator
              </Link>
            </div>
          </div>
        )}

        {/* 4. Valid Session: New Password Form */}
        {sessionStatus === "valid" && !isSuccess && (
          <div className="animate-fadeIn">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Set New Password
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
                Choose a strong password with at least 6 characters.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3 animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    minLength={6}
                    maxLength={100}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-12 py-3.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    minLength={6}
                    maxLength={100}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-12 py-3.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
