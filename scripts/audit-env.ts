import { loadEnvConfig } from "@next/env";
import path from "path";

// Load .env.local without exposing anything
loadEnvConfig(process.cwd());

export interface EnvAuditResult {
  variable: string;
  isSet: boolean;
  isPlaceholder: boolean;
  status: "CONFIGURED" | "PLACEHOLDER" | "MISSING";
  category: "SUPABASE" | "AI_CORE" | "AI_PROVIDER" | "DATABASE";
  isRequiredForActiveProvider: boolean;
  notes: string;
}

const PLACEHOLDER_PATTERNS = [
  /your-project-id/i,
  /your-anon-key/i,
  /your-service-role-key/i,
  /your-db-password/i,
  /your-key-here/i,
  /your-openrouter-key/i,
  /your-openai-key/i,
  /your-groq-key/i,
  /your-grok-key/i,
  /placeholder/i,
  /change_me/i,
  /todo/i,
  /xxxx/i,
  /<.*>/,
];

export function auditEnvironment(): EnvAuditResult[] {
  const activeProvider = (process.env.AI_PROVIDER || "openrouter").toLowerCase();

  const variablesToCheck = [
    { name: "NEXT_PUBLIC_SUPABASE_URL", category: "SUPABASE" as const, requiredForProvider: false },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", category: "SUPABASE" as const, requiredForProvider: false },
    { name: "SUPABASE_SERVICE_ROLE_KEY", category: "SUPABASE" as const, requiredForProvider: false },
    { name: "DATABASE_URL", category: "DATABASE" as const, requiredForProvider: false },
    { name: "AI_PROVIDER", category: "AI_CORE" as const, requiredForProvider: true },
    { name: "AI_MODEL", category: "AI_CORE" as const, requiredForProvider: true },
    { name: "OPENROUTER_API_KEY", category: "AI_PROVIDER" as const, requiredForProvider: activeProvider === "openrouter" },
    { name: "OPENAI_API_KEY", category: "AI_PROVIDER" as const, requiredForProvider: activeProvider === "openai" },
    { name: "GROQ_API_KEY", category: "AI_PROVIDER" as const, requiredForProvider: activeProvider === "groq" },
    { name: "XAI_API_KEY", category: "AI_PROVIDER" as const, requiredForProvider: activeProvider === "grok" },
  ];

  return variablesToCheck.map(({ name, category, requiredForProvider }) => {
    const raw = process.env[name];
    const isSet = typeof raw === "string" && raw.trim().length > 0;
    
    let isPlaceholder = false;
    let notes = "Not configured";

    if (isSet && raw) {
      const trimmed = raw.trim();
      isPlaceholder = PLACEHOLDER_PATTERNS.some((pat) => pat.test(trimmed));

      if (isPlaceholder) {
        notes = "Contains obvious placeholder template value";
      } else {
        if (name.includes("URL") && !trimmed.startsWith("http") && !trimmed.startsWith("postgres")) {
          isPlaceholder = true;
          notes = "Invalid URL schema structure";
        } else {
          notes = `Configured (${trimmed.length} chars, masked)`;
        }
      }
    }

    const status: "CONFIGURED" | "PLACEHOLDER" | "MISSING" = !isSet
      ? "MISSING"
      : isPlaceholder
      ? "PLACEHOLDER"
      : "CONFIGURED";

    return {
      variable: name,
      isSet,
      isPlaceholder,
      status,
      category,
      isRequiredForActiveProvider: requiredForProvider,
      notes,
    };
  });
}

// Self-run inspection
if (process.argv[1]?.endsWith("audit-env.ts")) {
  const results = auditEnvironment();
  console.log("==================================================");
  console.log("🔒 SAFE ENVIRONMENT CONFIGURATION AUDIT (REDACTED)");
  console.log("==================================================");
  results.forEach((r) => {
    const icon = r.status === "CONFIGURED" ? "✅" : r.status === "PLACEHOLDER" ? "⚠️" : "❌";
    const reqTag = r.isRequiredForActiveProvider ? "[REQUIRED FOR ACTIVE PROVIDER]" : "[OPTIONAL/FEATURE]";
    console.log(`${icon} ${r.variable.padEnd(30)} : ${r.status.padEnd(12)} ${reqTag} - ${r.notes}`);
  });
}
