/**
 * AI Content Creator Marketplace - Skill Passport & Test Engine Store
 * 
 * Manages:
 * 1. Skill Passport with 4-tier Verification Pipeline:
 *    - Claimed (Self-reported skill)
 *    - Portfolio Evidence (Supported by generation prompt & workflow evidence)
 *    - Test Verified (Passed standardized AI benchmark assessment)
 *    - Client Verified (Endorsed by paying brand collaborations)
 * 2. Official AI Benchmark Skill Tests
 * 3. Test Submissions & Auto-Grading Engine
 * 4. Supabase & LocalStorage synchronization
 */

export type VerificationStatus =
  | "Claimed"
  | "Portfolio Evidence"
  | "Test Verified"
  | "Client Verified";

export interface SkillEvidence {
  summary: string;
  submittedDate: string;
  verifiedDate?: string;
  verifiedBy?: string;
  auditBadgeHash?: string;
  criteriaMet: string[];
  externalUrl?: string;
}

export interface SkillTestResult {
  testId: string;
  testName: string;
  score: number;
  maxScore: number;
  passed: boolean;
  takenAt: string;
  certificateId: string;
  benchmarkAccuracy: string;
}

export interface SkillPassportItem {
  id: string;
  creatorId: string;
  skillName: string;
  category: string;
  score: number; // 0 - 100
  status: VerificationStatus;
  evidence: SkillEvidence;
  portfolioProjectIds: string[];
  testResult?: SkillTestResult;
  associatedTools: string[];
}

export interface TestQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SkillTest {
  id: string;
  title: string;
  category: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Master";
  durationMinutes: number;
  passingScore: number; // e.g. 80
  aiToolsCovered: string[];
  rewardBadge: string;
  associatedSkill: string;
  briefScenario: string;
  briefPromptInstructions: string;
  sampleTargetOutput: string;
  questions: TestQuestion[];
}

export interface TestSubmissionRecord {
  id: string;
  testId: string;
  creatorId: string;
  score: number;
  passed: boolean;
  submittedAt: string;
  quizScore: number;
  promptScore: number;
  feedback: string;
  certificateId: string;
  userPrompt: string;
  userParameters: string;
  userWorkflowNotes: string;
}

const PASSPORT_STORAGE_KEY = "ai_marketplace_skill_passport_v2";
const SUBMISSIONS_STORAGE_KEY = "ai_marketplace_test_submissions_v2";

// =========================================================================
// PRESET AI BENCHMARK TESTS CATALOG
// =========================================================================
export const SKILL_TESTS_CATALOG: SkillTest[] = [
  {
    id: "prompt-engineering",
    title: "Advanced Photorealistic Prompt Engineering",
    category: "Generative Imagery",
    description:
      "Benchmark testing syntax precision, aspect ratios, lighting physics, negative token isolation, and CFG scale calibration for Midjourney v6 and Flux.1.",
    difficulty: "Master",
    durationMinutes: 20,
    passingScore: 80,
    aiToolsCovered: ["Midjourney v6", "Flux.1 Dev", "ComfyUI"],
    rewardBadge: "Certified AI Prompt Architect",
    associatedSkill: "AI Image Generation",
    briefScenario:
      "A high-end organic skincare brand requires a photorealistic hero asset showing dew drops on frosted glass packaging with natural early morning sun flare.",
    briefPromptInstructions:
      "Craft a production-ready Midjourney v6 / Flux prompt including camera aperture, lighting style, materials, aspect ratio (--ar), and model version parameters.",
    sampleTargetOutput:
      "Editorial macro shot of organic frosted amber skincare dropper bottle with crystalline morning dew beads, soft rim-lighting, 8k photorealistic, Hasselblad X2D 100C, 90mm lens --ar 4:5 --v 6.0 --stylize 250",
    questions: [
      {
        id: "q1",
        question:
          "In Midjourney v6, which parameter modifier correctly locks the initial noise distribution for deterministic testing across iterations?",
        options: ["--chaos 0", "--seed <number>", "--repeat 1", "--stylize 0"],
        correctIndex: 1,
        explanation:
          "--seed specifies the starting noise seed number, allowing repeatable results when testing minor prompt prompt changes.",
      },
      {
        id: "q2",
        question:
          "What is the primary visual artifact when the Classifier-Free Guidance (CFG) scale is pushed excessively high (>12.0) in diffusion models?",
        options: [
          "Images become blurry and underexposed",
          "Color oversaturation, contrast clipping, and burned edge halos",
          "Resolution is automatically downscaled by half",
          "Generation time triples without visual change",
        ],
        correctIndex: 1,
        explanation:
          "Excessive CFG scales over-constrain the latent space, leading to harsh contrast clipping, burned saturation, and edge artifacts.",
      },
      {
        id: "q3",
        question:
          "When directing photorealistic human portraits in Flux.1 or Midjourney, which prompt strategy avoids the 'plastic airbrushed AI skin' look?",
        options: [
          "Adding 'hyperrealistic, 8k, smooth flawless skin, unreal engine 5'",
          "Specifying optical parameters: 'visible pores, micro-skin texture, subtle asymmetry, 35mm film grain, Hasselblad X2D'",
          "Using maximum --stylize 1000",
          "Repeating the word 'realistic' five times in the prompt header",
        ],
        correctIndex: 1,
        explanation:
          "Specifying natural camera hardware, optical lens depth, and authentic imperfections like pores and film grain produces realistic skin textures without artificial sheen.",
      },
      {
        id: "q4",
        question:
          "What is the function of Negative Prompting in modern diffusion pipelines?",
        options: [
          "It lowers the subscription cost of GPU inference",
          "It penalizes unwanted tokens in the negative latent vector to prevent disfigurement or undesired elements",
          "It flips the image colors to their inverted hex values",
          "It disables text encoding for faster renders",
        ],
        correctIndex: 1,
        explanation:
          "Negative embeddings steer the latent trajectory away from unwanted concepts like extra limbs, blur, watermarks, or text artifacts.",
      },
    ],
  },
  {
    id: "temporal-video",
    title: "Temporal Consistency & Motion Direction",
    category: "AI Video Production",
    description:
      "Validates expertise in Runway Gen-3 Alpha and Kling AI for fluid camera movements, preserving character identity, and eliminating frame flicker.",
    difficulty: "Master",
    durationMinutes: 25,
    passingScore: 80,
    aiToolsCovered: ["Runway Gen-3", "Kling AI", "Luma Dream Machine"],
    rewardBadge: "Certified AI Motion Director",
    associatedSkill: "AI Video Generation",
    briefScenario:
      "Direct a 5-second seamless camera fly-through of a luxury architectural pavilion with water reflections and steady subject movement without morphing.",
    briefPromptInstructions:
      "Specify motion vectors, camera trajectory (e.g. FPV drone tilt down, slow dolly in), frame rate pacing, and prompt phrasing to avoid frame blending.",
    sampleTargetOutput:
      "Cinematic slow forward dolly push, camera gliding 1 meter above still reflecting pool toward brutalist concrete arches, golden hour horizon, steady 24fps motion blur, zero morphing --motion 5",
    questions: [
      {
        id: "q1",
        question:
          "In Runway Gen-3 Alpha, what is the best practice to maintain character consistency across consecutive cuts?",
        options: [
          "Re-generating with completely random text prompts",
          "Using Image-to-Video with high fidelity keyframes and matching camera motion tags",
          "Exporting at lowest resolution to conceal changes",
          "Using maximum motion slider values (+10)",
        ],
        correctIndex: 1,
        explanation:
          "Image-to-Video with reference keyframes and precise camera instructions provides the highest identity preservation in generative video.",
      },
      {
        id: "q2",
        question:
          "What causes 'hallucinated morphing' (limbs merging into backgrounds) in generative video models?",
        options: [
          "Overly complex rapid physical actions exceeding the model's temporal attention window",
          "Slow network connection during upload",
          "Selecting MP4 rather than MOV format",
          "Using aspect ratio 16:9",
        ],
        correctIndex: 0,
        explanation:
          "Complex rapid kinematics often exceed the model's temporal coherence attention window, leading to morphing.",
      },
      {
        id: "q3",
        question:
          "Which camera direction command produces the smoothest visual reveal for an architectural or product hero shot?",
        options: [
          "Erratic handheld shake with sudden zoom bursts",
          "Slow lateral tracking shot or subtle arc dolly with fixed focal lock",
          "Maximum speed 360 spin",
          "Static frame with strobe lighting",
        ],
        correctIndex: 1,
        explanation:
          "Slow lateral tracking and fixed-pivot arc dollies maintain visual landmarks that keep the temporal latent space stable.",
      },
    ],
  },
  {
    id: "voice-synthesis",
    title: "Voice Cloning & Audio-Video Lip Sync",
    category: "Generative Audio",
    description:
      "Examines professional audio mastering in ElevenLabs, voice emotion tuning, SSML pacing tags, and high-fidelity lip-synchronization with Hedra or SyncLabs.",
    difficulty: "Intermediate",
    durationMinutes: 15,
    passingScore: 75,
    aiToolsCovered: ["ElevenLabs", "Hedra", "SyncLabs", "Audacity"],
    rewardBadge: "Certified AI Voice Specialist",
    associatedSkill: "Generative Audio & Lip Sync",
    briefScenario:
      "Generate an empathetic, trustworthy voiceover for a wellness app advertisement with precise pause timing and natural breath intervals.",
    briefPromptInstructions:
      "Provide SSML/punctuation tags, stability and clarity slider calibrations in ElevenLabs, and workflow steps for zero-delay lip-sync.",
    sampleTargetOutput:
      "ElevenLabs Voice Settings: Stability 65%, Similarity Boost 85%, Style Exaggeration 15%. Script: 'Breathe in... [pause 1.2s] and release the tension from your shoulders.'",
    questions: [
      {
        id: "q1",
        question:
          "In ElevenLabs, what is the consequence of setting the 'Stability' slider too low (<30%)?",
        options: [
          "The output voice becomes robotic and monotone",
          "The voice gains dynamic emotional expression but risks hallucinations, crackling, or unintended whispering",
          "The audio file fails to generate",
          "The language automatically switches to Spanish",
        ],
        correctIndex: 1,
        explanation:
          "Low stability introduces extreme vocal inflection and emotional dynamism, but can cause unstable artifacts or vocal cracks.",
      },
      {
        id: "q2",
        question:
          "Which audio sample quality is ideal for training an Instant or Professional Voice Clone?",
        options: [
          "Noisy street interview with heavy background music and reverb",
          "24-bit/48kHz clean studio recording with zero background noise, flat EQ, and dry acoustics",
          "Compressed 64kbps WhatsApp voice note",
          "Speaker shouting in an echoing stadium",
        ],
        correctIndex: 1,
        explanation:
          "Dry studio acoustics with high dynamic range and no reverb yield pristine training weights without noise contamination.",
      },
    ],
  },
  {
    id: "commercial-ugc",
    title: "High-Converting AI UGC Brand Storytelling",
    category: "Commercial Strategy",
    description:
      "Evaluates creative direction for short-form video hooks, retention curves, problem-agitate-solve structures, and AI-assisted b-roll integration.",
    difficulty: "Intermediate",
    durationMinutes: 20,
    passingScore: 80,
    aiToolsCovered: ["CapCut AI", "Midjourney v6", "Claude 3.5", "Runway Gen-3"],
    rewardBadge: "Certified AI UGC Strategist",
    associatedSkill: "UGC",
    briefScenario:
      "Create a 30-second TikTok/Reels UGC concept for a botanical anti-acne serum addressing stubborn breakout scars.",
    briefPromptInstructions:
      "Detail the 3-second visual hook, the problem-agitate transition, the AI b-roll prompt for texture demonstration, and the call-to-action offer.",
    sampleTargetOutput:
      "Hook (0-3s): 'Stop buying vitamin C serums until you see this under a digital dermascope.' AI b-roll: 'Micro-droplet penetration into pores 4k animation'. CTA (25-30s): 20% off launch code with stock counter.",
    questions: [
      {
        id: "q1",
        question:
          "What is the industry benchmark for average 3-second hook retention on high-converting Instagram Reels and TikTok ads?",
        options: ["10% - 20%", "65% - 75%+", "30% - 40%", "99% - 100%"],
        correctIndex: 1,
        explanation:
          "Top-performing direct response creatives maintain 65-75%+ retention past the 3-second hook to qualify high-intent viewers.",
      },
      {
        id: "q2",
        question:
          "Why is pairing AI-generated macro product b-roll with authentic human creator talking-head video effective for UGC?",
        options: [
          "It reduces production costs while combining authentic human social proof with cinematic laboratory visual credibility",
          "It automatically bypasses Meta and TikTok advertising policy review",
          "It guarantees 10 million organic views on day 1",
          "It eliminates the need for any scriptwriting",
        ],
        correctIndex: 0,
        explanation:
          "Human presence provides trust and relatability, while high-production AI macro footage delivers premium brand polish.",
      },
    ],
  },
  {
    id: "inpainting-controlnet",
    title: "Inpainting, ControlNet & Multi-Model Pipelines",
    category: "Advanced Workflows",
    description:
      "Mastery of precision product placement, depth mapping, OpenPose skeleton guidance, mask feathering, and latent space blending in ComfyUI.",
    difficulty: "Master",
    durationMinutes: 25,
    passingScore: 85,
    aiToolsCovered: ["ComfyUI", "ControlNet", "Flux.1", "Photoshop Generative Fill"],
    rewardBadge: "Certified AI Technical Artist",
    associatedSkill: "Style Transfer",
    briefScenario:
      "Replace an arbitrary bottle in a model's hand with an exact branded packaging design while preserving hand finger pose and ambient lighting shadows.",
    briefPromptInstructions:
      "Detail the ControlNet preprocessor used (Depth/Canny/OpenPose), mask feathering radius, inpaint denoise strength (0.3 - 0.7), and prompt weighting.",
    sampleTargetOutput:
      "ControlNet Depth + Canny map locked at 0.8 weight. Inpaint denoise set to 0.42 to preserve hand contact points. Prompt: 'Holding matte black perfume flacon with embossed gold typography, matching rim light'",
    questions: [
      {
        id: "q1",
        question:
          "What is the optimal denoising strength range for inpainting a product label without destroying the surrounding bottle geometry?",
        options: ["0.95 - 1.0", "0.35 - 0.55", "0.05 - 0.10", "1.50 - 2.0"],
        correctIndex: 1,
        explanation:
          "Denoising strength between 0.35 and 0.55 provides enough latent flexibility for the new graphic while locking existing geometry.",
      },
      {
        id: "q2",
        question:
          "Which ControlNet preprocessor is most effective for preserving exact perspective and 3D surface orientation in product compositing?",
        options: [
          "ControlNet Depth (Midas or ZoeDepth)",
          "ControlNet Scribble",
          "ControlNet Tile with random seed",
          "Color Inversion preprocessor",
        ],
        correctIndex: 0,
        explanation:
          "Depth estimation (ZoeDepth/Midas) encodes true 3D spatial surfaces and angles, preventing flattened perspective distortion.",
      },
    ],
  },
];

// =========================================================================
// SEED SKILL PASSPORT ITEMS (Ananya Rao Demo State)
// =========================================================================
const INITIAL_PASSPORT_ITEMS: SkillPassportItem[] = [
  {
    id: "sp-1",
    creatorId: "ananya-rao",
    skillName: "Skincare",
    category: "Domain Expertise",
    score: 98,
    status: "Client Verified",
    associatedTools: ["Sony FX3", "Color Finale", "Digital Moisture Meter"],
    evidence: {
      summary:
        "Commercial collaboration with GlowUp Skincare & Derma Co. Validated by 2.4M view ROI and verified client testimonial.",
      submittedDate: "2026-09-12",
      verifiedDate: "2026-09-24",
      verifiedBy: "Simran T. (Growth Marketing Lead, GlowUp)",
      auditBadgeHash: "0x8F94...B821A",
      criteriaMet: [
        "Verified brand collaboration with formal sign-off",
        "Clinical ingredient accuracy reviewed",
        "Conversion target exceeded by 180%",
      ],
      externalUrl: "https://glowup-skincare.in/campaign-ananya",
    },
    portfolioProjectIds: ["p-1", "p-2"],
    testResult: {
      testId: "commercial-ugc",
      testName: "High-Converting AI UGC Brand Storytelling",
      score: 94,
      maxScore: 100,
      passed: true,
      takenAt: "2026-09-15",
      certificateId: "CERT-UGC-9941",
      benchmarkAccuracy: "96.5% Precision",
    },
  },
  {
    id: "sp-2",
    creatorId: "ananya-rao",
    skillName: "AI Image Generation",
    category: "Generative Imagery",
    score: 96,
    status: "Test Verified",
    associatedTools: ["Midjourney v6", "Flux.1 Dev", "ComfyUI"],
    evidence: {
      summary:
        "Passed standardized benchmark assessment in photorealistic diffusion, lighting physics, and prompt syntax with top 2% percentile score.",
      submittedDate: "2026-09-28",
      verifiedDate: "2026-09-28",
      verifiedBy: "Automated AI Skill Benchmark Engine (v2.4)",
      auditBadgeHash: "0x7E31...D990F",
      criteriaMet: [
        "Passing score ≥ 80% on standardized benchmark",
        "Deterministic noise seed mastery verified",
        "Zero hallucination artifact grading passed",
      ],
    },
    portfolioProjectIds: ["p-1"],
    testResult: {
      testId: "prompt-engineering",
      testName: "Advanced Photorealistic Prompt Engineering",
      score: 96,
      maxScore: 100,
      passed: true,
      takenAt: "2026-09-28",
      certificateId: "CERT-MJ6-8891",
      benchmarkAccuracy: "98.2% Parameter Precision",
    },
  },
  {
    id: "sp-3",
    creatorId: "ananya-rao",
    skillName: "Product Reviews",
    category: "Commercial Strategy",
    score: 95,
    status: "Client Verified",
    associatedTools: ["Runway Gen-2", "Lightroom", "ElevenLabs"],
    evidence: {
      summary:
        "Endorsed by Derma Co for clinical ingredient breakdown and before-and-after demonstration video.",
      submittedDate: "2026-09-02",
      verifiedDate: "2026-09-10",
      verifiedBy: "Arjun M. (Brand Partnerships, Derma Co)",
      auditBadgeHash: "0x4A18...E327C",
      criteriaMet: [
        "Third-party client rating: 4.8 / 5.0",
        "Zero-whitecast sunscreen video selected as Meta Ad Creative",
        "Active ingredient claims cross-checked against lab assays",
      ],
    },
    portfolioProjectIds: ["p-2"],
  },
  {
    id: "sp-4",
    creatorId: "ananya-rao",
    skillName: "Instagram Reels",
    category: "Content Production",
    score: 92,
    status: "Portfolio Evidence",
    associatedTools: ["CapCut Pro", "Sony FX3", "DaVinci Resolve"],
    evidence: {
      summary:
        "Supported by 2 published portfolio campaigns with documented prompt evolution logs, 4K render proofs, and 3.5M+ total organic impressions.",
      submittedDate: "2026-09-18",
      auditBadgeHash: "0x3D90...C119E",
      criteriaMet: [
        "Prompt engineering workflow log submitted",
        "Raw timeline screencast verified",
        "Organic view engagement analytics verified",
      ],
    },
    portfolioProjectIds: ["p-1", "p-2"],
  },
  {
    id: "sp-5",
    creatorId: "ananya-rao",
    skillName: "UGC",
    category: "Commercial Strategy",
    score: 90,
    status: "Portfolio Evidence",
    associatedTools: ["ElevenLabs", "Runway Gen-2", "CapCut Pro"],
    evidence: {
      summary:
        "Clean beauty UGC campaign for Suncare India with 1.1M views, 14K saves, and ElevenLabs custom voice clone.",
      submittedDate: "2026-09-22",
      auditBadgeHash: "0x2C44...AA10D",
      criteriaMet: [
        "Macro texture analysis workflow documented",
        "Problem-agitate-solve script breakdown provided",
      ],
    },
    portfolioProjectIds: ["p-2"],
  },
  {
    id: "sp-6",
    creatorId: "ananya-rao",
    skillName: "Beauty Lighting",
    category: "Creative Direction",
    score: 88,
    status: "Test Verified",
    associatedTools: ["Midjourney v6", "Color Finale", "Aputure Amaran"],
    evidence: {
      summary:
        "Verified via Advanced Prompt Engineering test module on subsurface scattering, rim lighting, and cosmetic color temperature.",
      submittedDate: "2026-09-29",
      verifiedDate: "2026-09-29",
      verifiedBy: "Automated AI Skill Benchmark Engine (v2.4)",
      auditBadgeHash: "0x99A1...FE211",
      criteriaMet: [
        "Subsurface scattering prompt calibration verified",
        "Kelvin temperature accuracy confirmed",
      ],
    },
    portfolioProjectIds: ["p-1"],
    testResult: {
      testId: "prompt-engineering",
      testName: "Advanced Photorealistic Prompt Engineering",
      score: 92,
      maxScore: 100,
      passed: true,
      takenAt: "2026-09-29",
      certificateId: "CERT-LGT-7721",
      benchmarkAccuracy: "94.0% Consistency",
    },
  },
  {
    id: "sp-7",
    creatorId: "ananya-rao",
    skillName: "Ingredient Analysis",
    category: "Domain Expertise",
    score: 74,
    status: "Claimed",
    associatedTools: ["Claude 3.5 Sonnet", "PubMed AI Assistant"],
    evidence: {
      summary:
        "Self-declared clinical active ingredient comprehension. Ready to upgrade with client brief submission or benchmark test.",
      submittedDate: "2026-10-01",
      criteriaMet: ["Self-reported skill statement submitted"],
    },
    portfolioProjectIds: [],
  },
  {
    id: "sp-8",
    creatorId: "ananya-rao",
    skillName: "AI Video Generation",
    category: "AI Video Production",
    score: 72,
    status: "Claimed",
    associatedTools: ["Runway Gen-3", "Kling AI", "Luma Dream Machine"],
    evidence: {
      summary:
        "Claimed proficiency in Runway Gen-3 and Kling AI. Ready to take benchmark test to achieve Test Verified status.",
      submittedDate: "2026-10-03",
      criteriaMet: ["Claimed profile skill tag"],
    },
    portfolioProjectIds: [],
  },
];

// =========================================================================
// STORE GETTERS & MUTATORS
// =========================================================================

/**
 * Retrieves the Skill Passport items for a given creator
 */
export function getStoredSkillPassport(creatorId: string = "ananya-rao"): SkillPassportItem[] {
  if (typeof window === "undefined") {
    return INITIAL_PASSPORT_ITEMS.filter((item) => item.creatorId === creatorId);
  }

  try {
    const raw = localStorage.getItem(PASSPORT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SkillPassportItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((item) => item.creatorId === creatorId);
      }
    }
  } catch (e) {
    console.error("Failed to read skill passport from localStorage", e);
  }

  // Fallback to initial seed items
  return INITIAL_PASSPORT_ITEMS.filter((item) => item.creatorId === creatorId);
}

/**
 * Persists all Skill Passport items
 */
export function saveStoredSkillPassport(items: SkillPassportItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("skill-passport-updated"));
  } catch (e) {
    console.error("Failed to save skill passport", e);
  }
}

/**
 * Retrieves all items across all creators
 */
export function getAllPassportItems(): SkillPassportItem[] {
  if (typeof window === "undefined") {
    return INITIAL_PASSPORT_ITEMS;
  }
  try {
    const raw = localStorage.getItem(PASSPORT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SkillPassportItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_e) {}
  return INITIAL_PASSPORT_ITEMS;
}

/**
 * Adds a new Claimed skill to the creator's Skill Passport
 */
export function addSkillToPassport(
  creatorId: string,
  skillName: string,
  category: string = "AI Creative Discipline",
  associatedTools: string[] = []
): SkillPassportItem {
  const trimmed = skillName.trim();
  const all = getAllPassportItems();

  const existing = all.find(
    (item) => item.creatorId === creatorId && item.skillName.toLowerCase() === trimmed.toLowerCase()
  );

  if (existing) {
    return existing;
  }

  const newItem: SkillPassportItem = {
    id: `sp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    creatorId,
    skillName: trimmed,
    category,
    score: 70,
    status: "Claimed",
    associatedTools,
    evidence: {
      summary: `Self-declared ${trimmed} competency. Ready to upload portfolio evidence or take a skill test to unlock verification badges.`,
      submittedDate: new Date().toISOString().split("T")[0],
      criteriaMet: ["Self-reported skill badge"],
    },
    portfolioProjectIds: [],
  };

  const updated = [newItem, ...all];
  saveStoredSkillPassport(updated);
  return newItem;
}

/**
 * Links a portfolio project to an existing skill and upgrades status to 'Portfolio Evidence' if it was 'Claimed'
 */
export function linkProjectToSkill(
  creatorId: string,
  skillName: string,
  projectId: string,
  evidenceNotes?: string
): SkillPassportItem | null {
  const all = getAllPassportItems();
  const index = all.findIndex(
    (item) => item.creatorId === creatorId && item.skillName.toLowerCase() === skillName.toLowerCase()
  );

  if (index === -1) {
    // If skill didn't exist in passport yet, create it directly with Portfolio Evidence
    const newItem: SkillPassportItem = {
      id: `sp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      creatorId,
      skillName,
      category: "Portfolio Discipline",
      score: 85,
      status: "Portfolio Evidence",
      associatedTools: ["Generative Studio Tools"],
      evidence: {
        summary: evidenceNotes || `Backed by verified portfolio project #${projectId} with prompt logs.`,
        submittedDate: new Date().toISOString().split("T")[0],
        criteriaMet: ["Prompt engineering workflow log submitted", "Portfolio asset verified"],
        auditBadgeHash: `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
      },
      portfolioProjectIds: [projectId],
    };
    saveStoredSkillPassport([newItem, ...all]);
    return newItem;
  }

  const existing = all[index];
  const projectIds = Array.from(new Set([...existing.portfolioProjectIds, projectId]));

  // Upgrade status from Claimed -> Portfolio Evidence if not already higher
  let newStatus = existing.status;
  let newScore = existing.score;
  if (existing.status === "Claimed") {
    newStatus = "Portfolio Evidence";
    newScore = Math.max(existing.score, 88);
  }

  const updatedItem: SkillPassportItem = {
    ...existing,
    status: newStatus,
    score: newScore,
    portfolioProjectIds: projectIds,
    evidence: {
      ...existing.evidence,
      summary:
        evidenceNotes ||
        existing.evidence.summary ||
        `Verified with portfolio project #${projectId}.`,
      auditBadgeHash: existing.evidence.auditBadgeHash || `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
      criteriaMet: Array.from(
        new Set([...existing.evidence.criteriaMet, "Portfolio demonstration asset attached"])
      ),
    },
  };

  all[index] = updatedItem;
  saveStoredSkillPassport(all);
  return updatedItem;
}

/**
 * Upgrades a skill to 'Test Verified' when a benchmark test is passed
 */
export function recordTestPassedInPassport(
  creatorId: string,
  associatedSkill: string,
  testResult: SkillTestResult,
  customScore?: number
): SkillPassportItem {
  const all = getAllPassportItems();
  const index = all.findIndex(
    (item) => item.creatorId === creatorId && item.skillName.toLowerCase() === associatedSkill.toLowerCase()
  );

  const finalScore = customScore || testResult.score;

  if (index === -1) {
    const newItem: SkillPassportItem = {
      id: `sp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      creatorId,
      skillName: associatedSkill,
      category: "Benchmark Verified",
      score: finalScore,
      status: "Test Verified",
      associatedTools: ["Official AI Assessment Benchmarks"],
      evidence: {
        summary: `Passed official standardized test '${testResult.testName}' with a score of ${testResult.score}% (${testResult.benchmarkAccuracy}).`,
        submittedDate: testResult.takenAt,
        verifiedDate: testResult.takenAt,
        verifiedBy: "Automated AI Skill Benchmark Engine (v2.4)",
        auditBadgeHash: `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
        criteriaMet: [
          `Passed standardized assessment with score ${testResult.score}%`,
          `Certificate: ${testResult.certificateId}`,
          "Verified prompt engineering execution",
        ],
      },
      portfolioProjectIds: [],
      testResult,
    };
    saveStoredSkillPassport([newItem, ...all]);
    return newItem;
  }

  const current = all[index];
  // If already Client Verified, keep Client Verified status, but attach the test result and boost score
  const newStatus: VerificationStatus =
    current.status === "Client Verified" ? "Client Verified" : "Test Verified";

  const updatedItem: SkillPassportItem = {
    ...current,
    status: newStatus,
    score: Math.max(current.score, finalScore),
    testResult,
    evidence: {
      ...current.evidence,
      verifiedDate: testResult.takenAt,
      verifiedBy: "Automated AI Skill Benchmark Engine (v2.4)",
      auditBadgeHash: current.evidence.auditBadgeHash || `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
      criteriaMet: Array.from(
        new Set([
          ...current.evidence.criteriaMet,
          `Passed official benchmark test: ${testResult.testName} (${testResult.score}%)`,
          `Certificate ${testResult.certificateId} issued`,
        ])
      ),
    },
  };

  all[index] = updatedItem;
  saveStoredSkillPassport(all);
  return updatedItem;
}

/**
 * Saves a test submission record
 */
export function saveTestSubmission(record: TestSubmissionRecord): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
    const existing: TestSubmissionRecord[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify([record, ...existing]));
  } catch (e) {
    console.error("Failed to save test submission", e);
  }
}

/**
 * Retrieves all previous test submissions for a creator
 */
export function getTestSubmissions(creatorId: string = "ananya-rao"): TestSubmissionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
    if (raw) {
      const list: TestSubmissionRecord[] = JSON.parse(raw);
      return list.filter((r) => r.creatorId === creatorId);
    }
  } catch (_e) {}
  return [];
}

/**
 * Computes overall aggregated Skill Passport stats
 */
export function calculatePassportSummary(items: SkillPassportItem[]) {
  if (!items || items.length === 0) {
    return {
      overallScore: 0,
      totalSkills: 0,
      claimedCount: 0,
      portfolioEvidenceCount: 0,
      testVerifiedCount: 0,
      clientVerifiedCount: 0,
      completionRate: 0,
      tierBadge: "Unranked",
    };
  }

  let totalScore = 0;
  let claimedCount = 0;
  let portfolioEvidenceCount = 0;
  let testVerifiedCount = 0;
  let clientVerifiedCount = 0;

  for (const item of items) {
    totalScore += item.score;
    if (item.status === "Claimed") claimedCount++;
    else if (item.status === "Portfolio Evidence") portfolioEvidenceCount++;
    else if (item.status === "Test Verified") testVerifiedCount++;
    else if (item.status === "Client Verified") clientVerifiedCount++;
  }

  const averageScore = Math.round(totalScore / items.length);
  const verifiedCount = portfolioEvidenceCount + testVerifiedCount + clientVerifiedCount;
  const completionRate = Math.round((verifiedCount / items.length) * 100);

  let tierBadge = "Standard Creator";
  if (averageScore >= 95 && clientVerifiedCount >= 2) tierBadge = "Elite Master AI Creator";
  else if (averageScore >= 90) tierBadge = "Verified Professional AI Creator";
  else if (averageScore >= 80) tierBadge = "Certified AI Practitioner";

  return {
    overallScore: averageScore,
    totalSkills: items.length,
    claimedCount,
    portfolioEvidenceCount,
    testVerifiedCount,
    clientVerifiedCount,
    completionRate,
    tierBadge,
  };
}
