import { loadEnvConfig } from "@next/env";

// Load .env.local without logging values
loadEnvConfig(process.cwd());

export interface ServiceConnectivityResult {
  service: string;
  status: "PASS" | "FAIL" | "SKIP" | "NOT TESTED";
  responseTimeMs?: number;
  message: string;
  remediation?: string;
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

function isConfiguredAndNotPlaceholder(val: string | undefined): boolean {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  if (trimmed.length < 8) return false;
  return !PLACEHOLDER_PATTERNS.some((pat) => pat.test(trimmed));
}

export async function testSupabaseConnectivity(): Promise<ServiceConnectivityResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!isConfiguredAndNotPlaceholder(url) || !isConfiguredAndNotPlaceholder(anonKey)) {
    return {
      service: "Supabase Database & Auth",
      status: "SKIP",
      message: "Credentials are not configured or contain placeholder template values in .env.local.",
      remediation: "Add your active NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from the Supabase dashboard.",
    };
  }

  const startTime = Date.now();
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${anonKey!}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const duration = Date.now() - startTime;

    if (res.ok || res.status === 200 || res.status === 404) {
      return {
        service: "Supabase Database & Auth",
        status: "PASS",
        responseTimeMs: duration,
        message: `Successfully connected to Supabase REST endpoint (HTTP ${res.status}).`,
      };
    } else if (res.status === 401 || res.status === 403) {
      return {
        service: "Supabase Database & Auth",
        status: "FAIL",
        responseTimeMs: duration,
        message: `Authentication failed (HTTP ${res.status}). Invalid anon key.`,
        remediation: "Verify NEXT_PUBLIC_SUPABASE_ANON_KEY in your Supabase project API settings.",
      };
    } else {
      return {
        service: "Supabase Database & Auth",
        status: "FAIL",
        responseTimeMs: duration,
        message: `Unexpected HTTP ${res.status} response from Supabase.`,
      };
    }
  } catch (err: any) {
    const duration = Date.now() - startTime;
    return {
      service: "Supabase Database & Auth",
      status: "FAIL",
      responseTimeMs: duration,
      message: `Network connection failed: ${err.message}`,
      remediation: "Ensure the NEXT_PUBLIC_SUPABASE_URL domain is correct and reachable.",
    };
  }
}

export async function testOpenRouterConnectivity(): Promise<ServiceConnectivityResult> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  const activeProvider = (process.env.AI_PROVIDER || "openrouter").toLowerCase();

  if (!isConfiguredAndNotPlaceholder(key)) {
    return {
      service: "OpenRouter API (Primary LLM)",
      status: "SKIP",
      message: "OPENROUTER_API_KEY is not configured or contains placeholder in .env.local.",
      remediation: "Generate an API key at https://openrouter.ai/keys and set OPENROUTER_API_KEY in .env.local.",
    };
  }

  const startTime = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://ai-creator-marketplace.local",
        "X-Title": "AI Content Creator Marketplace",
      },
      signal: AbortSignal.timeout(5000),
    });

    const duration = Date.now() - startTime;

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        service: "OpenRouter API (Primary LLM)",
        status: "PASS",
        responseTimeMs: duration,
        message: `Authentication verified. Account key valid (limit: ${data.data?.limit ?? "active"}).`,
      };
    } else if (res.status === 401) {
      return {
        service: "OpenRouter API (Primary LLM)",
        status: "FAIL",
        responseTimeMs: duration,
        message: "Authentication failed (HTTP 401). Invalid or revoked OPENROUTER_API_KEY.",
        remediation: "Check and regenerate your key at https://openrouter.ai/keys.",
      };
    } else if (res.status === 429) {
      return {
        service: "OpenRouter API (Primary LLM)",
        status: "FAIL",
        responseTimeMs: duration,
        message: "Rate limit reached (HTTP 429).",
        remediation: "Wait a few seconds or verify account credit balance on OpenRouter.",
      };
    } else {
      return {
        service: "OpenRouter API (Primary LLM)",
        status: "FAIL",
        responseTimeMs: duration,
        message: `HTTP ${res.status} received from OpenRouter API.`,
      };
    }
  } catch (err: any) {
    const duration = Date.now() - startTime;
    return {
      service: "OpenRouter API (Primary LLM)",
      status: "FAIL",
      responseTimeMs: duration,
      message: `Network request error: ${err.message}`,
      remediation: "Check internet connection and verify openrouter.ai is reachable.",
    };
  }
}

export async function testOpenAIConnectivity(): Promise<ServiceConnectivityResult> {
  const key = process.env.OPENAI_API_KEY?.trim();

  if (!isConfiguredAndNotPlaceholder(key)) {
    return {
      service: "OpenAI API (Content Studio)",
      status: "SKIP",
      message: "OPENAI_API_KEY is not configured or contains placeholder in .env.local.",
      remediation: "Generate an API key at https://platform.openai.com/api-keys and add OPENAI_API_KEY to .env.local.",
    };
  }

  const startTime = Date.now();
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const duration = Date.now() - startTime;

    if (res.ok) {
      return {
        service: "OpenAI API (Content Studio)",
        status: "PASS",
        responseTimeMs: duration,
        message: "Authentication verified. Models catalog accessed successfully.",
      };
    } else if (res.status === 401) {
      return {
        service: "OpenAI API (Content Studio)",
        status: "FAIL",
        responseTimeMs: duration,
        message: "Authentication failed (HTTP 401). Invalid OPENAI_API_KEY.",
        remediation: "Check your OpenAI secret key at https://platform.openai.com/api-keys.",
      };
    } else {
      return {
        service: "OpenAI API (Content Studio)",
        status: "FAIL",
        responseTimeMs: duration,
        message: `HTTP ${res.status} from OpenAI.`,
      };
    }
  } catch (err: any) {
    return {
      service: "OpenAI API (Content Studio)",
      status: "FAIL",
      responseTimeMs: Date.now() - startTime,
      message: `Network error: ${err.message}`,
    };
  }
}

export async function testGroqConnectivity(): Promise<ServiceConnectivityResult> {
  const key = process.env.GROQ_API_KEY?.trim();

  if (!isConfiguredAndNotPlaceholder(key)) {
    return {
      service: "Groq Cloud API (Optional Alternative)",
      status: "SKIP",
      message: "GROQ_API_KEY is not configured in .env.local.",
      remediation: "Optional. Add GROQ_API_KEY if testing Groq Cloud provider.",
    };
  }

  const startTime = Date.now();
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });

    const duration = Date.now() - startTime;
    if (res.ok) {
      return {
        service: "Groq Cloud API (Optional Alternative)",
        status: "PASS",
        responseTimeMs: duration,
        message: "Authentication verified successfully.",
      };
    } else {
      return {
        service: "Groq Cloud API (Optional Alternative)",
        status: "FAIL",
        responseTimeMs: duration,
        message: `HTTP ${res.status} from Groq Cloud.`,
      };
    }
  } catch (err: any) {
    return {
      service: "Groq Cloud API (Optional Alternative)",
      status: "FAIL",
      responseTimeMs: Date.now() - startTime,
      message: `Connection error: ${err.message}`,
    };
  }
}

export async function testDatabaseConnectivity(): Promise<ServiceConnectivityResult> {
  const dbUrl = process.env.DATABASE_URL?.trim();

  if (!isConfiguredAndNotPlaceholder(dbUrl)) {
    return {
      service: "PostgreSQL Database (DATABASE_URL)",
      status: "SKIP",
      message: "DATABASE_URL is not configured or contains placeholder in .env.local.",
      remediation: "Configure DATABASE_URL with your PostgreSQL connection string if direct DB access is needed.",
    };
  }

  try {
    const parsed = new URL(dbUrl!);
    return {
      service: "PostgreSQL Database (DATABASE_URL)",
      status: "PASS",
      message: `Configured for host "${parsed.hostname}" (port: ${parsed.port || 5432}).`,
    };
  } catch (err: any) {
    return {
      service: "PostgreSQL Database (DATABASE_URL)",
      status: "FAIL",
      message: `Invalid DATABASE_URL format: ${err.message}`,
    };
  }
}

export async function testOpenRouterGeneration(): Promise<ServiceConnectivityResult> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!isConfiguredAndNotPlaceholder(key)) {
    return {
      service: "OpenRouter Generation (Live Inference)",
      status: "SKIP",
      message: "OPENROUTER_API_KEY is not configured.",
      remediation: "Add OPENROUTER_API_KEY to .env.local.",
    };
  }

  const model = process.env.AI_MODEL || "openai/gpt-4o-mini";
  const startTime = Date.now();

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-creator-marketplace.local",
        "X-Title": "AI Content Creator Marketplace",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 2,
      }),
      signal: AbortSignal.timeout(6000),
    });

    const duration = Date.now() - startTime;

    if (res.ok) {
      return {
        service: "OpenRouter Generation (Live Inference)",
        status: "PASS",
        responseTimeMs: duration,
        message: `Chat completion succeeded with model ${model}. Live AI generation active!`,
      };
    } else if (res.status === 402) {
      return {
        service: "OpenRouter Generation (Live Inference)",
        status: "FAIL",
        responseTimeMs: duration,
        message: "Payment Required (HTTP 402): Account credit balance is exhausted.",
        remediation: "Recharge credits at https://openrouter.ai/credits to enable live AI generation.",
      };
    } else if (res.status === 401) {
      return {
        service: "OpenRouter Generation (Live Inference)",
        status: "FAIL",
        responseTimeMs: duration,
        message: "Authentication failed (HTTP 401). Invalid API key.",
        remediation: "Verify key at https://openrouter.ai/keys.",
      };
    } else if (res.status === 429) {
      return {
        service: "OpenRouter Generation (Live Inference)",
        status: "FAIL",
        responseTimeMs: duration,
        message: "Rate limit reached (HTTP 429).",
      };
    } else {
      const errJson = await res.json().catch(() => ({}));
      return {
        service: "OpenRouter Generation (Live Inference)",
        status: "FAIL",
        responseTimeMs: duration,
        message: errJson.error?.message || `HTTP ${res.status}`,
      };
    }
  } catch (err: any) {
    return {
      service: "OpenRouter Generation (Live Inference)",
      status: "FAIL",
      responseTimeMs: Date.now() - startTime,
      message: `Network error: ${err.message}`,
    };
  }
}

export async function testOpenAIGeneration(): Promise<ServiceConnectivityResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!isConfiguredAndNotPlaceholder(key)) {
    return {
      service: "OpenAI Generation (Content Studio)",
      status: "SKIP",
      message: "OPENAI_API_KEY is not configured.",
      remediation: "Add OPENAI_API_KEY to .env.local.",
    };
  }

  const startTime = Date.now();
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 2,
      }),
      signal: AbortSignal.timeout(6000),
    });

    const duration = Date.now() - startTime;
    if (res.ok) {
      return {
        service: "OpenAI Generation (Content Studio)",
        status: "PASS",
        responseTimeMs: duration,
        message: "OpenAI chat completion succeeded with gpt-4o-mini.",
      };
    } else if (res.status === 429) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson.error?.message || "";
      const isQuota = msg.toLowerCase().includes("credit") || msg.toLowerCase().includes("quota");
      return {
        service: "OpenAI Generation (Content Studio)",
        status: "FAIL",
        responseTimeMs: duration,
        message: isQuota
          ? "Quota Exceeded (HTTP 429): Zero credits remaining on OpenAI account."
          : `Rate limited (HTTP 429): ${msg}`,
        remediation: "Add billing credits at https://platform.openai.com/settings/organization/billing.",
      };
    } else {
      const errJson = await res.json().catch(() => ({}));
      return {
        service: "OpenAI Generation (Content Studio)",
        status: "FAIL",
        responseTimeMs: duration,
        message: errJson.error?.message || `HTTP ${res.status}`,
      };
    }
  } catch (err: any) {
    return {
      service: "OpenAI Generation (Content Studio)",
      status: "FAIL",
      responseTimeMs: Date.now() - startTime,
      message: `Network error: ${err.message}`,
    };
  }
}

export async function testGroqGeneration(): Promise<ServiceConnectivityResult> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!isConfiguredAndNotPlaceholder(key)) {
    return {
      service: "Groq Cloud Generation (Alternative)",
      status: "SKIP",
      message: "GROQ_API_KEY is not configured.",
      remediation: "Optional. Add GROQ_API_KEY if testing Groq Cloud provider.",
    };
  }

  const startTime = Date.now();
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 2,
      }),
      signal: AbortSignal.timeout(6000),
    });

    const duration = Date.now() - startTime;
    if (res.ok) {
      return {
        service: "Groq Cloud Generation (Alternative)",
        status: "PASS",
        responseTimeMs: duration,
        message: "Groq completion succeeded with llama-3.3-70b-versatile.",
      };
    } else {
      const errJson = await res.json().catch(() => ({}));
      return {
        service: "Groq Cloud Generation (Alternative)",
        status: "FAIL",
        responseTimeMs: duration,
        message: errJson.error?.message || `HTTP ${res.status}`,
      };
    }
  } catch (err: any) {
    return {
      service: "Groq Cloud Generation (Alternative)",
      status: "FAIL",
      responseTimeMs: Date.now() - startTime,
      message: `Network error: ${err.message}`,
    };
  }
}

export interface FeatureAuditResult {
  feature: string;
  route: string;
  status: "PASS" | "FAIL" | "SKIP";
  liveAiActive: boolean;
  engine: "ai_model" | "heuristic_fallback";
  details: string;
  remediation?: string;
}

export async function auditApplicationAIFeatures(): Promise<FeatureAuditResult[]> {
  const { aiService } = await import("../lib/ai/ai-service");
  const results: FeatureAuditResult[] = [];

  // 1. Campaign Analysis
  try {
    const res = await aiService.analyzeCampaign("Looking for 3 beauty reels with product unboxing in 2 weeks");
    const isLive = !res.isFallback && res.engine === "ai_model";
    results.push({
      feature: "Campaign Brief Parser",
      route: "POST /api/ai/analyze-campaign",
      status: isLive ? "PASS" : "FAIL",
      liveAiActive: isLive,
      engine: res.engine,
      details: isLive
        ? `Live AI generated using ${res.provider}`
        : `Heuristic fallback active. Reason: ${res.fallbackReason || "Unknown"}`,
      remediation: isLive ? undefined : "Add OpenRouter credits at https://openrouter.ai/credits to activate live AI generation.",
    });
  } catch (err: any) {
    results.push({
      feature: "Campaign Brief Parser",
      route: "POST /api/ai/analyze-campaign",
      status: "FAIL",
      liveAiActive: false,
      engine: "heuristic_fallback",
      details: `Execution error: ${err.message}`,
    });
  }

  // 2. Portfolio Analysis
  try {
    const res = await aiService.analyzePortfolio({
      portfolioTitle: "Luxury Botanical Skincare",
      description: "Macro texture product testing with skin hydration gauge meter",
      tools: ["Midjourney v6", "CapCut"],
    });
    const isLive = !res.isFallback && res.engine === "ai_model";
    results.push({
      feature: "Portfolio Evidence Audit",
      route: "POST /api/ai/analyze-portfolio",
      status: isLive ? "PASS" : "FAIL",
      liveAiActive: isLive,
      engine: res.engine,
      details: isLive
        ? `Live AI generated using ${res.provider}`
        : `Heuristic fallback active. Reason: ${res.fallbackReason || "Unknown"}`,
      remediation: isLive ? undefined : "Add OpenRouter credits at https://openrouter.ai/credits to activate live AI generation.",
    });
  } catch (err: any) {
    results.push({
      feature: "Portfolio Evidence Audit",
      route: "POST /api/ai/analyze-portfolio",
      status: "FAIL",
      liveAiActive: false,
      engine: "heuristic_fallback",
      details: `Execution error: ${err.message}`,
    });
  }

  // 3. AI Chatbot
  try {
    const res = await aiService.handleChatWithMetadata([{ role: "user", content: "Best reel hooks" }]);
    const isLive = !res.isFallback && res.engine === "ai_model";
    results.push({
      feature: "AI Advisor & Chatbot",
      route: "POST /api/ai/chat",
      status: isLive ? "PASS" : "FAIL",
      liveAiActive: isLive,
      engine: res.engine,
      details: isLive
        ? `Live AI generated using ${res.provider}`
        : `Heuristic fallback active. Reason: ${res.fallbackReason || "Unknown"}`,
      remediation: isLive ? undefined : "Add OpenRouter credits at https://openrouter.ai/credits to activate live AI generation.",
    });
  } catch (err: any) {
    results.push({
      feature: "AI Advisor & Chatbot",
      route: "POST /api/ai/chat",
      status: "FAIL",
      liveAiActive: false,
      engine: "heuristic_fallback",
      details: `Execution error: ${err.message}`,
    });
  }

  // 4. Content Suggestions
  try {
    const res = await aiService.generateContentSuggestions({
      niche: "Fitness",
      targetAudience: "Busy Professionals",
      platform: "Instagram",
      contentGoal: "Engagement",
      preferredFormat: "Reel",
    });
    const isLive = !res.isFallback && res.engine === "ai_model";
    results.push({
      feature: "Content Suggestions Generator",
      route: "POST /api/ai/content-suggestions",
      status: isLive ? "PASS" : "FAIL",
      liveAiActive: isLive,
      engine: res.engine,
      details: isLive
        ? `Live AI generated using ${res.provider}`
        : `Heuristic fallback active. Reason: ${res.fallbackReason || "Unknown"}`,
      remediation: isLive ? undefined : "Add OpenRouter credits at https://openrouter.ai/credits to activate live AI generation.",
    });
  } catch (err: any) {
    results.push({
      feature: "Content Suggestions Generator",
      route: "POST /api/ai/content-suggestions",
      status: "FAIL",
      liveAiActive: false,
      engine: "heuristic_fallback",
      details: `Execution error: ${err.message}`,
    });
  }

  return results;
}

export async function runAllConnectivityChecks(): Promise<{
  authProbes: ServiceConnectivityResult[];
  inferenceProbes: ServiceConnectivityResult[];
  featureAudits: FeatureAuditResult[];
}> {
  const authProbes: ServiceConnectivityResult[] = [];
  authProbes.push(await testSupabaseConnectivity());
  authProbes.push(await testDatabaseConnectivity());
  authProbes.push(await testOpenRouterConnectivity());
  authProbes.push(await testOpenAIConnectivity());
  authProbes.push(await testGroqConnectivity());

  const inferenceProbes: ServiceConnectivityResult[] = [];
  inferenceProbes.push(await testOpenRouterGeneration());
  inferenceProbes.push(await testOpenAIGeneration());
  inferenceProbes.push(await testGroqGeneration());

  const featureAudits = await auditApplicationAIFeatures();

  return { authProbes, inferenceProbes, featureAudits };
}

if (process.argv[1]?.endsWith("test-connectivity.ts")) {
  runAllConnectivityChecks().then(({ authProbes, inferenceProbes, featureAudits }) => {
    console.log("==================================================");
    console.log("1. EXTERNAL SERVICE AUTHENTICATION & REACHABILITY");
    console.log("==================================================");
    authProbes.forEach((r) => {
      const icon = r.status === "PASS" ? "✅" : r.status === "SKIP" ? "⏭️" : "❌";
      const latency = r.responseTimeMs ? `(${r.responseTimeMs}ms)` : "";
      console.log(`\n${icon} [${r.status}] ${r.service} ${latency}`);
      console.log(`   Message: ${r.message}`);
      if (r.remediation) console.log(`   Action:  ${r.remediation}`);
    });

    console.log("\n==================================================");
    console.log("2. LIVE AI INFERENCE & CREDIT BALANCE CHECKS");
    console.log("==================================================");
    inferenceProbes.forEach((r) => {
      const icon = r.status === "PASS" ? "✅" : r.status === "SKIP" ? "⏭️" : "❌";
      const latency = r.responseTimeMs ? `(${r.responseTimeMs}ms)` : "";
      console.log(`\n${icon} [${r.status}] ${r.service} ${latency}`);
      console.log(`   Message: ${r.message}`);
      if (r.remediation) console.log(`   Action:  ${r.remediation}`);
    });

    console.log("\n==================================================");
    console.log("3. APPLICATION AI FEATURES (GENUINE AI vs FALLBACK)");
    console.log("==================================================");
    featureAudits.forEach((f) => {
      const icon = f.status === "PASS" ? "✅" : f.status === "SKIP" ? "⏭️" : "⚠️";
      console.log(`\n${icon} [${f.status}] ${f.feature} (${f.route})`);
      console.log(`   Engine:  ${f.engine} (Live AI: ${f.liveAiActive ? "YES" : "NO"})`);
      console.log(`   Details: ${f.details}`);
      if (f.remediation) console.log(`   Fix:     ${f.remediation}`);
    });

    console.log("\n==================================================\n");
  });
}
