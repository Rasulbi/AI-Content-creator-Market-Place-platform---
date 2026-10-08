import React from "react";
import { ShieldCheck, Cpu, Users, Zap } from "lucide-react";

export function HeroFeatures() {
  const features = [
    {
      title: "Verified Skills",
      desc: "Real skills, real portfolio evidence",
      icon: ShieldCheck,
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      title: "AI Matching",
      desc: "Find the perfect creator for your needs",
      icon: Cpu,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      title: "Trusted Creators",
      desc: "Human verified & rated",
      icon: Users,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      title: "Faster Campaigns",
      desc: "Save time, get better results",
      icon: Zap,
      color: "text-violet-600 bg-violet-50 border-violet-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-slate-100">
      {features.map((feature, idx) => {
        const Icon = feature.icon;
        return (
          <div key={idx} className="flex flex-col items-center sm:items-start text-center sm:text-left group">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 border transition-transform group-hover:scale-105 duration-200 ${feature.color}`}
            >
              <Icon className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 tracking-tight">
              {feature.title}
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {feature.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}
