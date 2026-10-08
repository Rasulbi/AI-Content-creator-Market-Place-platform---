import Link from "next/link";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}

export function Logo({ className = "", size = "md", href = "/" }: LogoProps) {
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const content = (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Brand Icon (Stylized Gradient A Glyph) */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-md shadow-indigo-500/20 text-white font-black overflow-hidden flex-shrink-0 transition-transform hover:scale-105`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-white drop-shadow-sm"
        >
          {/* Stylized Modern Creator Marketplace Delta / A */}
          <path
            d="M16 4L6 23C5.5 24 6.2 25.2 7.3 25.2H11L14.2 18.5C14.8 17.2 17.2 17.2 17.8 18.5L21 25.2H24.7C25.8 25.2 26.5 24 26 23L16 4Z"
            fill="white"
            fillOpacity="0.95"
          />
          <path
            d="M12.5 22L16 15L19.5 22C19.8 22.7 19.3 23.5 18.5 23.5H13.5C12.7 23.5 12.2 22.7 12.5 22Z"
            fill="url(#inner-glow)"
          />
          <circle cx="16" cy="10" r="2.2" fill="#E0E7FF" />
          <defs>
            <linearGradient id="inner-glow" x1="12" y1="15" x2="20" y2="23.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#93C5FD" />
              <stop offset="1" stopColor="#C4B5FD" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col leading-tight">
        <span className={`${textSizes[size]} font-bold tracking-tight text-slate-900`}>
          AI Creator
        </span>
        <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Marketplace
        </span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="inline-block transition-opacity hover:opacity-90">{content}</Link>;
  }

  return content;
}
