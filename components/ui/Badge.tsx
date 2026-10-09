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
    default: "bg-slate-900 text-white border-transparent",
    secondary: "bg-slate-100 text-slate-800 border-slate-200",
    outline: "border-slate-300 text-slate-700 bg-transparent",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    claimed: "bg-slate-100 text-slate-700 border-slate-200/80 font-medium",
    portfolioEvidence: "bg-purple-50 text-purple-700 border-purple-200 font-semibold",
    testVerified: "bg-blue-50 text-blue-700 border-blue-200 font-semibold",
    clientVerified: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
  };

  const sizeStyles: Record<NonNullable<BadgeProps["size"]>, string> = {
    sm: "text-[11px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3.5 py-1.5",
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
