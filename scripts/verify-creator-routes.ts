import assert from "node:assert/strict";
import { resolveCreatorProfile, generateMetadata } from "../app/creators/[id]/page";

async function runVerification() {
  console.log("=== Testing /creators/[id] Route Resolution ===");

  // 1. Valid creator 1: ananya-rao
  const ananya = await resolveCreatorProfile("ananya-rao");
  assert.ok(ananya, "Expected ananya-rao profile to resolve");
  assert.equal(ananya.name, "Ananya Rao");
  console.log("✔ ananya-rao resolved:", ananya.name, "-", ananya.professionalTitle);

  // 2. Valid creator 2: devansh-malhotra (one of the routes mentioned in build error)
  const devansh = await resolveCreatorProfile("devansh-malhotra");
  assert.ok(devansh, "Expected devansh-malhotra profile to resolve");
  assert.equal(devansh.name, "Devansh Malhotra");
  console.log("✔ devansh-malhotra resolved:", devansh.name, "-", devansh.professionalTitle);

  // 3. Valid creator 3: ankit-viper (one of the routes mentioned in build error)
  const ankit = await resolveCreatorProfile("ankit-viper");
  assert.ok(ankit, "Expected ankit-viper profile to resolve");
  assert.ok(ankit.name.includes("Viper"));
  console.log("✔ ankit-viper resolved:", ankit.name, "-", ankit.professionalTitle);

  // 4. Unknown creator ID
  const unknown = await resolveCreatorProfile("non-existent-creator-12345");
  assert.equal(unknown, null, "Expected unknown creator to return null");
  console.log("✔ unknown ID gracefully returned null");

  // 5. Test generateMetadata for valid creator
  const metaValid = await generateMetadata({ params: Promise.resolve({ id: "ananya-rao" }) });
  assert.ok(metaValid.title?.toString().includes("Ananya Rao"));
  console.log("✔ generateMetadata for valid creator:", metaValid.title);

  // 6. Test generateMetadata for unknown creator
  const metaUnknown = await generateMetadata({ params: Promise.resolve({ id: "non-existent-creator-12345" }) });
  assert.equal(metaUnknown.title, "Creator Not Found - AI Creator Marketplace");
  console.log("✔ generateMetadata for unknown creator:", metaUnknown.title);

  console.log("\nAll /creators/[id] route resolution checks passed successfully!");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
