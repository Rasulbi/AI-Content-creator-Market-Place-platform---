import React from "react";
import { Check } from "lucide-react";

interface ChecklistProps {
  items: string[];
  theme?: "purple" | "blue";
  className?: string;
}

export function Checklist({ items, theme = "purple", className = "" }: ChecklistProps) {
  const isPurple = theme === "purple";

  return (
    <ul className={`space-y-3.5 ${className}`}>
      {items.map((item, index) => (
        <li key={index} className="flex items-center gap-3">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white ${
              isPurple ? "bg-[#7C5CFC]" : "bg-[#2563EB]"
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="text-sm font-medium text-slate-700">{item}</span>
        </li>
      ))}
    </ul>
  );
}
