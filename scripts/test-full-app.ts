async function verifyAll() {
  console.log("==================================================");
  console.log("🧪 AI CONTENT CREATOR MARKETPLACE - FULL VERIFICATION");
  console.log("==================================================");

  const baseUrl = "http://localhost:3000";

  // 1. Pages check
  const routes = [
    "/",
    "/signup",
    "/login/brand",
    "/login/influencer",
    "/brand/dashboard",
    "/creator/dashboard",
    "/creators/ananya-rao",
  ];

  for (const route of routes) {
    try {
      const res = await fetch(`${baseUrl}${route}`);
      console.log(`Page ${route.padEnd(22)} : HTTP ${res.status} ${res.ok ? "✅ OK" : "❌ FAIL"}`);
    } catch (e: any) {
      console.log(`Page ${route.padEnd(22)} : ERROR ${e.message}`);
    }
  }

  // 2. Auth API check (duplicate prevention & registration)
  console.log("\n--- Testing Authentication & Password Hashing ---");
  const testEmail = `test_${Date.now()}@creator.com`;
  
  // Register new creator
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Pooja Verma",
      email: testEmail,
      password: "StrongPass123!",
      role: "influencer",
      category: "Beauty & Skincare",
    }),
  });
  const regData = await regRes.json();
  console.log(`Register new user      : HTTP ${regRes.status} (Success: ${regData.success})`);

  // Duplicate registration attempt
  const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Duplicate User",
      email: testEmail,
      password: "AnotherPassword123!",
      role: "influencer",
    }),
  });
  const dupData = await dupRes.json();
  console.log(`Prevent duplicate reg  : HTTP ${dupRes.status} (Expected 409: ${dupRes.status === 409 ? "✅ Blocked Duplicate" : "❌"})`);

  // Login with correct credentials
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "StrongPass123!",
      role: "influencer",
    }),
  });
  const loginData = await loginRes.json();
  console.log(`Login correct password : HTTP ${loginRes.status} (User: ${loginData.user?.name})`);

  // Login with wrong password
  const wrongLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "WrongPassword123!",
      role: "influencer",
    }),
  });
  console.log(`Reject wrong password  : HTTP ${wrongLoginRes.status} (Expected 401: ${wrongLoginRes.status === 401 ? "✅ Rejected" : "❌"})`);

  // 3. AI Endpoints Check
  console.log("\n--- Testing AI Endpoints ---");

  // A. AI Profile Analysis
  const auditRes = await fetch(`${baseUrl}/api/ai/analyze-creator-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Pooja Verma",
      category: "Beauty & Skincare",
      skills: ["Skincare", "Beauty Storytelling", "CapCut Pro"],
      portfolioCount: 3,
      portfolioSamples: [
        { title: "Hydra Serum", description: "Macro video", tools: ["CapCut", "Sony FX3"] },
      ],
      engagementRate: "7.8%",
      platforms: ["Instagram"],
    }),
  });
  const auditData = await auditRes.json();
  console.log(`AI Creator Profile Audit: HTTP ${auditRes.status} (Readiness: ${auditData.data?.overallReadinessScore}%)`);

  // Incomplete profile check
  const emptyAuditRes = await fetch(`${baseUrl}/api/ai/analyze-creator-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Empty Profile",
      category: "Beauty & Skincare",
      skills: [],
    }),
  });
  const emptyAuditData = await emptyAuditRes.json();
  console.log(`Catch Incomplete Profile: HTTP ${emptyAuditRes.status} (Incomplete flagged: ${emptyAuditData.incomplete ? "✅ Yes" : "❌"})`);

  // B. AI Chatbot
  const chatRes = await fetch(`${baseUrl}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Suggest 3 viral hooks for my skincare reels" }],
      userContext: { role: "influencer", niche: "Beauty & Skincare" },
    }),
  });
  const chatData = await chatRes.json();
  console.log(`AI Chatbot Assistant   : HTTP ${chatRes.status} (Reply length: ${chatData.message?.length} chars)`);

  // C. AI Content Suggestions
  const contentRes = await fetch(`${baseUrl}/api/ai/content-suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      niche: "Beauty & Skincare",
      targetAudience: "Women 18-35",
      platform: "Instagram Reels",
      contentGoal: "Brand Collaboration",
      preferredFormat: "30s Short-Form Video",
      keywords: "serum, glowing skin",
    }),
  });
  const contentData = await contentRes.json();
  console.log(`AI Content Suggestions : HTTP ${contentRes.status} (Generated concepts: ${contentData.data?.suggestions?.length})`);

  // D. Campaign Analysis & Creator Matching
  const campRes = await fetch(`${baseUrl}/api/ai/analyze-campaign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brief: "Looking for a skincare creator for 3 Instagram Reels with CapCut and high engagement",
    }),
  });
  const campData = await campRes.json();

  const matchRes = await fetch(`${baseUrl}/api/ai/match-creators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaign: campData.data }),
  });
  const matchData = await matchRes.json();
  console.log(`AI Creator Matching    : HTTP ${matchRes.status} (Candidates ranked: ${matchData.data?.length})`);

  console.log("\n==================================================");
  console.log("🎉 ALL INTEGRATION & VERIFICATION TESTS COMPLETED!");
  console.log("==================================================");
}

verifyAll();
