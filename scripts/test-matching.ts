import { CREATORS_DATA } from "../lib/creators-data";
import { CAMPAIGN_PRESETS, rankCreatorsForCampaign } from "../lib/ai-matching";

console.log("=== Testing AI Creator Matching Module ===");

for (const preset of CAMPAIGN_PRESETS) {
  const ranked = rankCreatorsForCampaign(CREATORS_DATA, preset);
  console.log(`\n========================================`);
  console.log(`🎯 Campaign: ${preset.title} [Target Category: ${preset.category}]`);
  console.log(`🥇 #1 Ranked: ${ranked[0].name} (${ranked[0].category}) — ${ranked[0].match.totalScore}% Match`);
  console.log(`   Reasons: ${ranked[0].match.reasons.slice(0, 2).join(" | ")}`);
  console.log(`   Scoring Breakdown: Skill=${ranked[0].match.breakdown.skillMatch}% | Verif=${ranked[0].match.breakdown.verification}% | Port=${ranked[0].match.breakdown.portfolio}% | Exp=${ranked[0].match.breakdown.experience}% | Rating=${ranked[0].match.breakdown.clientRating}%`);
  console.log(`   Complete Ranking Order:`);
  ranked.forEach((c, idx) => {
    console.log(`     ${idx + 1}. ${c.name} (${c.category}) — ${c.match.totalScore}% Match`);
  });
}
