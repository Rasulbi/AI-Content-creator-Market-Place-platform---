import React from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  showBack?: boolean;
  backHref?: string;
  backText?: string;
  rightAction?: React.ReactNode;
}

export function PageHeader({
  showBack = false,
  backHref = "/",
  backText = "Back to home",
  rightAction,
}: PageHeaderProps) {
  return (
    <header className="w-full flex items-center justify-between py-6 px-6 sm:px-10 lg:px-16">
      <Logo size="md" />

      <div>
        {showBack ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{backText}</span>
          </Link>
        ) : rightAction ? (
          rightAction
        ) : (
          <div className="text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-purple-600 hover:text-purple-700 hover:underline"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
