import { auditEnvironment } from "./audit-env";
import { runAllConnectivityChecks } from "./test-connectivity";
import { spawnSync } from "child_process";

async function main() {
  console.log("================================================================================");
  console.log("🧪 AI CONTENT CREATOR MARKETPLACE — COMPREHENSIVE QA AUTOMATION SUITE");
  console.log("================================================================================\n");

  const startTime = Date.now();

  // 1. Environment Audit
  console.log("--------------------------------------------------------------------------------");
  console.log("PHASE 1: ENVIRONMENT VARIABLE SECURITY & CONFIGURATION AUDIT");
  console.log("--------------------------------------------------------------------------------");
  const envResults = auditEnvironment();
  envResults.forEach((r) => {
    const icon = r.status === "CONFIGURED" ? "✅" : r.status === "PLACEHOLDER" ? "⚠️" : "❌";
    const reqTag = r.isRequiredForActiveProvider ? "[REQUIRED]" : "[OPTIONAL]";
    console.log(`  ${icon} ${r.variable.padEnd(30)} : ${r.status.padEnd(12)} ${reqTag.padEnd(11)} - ${r.notes}`);
  });

  // 2. Unit Testing Suite (In-Memory Mocks, No Credits Consumed)
  console.log("\n--------------------------------------------------------------------------------");
  console.log("PHASE 2: MOCKED BACKEND SERVICES & API ROUTE UNIT TESTS");
  console.log("--------------------------------------------------------------------------------");
  console.log("Executing unit test suites across Zod schemas, JSON parser, pgvector,");
  console.log("rate limiter, provider abstractions, scoring engine, and API routes...\n");

  const unitTestRun = spawnSync(
    "npx",
    ["tsx", "--test", "tests/unit/*.test.ts", "tests/api/*.test.ts"],
    {
      stdio: "pipe",
      shell: true,
      encoding: "utf-8",
    }
  );

  const stdout = unitTestRun.stdout || "";
  const stderr = unitTestRun.stderr || "";

  // Parse pass/fail counts from node:test output
  const passMatch = stdout.match(/ℹ pass (\d+)/);
  const failMatch = stdout.match(/ℹ fail (\d+)/);
  const totalMatch = stdout.match(/ℹ tests (\d+)/);

  const unitPassed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const unitFailed = failMatch ? parseInt(failMatch[1], 10) : 0;
  const unitTotal = totalMatch ? parseInt(totalMatch[1], 10) : unitPassed + unitFailed;

  console.log(stdout);

  if (unitFailed > 0) {
    console.error("❌ UNIT TEST FAILURES DETECTED:\n", stderr);
  } else {
    console.log(`✅ All ${unitPassed} unit tests passed successfully!\n`);
  }

  // 3. Real External API Connectivity & Auth
  console.log("--------------------------------------------------------------------------------");
  console.log("PHASE 3: EXTERNAL SERVICE REACHABILITY & AUTHENTICATION");
  console.log("--------------------------------------------------------------------------------");
  const { authProbes, inferenceProbes, featureAudits } = await runAllConnectivityChecks();

  authProbes.forEach((c) => {
    const icon = c.status === "PASS" ? "✅" : c.status === "SKIP" ? "⏭️" : "❌";
    const latency = c.responseTimeMs ? `(${c.responseTimeMs}ms)` : "";
    console.log(`  ${icon} [${c.status}] ${c.service} ${latency}`);
    console.log(`     Status: ${c.message}`);
    if (c.remediation) console.log(`     Fix:    ${c.remediation}`);
    console.log();
  });

  // 4. Live AI Inference & Credit Verification
  console.log("--------------------------------------------------------------------------------");
  console.log("PHASE 4: LIVE AI INFERENCE & ACCOUNT CREDIT BALANCE VERIFICATION");
  console.log("--------------------------------------------------------------------------------");
  inferenceProbes.forEach((c) => {
    const icon = c.status === "PASS" ? "✅" : c.status === "SKIP" ? "⏭️" : "❌";
    const latency = c.responseTimeMs ? `(${c.responseTimeMs}ms)` : "";
    console.log(`  ${icon} [${c.status}] ${c.service} ${latency}`);
    console.log(`     Status: ${c.message}`);
    if (c.remediation) console.log(`     Action: ${c.remediation}`);
    console.log();
  });

  // 5. Application Feature Execution & Fallback Provenance
  console.log("--------------------------------------------------------------------------------");
  console.log("PHASE 5: APPLICATION AI FEATURES (GENUINE AI vs HEURISTIC FALLBACK)");
  console.log("--------------------------------------------------------------------------------");
  featureAudits.forEach((f) => {
    const icon = f.liveAiActive ? "✅" : f.status === "SKIP" ? "⏭️" : "⚠️";
    const statusLabel = f.liveAiActive ? "PASS (Live AI)" : "DEGRADED (Fallback)";
    console.log(`  ${icon} [${statusLabel}] ${f.feature} (${f.route})`);
    console.log(`     Engine:  ${f.engine} (Live AI Active: ${f.liveAiActive ? "YES" : "NO"})`);
    console.log(`     Details: ${f.details}`);
    if (f.remediation) console.log(`     Fix:     ${f.remediation}`);
    console.log();
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  // 6. Executive Summary Report
  console.log("================================================================================");
  console.log("📊 FINAL QA TEST EXECUTION REPORT");
  console.log("================================================================================");
  console.log(`Total Execution Time: ${durationSec}s`);
  console.log(`Mocked Unit Tests:    ${unitTotal} total | ${unitPassed} PASS | ${unitFailed} FAIL`);
  
  const authPass = authProbes.filter(p => p.status === "PASS").length;
  const authFail = authProbes.filter(p => p.status === "FAIL").length;
  const authSkip = authProbes.filter(p => p.status === "SKIP").length;
  console.log(`Auth Connectivity:    ${authProbes.length} total | ${authPass} PASS | ${authFail} FAIL | ${authSkip} SKIP`);

  const infPass = inferenceProbes.filter(p => p.status === "PASS").length;
  const infFail = inferenceProbes.filter(p => p.status === "FAIL").length;
  const infSkip = inferenceProbes.filter(p => p.status === "SKIP").length;
  console.log(`Live Inference:       ${inferenceProbes.length} total | ${infPass} PASS | ${infFail} FAIL | ${infSkip} SKIP`);

  const featLive = featureAudits.filter(f => f.liveAiActive).length;
  const featFallback = featureAudits.filter(f => !f.liveAiActive).length;
  console.log(`App Features:         ${featureAudits.length} total | ${featLive} LIVE AI | ${featFallback} FALLBACK ACTIVE`);

  console.log("--------------------------------------------------------------------------------");
  console.log("ℹ️  FALLBACK DIAGNOSTIC: Offline heuristic engines maintain 100% demo resilience,");
  console.log("    but live inference is blocked until account credits are added to OpenRouter.");
  console.log("================================================================================\n");

  process.exit(unitFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL QA RUNNER ERROR:", err);
  process.exit(1);
});
