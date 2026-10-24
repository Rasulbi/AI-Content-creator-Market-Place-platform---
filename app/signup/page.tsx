"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { signupWithEmail, UserRole } from "@/lib/auth";
import {
    Building2,
    User,
    Mail,
    Lock,
    UserCircle,
    ArrowLeft,
    Loader2,
    AlertCircle,
    Briefcase,
    CheckCircle2,
} from "lucide-react";

function SignupFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialRole = (searchParams.get("role") as UserRole) || "brand";

    const [role, setRole] = useState<UserRole>(initialRole);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [category, setCategory] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const isBrand = role === "brand";

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);

        // Client-side validations
        const trimmedFullName = fullName.trim();
        const trimmedEmail = email.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (trimmedFullName.length < 2) {
            setErrorMessage("Full name must be at least 2 characters.");
            return;
        }
        if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
            setErrorMessage("Please provide a valid email address.");
            return;
        }
        if (!password || password.length < 6) {
            setErrorMessage("Password must be at least 6 characters long.");
            return;
        }
        if (password.length > 100) {
            setErrorMessage("Password cannot exceed 100 characters.");
            return;
        }
        if (isBrand && !companyName.trim()) {
            setErrorMessage("Please enter your company or brand name.");
            return;
        }

        try {
            setLoading(true);
            const { user, error } = await signupWithEmail({
                fullName: fullName.trim(),
                email: email.trim(),
                password,
                role,
                companyName: isBrand ? companyName.trim() : undefined,
                category,
            });

            if (error || !user) {
                setErrorMessage(error || "Registration failed. Please try again.");
                return;
            }

            // Clear sensitive password from client state immediately
            setPassword("");

            setSuccessMessage("Account created successfully! Redirecting to your dashboard...");
            setTimeout(() => {
                if (role === "brand") {
                    router.push("/brand/dashboard");
                } else {
                    router.push("/creator/dashboard");
                }
            }, 700);
        } catch (err: unknown) {
            console.error("Signup error:", err);
            setErrorMessage("An unexpected error occurred during signup.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFE] flex flex-col justify-between p-6 sm:p-10 font-sans">
            {/* Top Bar */}
            <div className="w-full max-w-xl mx-auto flex items-center justify-between mb-6">
                <Logo size="md" />
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
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
                        Join the premier marketplace for verified AI creators & brands
                    </p>
                </div>

                {/* Account Role Selector Pills */}
                <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl mb-6">
                    <button
                        type="button"
                        onClick={() => {
                            setRole("brand");
                            setErrorMessage(null);
                        }}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${isBrand
                            ? "bg-white text-purple-700 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        <Building2 className="w-4 h-4" />
                        <span>Brand / Company</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setRole("influencer");
                            setErrorMessage(null);
                        }}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${!isBrand
                            ? "bg-white text-blue-700 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        <User className="w-4 h-4" />
                        <span>Influencer / Creator</span>
                    </button>
                </div>

                {/* Error Notification */}
                {errorMessage && (
                    <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Success Notification */}
                {successMessage && (
                    <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{successMessage}</span>
                    </div>
                )}

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
                                placeholder={isBrand ? "Aarav Mehta" : "Ananya Rao"}
                                required
                                minLength={2}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                            />
                        </div>
                    </div>
                    {isBrand && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                Company / Brand Name
                            </label>
                            <div className="relative">
                                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="GlowUp Skincare"
                                    required={isBrand}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                            Primary Niche / Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-700"
                        >
                            <option value="" disabled>
                                Enter your category
                            </option>
                            <option value="Beauty & Skincare">Beauty & Skincare</option>
                            <option value="Technology">Technology</option>
                            <option value="Fashion">Fashion</option>
                            <option value="Fitness & Wellness">Fitness & Wellness</option>
                            <option value="Food">Food</option>
                            <option value="Travel & Lifestyle">Travel & Lifestyle</option>
                            <option value="Education">Education</option>
                            <option value="Gaming">Gaming</option>
                            <option value="Agriculture">Agriculture</option>
                        </select>
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
                                placeholder="Choose a password (6–100 characters)"
                                autoComplete="new-password"
                                required
                                minLength={6}
                                maxLength={100}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3.5 px-4 rounded-xl text-white text-sm font-semibold shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-60 ${isBrand
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
                © 2026 AI Creator Marketplace · Secure B.Tech Project
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
