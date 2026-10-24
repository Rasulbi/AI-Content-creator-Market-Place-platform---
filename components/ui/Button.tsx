"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "gradient"
    | "emerald";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default:
        "bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-xs shadow-slate-900/10 border border-slate-800 active:scale-[0.99]",
      secondary:
        "bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 text-slate-800 border border-slate-200/70 active:scale-[0.99]",
      outline:
        "border border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50/80 text-slate-700 hover:text-slate-900 shadow-2xs active:scale-[0.99]",
      ghost:
        "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:bg-slate-200/60",
      danger:
        "bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-xs shadow-rose-600/20 border border-rose-700/30 active:scale-[0.99]",
      gradient:
        "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-[0.99]",
      emerald:
        "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20 border border-emerald-700/30 active:scale-[0.99]",
    };

    const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-xs rounded-xl gap-1.5 font-medium tracking-tight",
      md: "h-10 px-4 text-xs sm:text-sm rounded-xl gap-2 font-semibold tracking-tight",
      lg: "h-12 px-6 text-sm sm:text-base rounded-2xl gap-2.5 font-semibold tracking-tight",
      icon: "h-9 w-9 rounded-xl p-0 flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
