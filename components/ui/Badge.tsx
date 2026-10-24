"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "purple"
    | "claimed"
    | "portfolioEvidence"
    | "testVerified"
    | "clientVerified";
  size?: "sm" | "md" | "lg";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-slate-900 text-white border-slate-800 shadow-2xs font-medium",
    secondary: "bg-slate-100 text-slate-800 border-slate-200/80 font-medium",
    outline: "border-slate-200 text-slate-700 bg-white shadow-2xs font-medium",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-semibold",
    warning: "bg-amber-50 text-amber-800 border-amber-200/80 font-semibold",
    danger: "bg-rose-50 text-rose-700 border-rose-200/80 font-semibold",
    info: "bg-blue-50 text-blue-700 border-blue-200/80 font-semibold",
    purple: "bg-indigo-50 text-indigo-700 border-indigo-200/80 font-semibold",
    claimed: "bg-slate-50 text-slate-600 border-slate-200 font-medium",
    portfolioEvidence: "bg-purple-50/80 text-purple-700 border-purple-200/90 font-semibold",
    testVerified: "bg-blue-50/80 text-blue-700 border-blue-200/90 font-semibold",
    clientVerified: "bg-emerald-50/80 text-emerald-700 border-emerald-200/90 font-bold",
  };

  const sizeStyles: Record<NonNullable<BadgeProps["size"]>, string> = {
    sm: "text-[10px] px-2 py-0.5 tracking-tight",
    md: "text-xs px-2.5 py-1 tracking-tight",
    lg: "text-sm px-3.5 py-1.5 tracking-tight",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border transition-colors select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
