/**
 * Server-Authoritative Skill Test Catalog & Answer Keys
 * 
 * CRITICAL SECURITY BOUNDARY:
 * This file contains confidential test answer keys (correctIndex) and assessment explanations.
 * It must NEVER be imported into client components or exposed in client bundles.
 */

export interface AuthoritativeTestQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AuthoritativeSkillTest {
  id: string;
  title: string;
  category: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Master";
  durationMinutes: number;
  passingScore: number;
  aiToolsCovered: string[];
  rewardBadge: string;
  associatedSkill: string;
  briefScenario: string;
  briefPromptInstructions: string;
  sampleTargetOutput: string;
  questions: AuthoritativeTestQuestion[];
}

export interface SanitizedTestQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface SanitizedSkillTest {
  id: string;
  title: string;
  category: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Master";
  durationMinutes: number;
  passingScore: number;
  aiToolsCovered: string[];
  rewardBadge: string;
  associatedSkill: string;
  briefScenario: string;
  briefPromptInstructions: string;
  sampleTargetOutput: string;
  questions: SanitizedTestQuestion[];
}

export const AUTHORITATIVE_SKILL_TESTS: AuthoritativeSkillTest[] = [
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

/**
 * Returns sanitized tests safe for client delivery (excludes correctIndex and explanation).
 */
export function getSanitizedSkillTests(): SanitizedSkillTest[] {
  return AUTHORITATIVE_SKILL_TESTS.map((test) => ({
    ...test,
    questions: test.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
    })),
  }));
}

/**
 * Returns a single sanitized test by ID or slug.
 */
export function getSanitizedSkillTest(testId: string): SanitizedSkillTest | null {
  const found = AUTHORITATIVE_SKILL_TESTS.find(
    (t) => t.id === testId || t.title.toLowerCase().includes(testId.toLowerCase())
  );
  if (!found) return null;
  return {
    ...found,
    questions: found.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
    })),
  };
}

/**
 * Retrieves the authoritative test with answer keys (SERVER USE ONLY).
 */
export function getAuthoritativeSkillTest(testId: string): AuthoritativeSkillTest | null {
  return (
    AUTHORITATIVE_SKILL_TESTS.find(
      (t) => t.id === testId || t.title.toLowerCase().includes(testId.toLowerCase())
    ) || null
  );
}
