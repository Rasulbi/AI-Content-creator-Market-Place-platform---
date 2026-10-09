"use client";

import React from "react";
import { VerificationStatus } from "@/lib/skill-passport-store";
import { cn } from "@/lib/utils";
import {
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Award,
} from "lucide-react";

interface StatusBadgeProps {
  status: VerificationStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = "md",
  showIcon = true,
  className,
}: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "Claimed":
        return {
          icon: Clock,
          color: "bg-slate-100 text-slate-700 border-slate-200/80 hover:bg-slate-200/60",
          iconColor: "text-slate-500",
          label: "Claimed",
          tooltip: "Self-reported skill awaiting portfolio evidence or benchmark test",
        };
      case "Portfolio Evidence":
        return {
          icon: Sparkles,
          color: "bg-purple-50 text-purple-700 border-purple-200/90 hover:bg-purple-100/60",
          iconColor: "text-purple-600",
          label: "Portfolio Evidence",
          tooltip: "Backed by real production generation prompts and process workflow",
        };
      case "Test Verified":
        return {
          icon: ShieldCheck,
          color: "bg-blue-50 text-blue-700 border-blue-200/90 hover:bg-blue-100/60",
          iconColor: "text-blue-600",
          label: "Test Verified",
          tooltip: "Validated via standardized AI benchmark technical test",
        };
      case "Client Verified":
        return {
          icon: Award,
          color: "bg-emerald-50 text-emerald-800 border-emerald-200/90 hover:bg-emerald-100/60 font-semibold shadow-xs",
          iconColor: "text-emerald-600",
          label: "Client Verified",
          tooltip: "Formally endorsed and verified by paying brand collaborations",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3.5 py-1.5 gap-2",
  }[size];

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  }[size];

  return (
    <span
      title={config.tooltip}
      className={cn(
        "inline-flex items-center rounded-full border transition-all cursor-help font-medium select-none",
        config.color,
        sizeClasses,
        className
      )}
    >
      {showIcon && <Icon className={cn(iconSizes, config.iconColor, "shrink-0")} />}
      <span>{config.label}</span>
    </span>
  );
}
