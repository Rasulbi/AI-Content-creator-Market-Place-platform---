async function verifyLiveRenderDeployment() {
  const liveUrl = "https://ai-content-creator-market-place-platform-awgd.onrender.com";
  console.log(`=======================================================`);
  console.log(`🌐 LIVE PRODUCTION VERIFICATION ON RENDER`);
  console.log(`Host: ${liveUrl}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`=======================================================\n`);

  const results: Record<string, any> = {};

  async function checkEndpoint(
    name: string,
    endpoint: string,
    method: "GET" | "POST",
    body?: any,
    headers?: Record<string, string>
  ) {
    const start = Date.now();
    try {
      const res = await fetch(`${liveUrl}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });
      const duration = Date.now() - start;
      const text = await res.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text.slice(0, 150);
      }

      console.log(
        `[HTTP ${res.status}] ${method} ${endpoint.padEnd(35)} in ${duration}ms -> ${
          res.ok ? "✅ PASS" : res.status === 409 || res.status === 401 || res.status === 422 ? "⚠️ EXPECTED VALIDATION" : "❌ FAIL"
        }`
      );

      results[name] = {
        endpoint,
        method,
        status: res.status,
        durationMs: duration,
        ok: res.ok,
        data: parsed,
      };
      return parsed;
    } catch (err: any) {
      console.log(`[NETWORK ERROR] ${method} ${endpoint}: ${err.message}`);
      results[name] = {
        endpoint,
        method,
        status: "ERROR",
        error: err.message,
      };
      return null;
    }
  }

  // 1. Pages
  console.log("--- 1. Pages Navigation Check ---");
  await checkEndpoint("Homepage", "/", "GET");
  await checkEndpoint("Brand Login Page", "/login/brand", "GET");
  await checkEndpoint("Influencer Login Page", "/login/influencer", "GET");
  await checkEndpoint("Signup Page", "/signup", "GET");
  await checkEndpoint("Brand Dashboard Page", "/brand/dashboard", "GET");
  await checkEndpoint("Creator Dashboard Page", "/creator/dashboard", "GET");
  await checkEndpoint("Creator Public Profile", "/creators/ananya-rao", "GET");
  await checkEndpoint("AI Assistant Page", "/assistant", "GET");

  // 2. Authentication
  console.log("\n--- 2. Live Auth API Check ---");
  await checkEndpoint("Auth Me Session Check", "/api/auth/me", "GET");

  const testEmail = `render_test_${Date.now()}@creator.com`;
  await checkEndpoint(
    "User Registration",
    "/api/auth/register",
    "POST",
    {
      fullName: "Production Verification Tester",
      email: testEmail,
      password: "VerifiedPass123!",
      role: "influencer",
      category: "Tech & AI",
    }
  );

  await checkEndpoint(
    "Duplicate Registration Prevention",
    "/api/auth/register",
    "POST",
    {
      fullName: "Duplicate Tester",
      email: testEmail,
      password: "AnotherPassword123!",
      role: "influencer",
    }
  );

  await checkEndpoint(
    "Valid User Login",
    "/api/auth/login",
    "POST",
    {
      email: testEmail,
      password: "VerifiedPass123!",
      role: "influencer",
    }
  );

  await checkEndpoint(
    "Invalid Credentials Rejection",
    "/api/auth/login",
    "POST",
    {
      email: testEmail,
      password: "WrongPassword123!",
      role: "influencer",
    }
  );

  // 3. AI Endpoints & Fallback Evidence Check
  console.log("\n--- 3. Live AI Endpoints & Genuine vs Fallback Audit ---");
  const advisorData = await checkEndpoint(
    "AI Advisor / Assistant",
    "/api/ai-advisor",
    "POST",
    {
      messages: [{ role: "user", content: "Recommend 2 creators for my skincare campaign" }],
      userContext: { role: "brand", niche: "Beauty & Skincare" },
    }
  );

  const contentData = await checkEndpoint(
    "AI Content Suggestions",
    "/api/ai/content-suggestions",
    "POST",
    {
      niche: "Fitness & Wellness",
      targetAudience: "Young professionals",
      platform: "Instagram Reels",
      contentGoal: "Brand Partnerships",
      preferredFormat: "30s Short-Form Video",
      keywords: "workout, morning routine",
    }
  );

  const profileAuditData = await checkEndpoint(
    "AI Creator Profile Audit",
    "/api/ai/analyze-creator-profile",
    "POST",
    {
      name: "Pooja Verma",
      category: "Beauty & Skincare",
      skills: ["Skincare UGC", "CapCut Pro"],
      portfolioCount: 3,
    }
  );

  const matchData = await checkEndpoint(
    "AI Creator Matching",
    "/api/ai/match-creators",
    "POST",
    {
      campaign: {
        category: "Beauty & Skincare",
        requiredSkills: ["Skincare UGC"],
        budget: { min: 25000, max: 40000 },
        contentType: ["Instagram Reels"],
        platform: ["Instagram"],
      },
    }
  );

  const verifyData = await checkEndpoint(
    "AI Creator Verification",
    "/api/ai/verify-creators",
    "POST",
    {
      brandName: "GlowUp Skincare",
      productName: "Dew Drops Serum",
      category: "Beauty & Skincare",
      platform: "Instagram",
      targetAudience: "Women 18-35",
      contentTypes: ["Reels"],
      budget: "₹30,000",
      deadline: "2 Weeks",
    }
  );

  // 4. V1 Routes Check
  console.log("\n--- 4. V1 REST Routes on Live Deployment ---");
  await checkEndpoint("V1 Campaigns (GET)", "/api/v1/campaigns", "GET");
  await checkEndpoint("V1 Portfolio (GET)", "/api/v1/portfolio", "GET");

  console.log("\n=======================================================");
  console.log("📊 AI GENERATION ENGINES ON LIVE PRODUCTION:");
  console.log("=======================================================");
  if (advisorData) {
    console.log("AI Advisor Engine    :", advisorData.engine || advisorData.data?.engine || "heuristic/hybrid");
    console.log("AI Advisor Provider  :", advisorData.provider || advisorData.data?.provider || "N/A");
    console.log("AI Advisor Fallback  :", advisorData.isFallback ?? advisorData.data?.isFallback ?? "N/A");
  }
  if (contentData) {
    console.log("Content Engine       :", contentData.engine || contentData.data?.engine || "N/A");
    console.log("Content Fallback     :", contentData.isFallback ?? contentData.data?.isFallback ?? "N/A");
    console.log("Fallback Reason      :", contentData.fallbackReason || contentData.data?.fallbackReason || "N/A");
  }
  if (profileAuditData) {
    console.log("Profile Audit Engine :", profileAuditData.engine || profileAuditData.data?.engine || "N/A");
    console.log("Profile Fallback     :", profileAuditData.isFallback ?? profileAuditData.data?.isFallback ?? "N/A");
  }
}

verifyLiveRenderDeployment();
