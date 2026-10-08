"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { loginWithEmail, UserRole } from "@/lib/auth";
import { GoogleButton } from "./GoogleButton";

interface LoginFormProps {
  role: UserRole;
  title: string;
  subtitle: string;
  defaultEmailPlaceholder?: string;
  signupText?: string;
}

export function LoginForm({
  role,
  title,
  subtitle,
  defaultEmailPlaceholder,
  signupText = "Sign up",
}: LoginFormProps) {
  const router = useRouter();
  const isBrand = role === "brand";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const placeholderEmail =
    defaultEmailPlaceholder || (isBrand ? "you@company.com" : "you@creator.com");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side quick check
    if (!email) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    try {
      setLoading(true);
      const { user, error } = await loginWithEmail(email, password, role, rememberMe);

      if (error) {
        setErrorMessage(error);
        return;
      }

      // Successful redirect based on user role
      if (user.role === "brand") {
        router.push("/brand/dashboard");
      } else {
        router.push("/creator/dashboard");
      }
    } catch (err: unknown) {
      console.error("Login failed:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert(`Password reset link will be sent to: ${email || "your email address"}`);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Title & Subtitle */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholderEmail}
              autoComplete="email"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all"
              style={{
                borderColor: undefined,
              }}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Remember me</span>
          </label>

          <button
            type="button"
            onClick={handleForgotPassword}
            className={`font-semibold hover:underline cursor-pointer transition-colors ${
              isBrand ? "text-purple-600 hover:text-purple-700" : "text-blue-600 hover:text-blue-700"
            }`}
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3.5 px-4 rounded-xl text-white text-sm font-semibold shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
            isBrand
              ? "bg-[#6355F6] hover:bg-[#5344e7] active:bg-[#4335d5] shadow-purple-600/25"
              : "bg-[#1E60F2] hover:bg-[#1551d7] active:bg-[#0e43b8] shadow-blue-600/25"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Verifying...</span>
            </>
          ) : (
            <span>Login</span>
          )}
        </button>
      </form>

      {/* OR Divider */}
      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">
            OR
          </span>
        </div>
      </div>

      {/* Google Login Button */}
      <GoogleButton role={role} />

      {/* Bottom Footer Text */}
      <p className="mt-8 text-center text-xs sm:text-sm text-slate-500">
        {isBrand ? "Don't have a brand account? " : "Don't have an account? "}
        <Link
          href={`/signup?role=${role}`}
          className={`font-semibold hover:underline ${
            isBrand ? "text-purple-600" : "text-blue-600"
          }`}
        >
          {signupText}
        </Link>
      </p>
    </div>
  );
}
