import { z } from "zod";

export const SUPPORTED_LANGUAGE_CODES = [
  "auto",
  "en",
  "te",
  "hi",
  "ta",
  "kn",
  "ml",
  "mr",
  "bn",
  "es",
  "fr",
  "ar",
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export const SupportedLanguageSchema = z.enum(SUPPORTED_LANGUAGE_CODES);

export interface LanguageOption {
  code: SupportedLanguageCode;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  script?: string;
  flag?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "auto", name: "Auto-detect", nativeName: "Auto-detect", dir: "ltr" },
  { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", dir: "ltr", script: "Telugu" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr", script: "Devanagari" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", dir: "ltr", script: "Tamil" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", dir: "ltr", script: "Kannada" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", dir: "ltr", script: "Malayalam" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", dir: "ltr", script: "Devanagari" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", dir: "ltr", script: "Bengali" },
  { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", dir: "ltr" },
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl", script: "Arabic" },
];

export function getLanguageMetadata(code: string): LanguageOption {
  const match = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return match || SUPPORTED_LANGUAGES[1]; // default English
}

export interface LanguageDetectionResult {
  detectedLanguage: SupportedLanguageCode;
  confidence: number;
  isCodeSwitching: boolean;
  dialect?: string;
  matchedTokens?: string[];
}

/**
 * Script Regex Ranges for Unicode identification
 */
const SCRIPT_RANGES = {
  telugu: /[\u0C00-\u0C7F]/,
  tamil: /[\u0B80-\u0BFF]/,
  kannada: /[\u0C80-\u0CFF]/,
  malayalam: /[\u0D00-\u0D7F]/,
  bengali: /[\u0980-\u09FF]/,
  arabic: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/,
  devanagari: /[\u0900-\u097F]/,
};

/**
 * Code-switching and Romanized transliteration token patterns
 */
const CODE_SWITCHING_PATTERNS = {
  telugu: /\b(kavala|kavali|cheyali|cheyyali|cheppandi|ivvandi|ela|enti|undhi|undi|unnayi|unnara|chudandi|bagundi|chesi|chesaru|manchi|naku|meeku|chesukovadam|kosam|bavundi|pettali|pettandi|reels ki|brand tho)\b/gi,
  hindi: /\b(chahiye|kaise|kare|karein|karna|batao|bataiye|hoga|hoti|hote|mera|meri|mere|mujhe|apna|apne|karo|kisi|kya|kyun|accha|bahut|kaun|hai|hain|ke liye|kar sakte hai|bata do)\b/gi,
  marathi: /\b(aahe|nahi|kasa|kase|kara|madat|baddal|kay|aamhi|majhe|majhya|tyancha|sanga)\b/gi,
  spanish: /\b(hola|como|cómo|quiero|para|marca|campaña|precio|gracias|mejor|creadores|ayuda|por favor|cuál|buenos dias)\b/gi,
  french: /\b(bonjour|comment|pour|marque|campagne|prix|merci|meilleur|créateurs|aide|s'il vous plaît|svp|quel|quelle)\b/gi,
  arabic_roman: /\b(marhaban|shukran|kayfa|afwan|ayna|hal)\b/gi,
};

/**
 * Distinguish Marathi from Hindi in Devanagari script based on distinct Marathi lexical items
 */
const MARATHI_DEVANAGARI_MARKERS = /(?:^|[\s\p{P}])(आहे|नाही|कसे|कसा|करा|मदत|बद्दल|काय|आम्ही|माझे|माझ्या|त्यांच्या|करणे|सांगा|होय|मला|हवी|आहेत)(?:$|[\s\p{P}])/u;

/**
 * Detect language of a user message
 */
export function detectLanguage(text: string, currentPreference?: string): LanguageDetectionResult {
  const trimmed = text.trim();
  if (!trimmed) {
    const fallback = (currentPreference && currentPreference !== "auto" ? currentPreference : "en") as SupportedLanguageCode;
    return {
      detectedLanguage: fallback,
      confidence: 0.1,
      isCodeSwitching: false,
    };
  }

  // 1. Check native Unicode scripts
  if (SCRIPT_RANGES.telugu.test(trimmed)) {
    return { detectedLanguage: "te", confidence: 0.98, isCodeSwitching: false };
  }
  if (SCRIPT_RANGES.tamil.test(trimmed)) {
    return { detectedLanguage: "ta", confidence: 0.98, isCodeSwitching: false };
  }
  if (SCRIPT_RANGES.kannada.test(trimmed)) {
    return { detectedLanguage: "kn", confidence: 0.98, isCodeSwitching: false };
  }
  if (SCRIPT_RANGES.malayalam.test(trimmed)) {
    return { detectedLanguage: "ml", confidence: 0.98, isCodeSwitching: false };
  }
  if (SCRIPT_RANGES.bengali.test(trimmed)) {
    return { detectedLanguage: "bn", confidence: 0.98, isCodeSwitching: false };
  }
  if (SCRIPT_RANGES.arabic.test(trimmed)) {
    return { detectedLanguage: "ar", confidence: 0.99, isCodeSwitching: false };
  }
  if (SCRIPT_RANGES.devanagari.test(trimmed)) {
    if (MARATHI_DEVANAGARI_MARKERS.test(trimmed)) {
      return { detectedLanguage: "mr", confidence: 0.95, isCodeSwitching: false };
    }
    return { detectedLanguage: "hi", confidence: 0.98, isCodeSwitching: false };
  }

  // 2. Check Romanized transliteration and code-switching patterns (Latin script)
  const teluguMatches = trimmed.match(CODE_SWITCHING_PATTERNS.telugu);
  if (teluguMatches && teluguMatches.length >= 1) {
    return {
      detectedLanguage: "te",
      confidence: Math.min(0.75 + teluguMatches.length * 0.1, 0.95),
      isCodeSwitching: true,
      dialect: "Telugu-English (Tenglish)",
      matchedTokens: teluguMatches,
    };
  }

  const hindiMatches = trimmed.match(CODE_SWITCHING_PATTERNS.hindi);
  if (hindiMatches && hindiMatches.length >= 1) {
    return {
      detectedLanguage: "hi",
      confidence: Math.min(0.75 + hindiMatches.length * 0.1, 0.95),
      isCodeSwitching: true,
      dialect: "Hindi-English (Hinglish)",
      matchedTokens: hindiMatches,
    };
  }

  const marathiMatches = trimmed.match(CODE_SWITCHING_PATTERNS.marathi);
  if (marathiMatches && marathiMatches.length >= 2) {
    return {
      detectedLanguage: "mr",
      confidence: 0.85,
      isCodeSwitching: true,
      dialect: "Marathi-English",
      matchedTokens: marathiMatches,
    };
  }

  const spanishMatches = trimmed.match(CODE_SWITCHING_PATTERNS.spanish);
  if (spanishMatches && spanishMatches.length >= 1) {
    return {
      detectedLanguage: "es",
      confidence: 0.88,
      isCodeSwitching: false,
      matchedTokens: spanishMatches,
    };
  }

  const frenchMatches = trimmed.match(CODE_SWITCHING_PATTERNS.french);
  if (frenchMatches && frenchMatches.length >= 1) {
    return {
      detectedLanguage: "fr",
      confidence: 0.88,
      isCodeSwitching: false,
      matchedTokens: frenchMatches,
    };
  }

  const arabicRomanMatches = trimmed.match(CODE_SWITCHING_PATTERNS.arabic_roman);
  if (arabicRomanMatches && arabicRomanMatches.length >= 1) {
    return {
      detectedLanguage: "ar",
      confidence: 0.85,
      isCodeSwitching: true,
      dialect: "Arabic Romanized",
      matchedTokens: arabicRomanMatches,
    };
  }

  // 3. Ambiguity evaluation
  const words = trimmed.split(/\s+/);
  if (words.length <= 2 && /^(hi|hello|hey|ok|yes|no|test|cool|thanks|thank you|nike|glowup)$/i.test(trimmed)) {
    const fallback = (currentPreference && currentPreference !== "auto" ? currentPreference : "en") as SupportedLanguageCode;
    return {
      detectedLanguage: fallback,
      confidence: 0.4,
      isCodeSwitching: false,
    };
  }

  // Default Latin text to English
  return {
    detectedLanguage: "en",
    confidence: 0.9,
    isCodeSwitching: false,
  };
}

/**
 * Builds the strict server-side multilingual prompt directive for LLM
 */
export function buildMultilingualPromptDirective({
  targetLanguage,
  isExplicitSelection,
  isCodeSwitching,
  dialect,
}: {
  targetLanguage: SupportedLanguageCode;
  isExplicitSelection: boolean;
  isCodeSwitching?: boolean;
  dialect?: string;
}): string {
  if (targetLanguage === "auto" || targetLanguage === "en") {
    if (isCodeSwitching && dialect) {
      return `### MULTILINGUAL DIRECTIVE:
- User Message Style: Detected code-switching / hybrid (${dialect}).
- Instruction: You may respond naturally in culturally authentic conversational style matching the user's inquiry, while keeping technical names, brand names, and URLs intact in English/Latin script.`;
    }
    return "";
  }

  const meta = getLanguageMetadata(targetLanguage);

  return `### STRICT MULTILINGUAL DIRECTIVE:
- Target Response Language: ${meta.name} (${meta.nativeName})
- Language Code: ${targetLanguage}
- Direction: ${meta.dir === "rtl" ? "Right-to-Left (RTL)" : "Left-to-Right (LTR)"}
- User Selection Mode: ${isExplicitSelection ? "Explicit user preference (MUST override user message language)" : "Auto-detected based on user message"}
${isCodeSwitching ? `- Detected Code-Switching / Dialect: ${dialect}. Respond in culturally fluent, natural phrasing.` : ""}

MANDATORY RULES:
1. Provide your entire conversational output and explanations in ${meta.name} (${meta.nativeName}).
2. DO NOT translate brand names (e.g. "Nike", "GlowUp", "Samsung", "VeriCreator"), creator names (e.g. "Ananya Rao", "Priya Sharma", "Aarav Patel"), profile markdown links (e.g. "[Ananya Rao](/creators/ananya-rao)"), platform names ("Instagram Reels", "YouTube Shorts", "TikTok"), metrics ("8.7% engagement", "₹10,000", "4.8 rating"), code blocks, or database IDs.
3. Keep the translation natural, professional, and culturally fluent—avoid literal or awkward machine translations.
${meta.dir === "rtl" ? "4. Ensure Arabic phrasing follows natural Right-to-Left conventions with proper Arabic punctuation." : ""}`;
}

export interface ChatbotLocalizedStrings {
  title: string;
  roleBrand: string;
  roleCreator: string;
  liveBadge: string;
  contextButton: string;
  clearButton: string;
  closeButton: string;
  inputPlaceholder: string;
  sendButton: string;
  stopButton: string;
  copyButton: string;
  copiedNotice: string;
  typingIndicator: string;
  retryButton: string;
  errorMessage: string;
  rateLimitMessage: string;
  brandGreeting: string;
  creatorGreeting: string;
  brandQuickActions: string[];
  creatorQuickActions: string[];
  suggestedFollowUpsBrand: string[];
  suggestedFollowUpsCreator: string[];
  autoDetectOption: string;
  selectLanguageLabel: string;
  fallbackNotice: string;
  escrowNotice: string;
}

export type ConcreteLanguageCode =
  | "en"
  | "te"
  | "hi"
  | "ta"
  | "kn"
  | "ml"
  | "mr"
  | "bn"
  | "es"
  | "fr"
  | "ar";

export const CHATBOT_LOCALIZED_STRINGS: Record<ConcreteLanguageCode, ChatbotLocalizedStrings> = {
  en: {
    title: "AI Marketplace Assistant",
    roleBrand: "🏢 Brand Owner",
    roleCreator: "🎨 Creator",
    liveBadge: "Live AI",
    contextButton: "Context",
    clearButton: "Clear",
    closeButton: "Close",
    inputPlaceholder: "Ask about creators, campaigns, rates, or strategy...",
    sendButton: "Send message",
    stopButton: "Stop generating",
    copyButton: "Copy message",
    copiedNotice: "Copied!",
    typingIndicator: "AI Assistant is analyzing...",
    retryButton: "Retry",
    errorMessage: "AI Assistant is temporarily unavailable. Please retry in a moment.",
    rateLimitMessage: "You are sending requests too quickly. Please wait a few seconds.",
    brandGreeting:
      "👋 **Hello! I'm your Production AI Assistant for Brand Owners & Marketers.**\n\nI help brands discover high-performing AI creators, plan viral campaigns, and optimize marketing spend:\n- 🔍 **Creator Discovery**: \"I want to promote a skincare product. Which creators are suitable?\"\n- 👗 **Niche Matching**: \"Suggest creators for a women's fashion brand.\"\n- 💰 **Budget Allocation**: \"Which creator is best for my product with a budget of ₹10,000?\"\n- ⚖️ **Creator Comparison**: \"Compare these three creators and recommend the best match.\"\n- 🎬 **Campaign Concepts**: \"Suggest a 15-second Instagram Reel campaign for my clothing brand.\"\n- 👟 **Brand Strategy**: \"Suggest a marketing strategy for Nike shoes.\"\n\nSelect a quick action below or describe your product and marketing goals!",
    creatorGreeting:
      "👋 **Hi Creator! I'm your AI Creative & Collaboration Assistant.**\n\nI help AI content creators match with brands, craft viral content, and land high-paying collaborations:\n- 💼 **Brand & Campaign Discovery**: \"Which brands are suitable for my fashion profile?\"\n- 💡 **Content Ideation**: \"Suggest content ideas for a skincare product.\"\n- 🎬 **Video Formats**: \"How can I create a 15-second Instagram Reel?\"\n- 🤝 **Collaboration Pitches**: \"Write a collaboration proposal for a clothing brand.\"\n- 📈 **Profile Growth**: \"How can I improve my engagement rate and reach verified status?\"\n\nChoose an action below or tell me about your niche and goals!",
    brandQuickActions: [
      "Find creators for Skincare launch",
      "Suggest Fashion creators under ₹20k",
      "Draft 15s Instagram Reel campaign brief",
      "Compare top verified creators",
    ],
    creatorQuickActions: [
      "Find matching brand campaigns",
      "Suggest 3 viral Reel ideas for my niche",
      "Write collaboration proposal for a brand",
      "How to boost my Passport Score?",
    ],
    suggestedFollowUpsBrand: [
      "Which of these creators has highest engagement?",
      "Draft a campaign brief with deliverables and timeline",
      "How should I split ₹30,000 across deliverables?",
      "Can we compare pricing across these creators?",
    ],
    suggestedFollowUpsCreator: [
      "Write a full 30s video script with hook and CTA",
      "How do I reach verified status on VeriCreator?",
      "Draft an outreach email to pitching this brand",
      "What deliverables should I quote for ₹15,000?",
    ],
    autoDetectOption: "Auto-detect",
    selectLanguageLabel: "Select Language",
    fallbackNotice: "Offline heuristic rules engine",
    escrowNotice: "Direct Brand-Creator settlement (escrow payments are currently offline).",
  },
  te: {
    title: "AI మార్కెట్‌ప్లేస్ అసిస్టెంట్",
    roleBrand: "🏢 బ్రాండ్ ఓనర్",
    roleCreator: "🎨 క్రియేటర్",
    liveBadge: "లైవ్ AI",
    contextButton: "సందర్భం",
    clearButton: "క్లియర్",
    closeButton: "మూసివేయి",
    inputPlaceholder: "క్రియేటర్లు, ప్రచారాలు, రేట్లు లేదా మార్కెటింగ్ వ్యూహాల గురించి అడగండి...",
    sendButton: "సందేశం పంపు",
    stopButton: "ఆపివేయి",
    copyButton: "కాపీ చేయి",
    copiedNotice: "కాపీ చేయబడింది!",
    typingIndicator: "AI అసిస్టెంట్ ఆలోచిస్తోంది...",
    retryButton: "మళ్లీ ప్రయత్నించండి",
    errorMessage: "AI అసిస్టెంట్ ప్రస్తుతం అందుబాటులో లేదు. దయచేసి కొద్దిసేపటి తర్వాత ప్రయత్నించండి.",
    rateLimitMessage: "మీరు చాలా వేగంగా అభ్యర్థనలు పంపుతున్నారు. దయచేసి కొద్ది క్షణాలు వేచి ఉండండి.",
    brandGreeting:
      "👋 **నమస్కారం! బ్రాండ్ ఓనర్లు & విక్రయదారుల కోసం మీ AI అసిస్టెంట్.**\n\nటాప్ AI క్రియేటర్లను కనుగొనడానికి మరియు వైరల్ ప్రచారాలను ప్లాన్ చేయడానికి నేను సహాయం చేస్తాను:\n- 🔍 **క్రియేటర్ శోధన**: \"స్కిన్‌కేర్ ప్రొడక్ట్ ప్రమోషన్ కోసం ఏ క్రియేటర్లు సరిపోతారు?\"\n- 💰 **బడ్జెట్ సరిపోలిక**: \"₹10,000 బడ్జెట్‌తో ఏ క్రియేటర్ ఉత్తమం?\"\n- ⚖️ **పోలిక**: \"ఈ ముగ్గురు క్రియేటర్లను సరిపోల్చి ఉత్తమ ఎంపిక చెప్పండి.\"\n- 🎬 **రీల్ కాన్సెప్ట్**: \"నా దుస్తుల బ్రాండ్ కోసం 15 సెకన్ల Instagram Reel ఆలోచనలు ఇవ్వండి.\"",
    creatorGreeting:
      "👋 **నమస్కారం క్రియేటర్! మీ AI క్రియేటివ్ & కొలాబరేషన్ అసిస్టెంట్.**\n\nబ్రాండ్ డీల్స్ పొందడానికి మరియు వైరల్ కంటెంట్ రూపొందించడానికి నేను సహాయం చేస్తాను:\n- 💼 **బ్రాండ్ శోధన**: \"నా ఫ్యాషన్ ప్రొఫైల్‌కు ఏ బ్రాండ్లు సరిపోతాయి?\"\n- 💡 **కంటెంట్ ఆలోచనలు**: \"స్కిన్‌కేర్ కోసం వైరల్ రీల్ ఐడియాలు ఇవ్వండి.\"\n- 🤝 **ప్రపోజల్ రాయడం**: \"బ్రాండ్‌కు పంపడానికి సహకార ప్రతిపాదన రాయండి.\"\n- 📈 **ప్రొఫైల్ వృద్ధి**: \"నా ఎంగేజ్‌మెంట్ రేట్ ఎలా పెంచుకోవాలి?\"",
    brandQuickActions: [
      "స్కిన్‌కేర్ లాంచ్ కోసం క్రియేటర్లను కనుగొనండి",
      "₹20,000 లోపు ఫ్యాషన్ క్రియేటర్లను సూచించండి",
      "15 సెకన్ల Instagram Reel ప్రచార బ్రీఫ్ రాయండి",
      "టాప్ వెరిఫైడ్ క్రియేటర్లను సరిపోల్చండి",
    ],
    creatorQuickActions: [
      "సరిపోయే బ్రాండ్ ప్రచారాలను కనుగొనండి",
      "నా విభాగం కోసం 3 వైరల్ రీల్ ఐడియాలు ఇవ్వండి",
      "బ్రాండ్ కోసం కొలాబరేషన్ ప్రపోజల్ రాయండి",
      "నా పాస్‌పోర్ట్ స్కోరు ఎలా పెంచుకోవాలి?",
    ],
    suggestedFollowUpsBrand: [
      "వీరిలో అత్యధిక ఎంగేజ్‌మెంట్ రేట్ ఎవరికి ఉంది?",
      "పూర్తి ప్రచార వివరాలు రాయండి",
      "₹30,000 బడ్జెట్‌ను ఎలా కేటాయించాలి?",
    ],
    suggestedFollowUpsCreator: [
      "హుక్ మరియు కాల్-టు-యాక్షన్‌తో పూర్తి 30 సెకన్ల స్క్రిప్ట్ రాయండి",
      "VeriCreator లో వెరిఫైడ్ బ్యాడ్జ్ ఎలా పొందాలి?",
      "బ్రాండ్‌కు పంపడానికి పిచ్ ఇమెయిల్ డ్రాఫ్ట్ చేయండి",
    ],
    autoDetectOption: "ఆటో-డిటెక్ట్ (Auto-detect)",
    selectLanguageLabel: "భాషను ఎంచుకోండి",
    fallbackNotice: "ఆఫ్‌లైన్ నియమాల ఇంజిన్",
    escrowNotice: "ప్రత్యక్ష బ్రాండ్-క్రియేటర్ ఒప్పందం (ఎస్క్రో ప్రస్తుతం ఆఫ్‌లైన్).",
  },
  hi: {
    title: "AI मार्केटप्लेस असिस्टेंट",
    roleBrand: "🏢 ब्रांड ओनर",
    roleCreator: "🎨 क्रिएटर",
    liveBadge: "लाइव AI",
    contextButton: "संदर्भ",
    clearButton: "साफ़ करें",
    closeButton: "बंद करें",
    inputPlaceholder: "क्रिएटर्स, कैंपेन, बजट या रणनीति के बारे में पूछें...",
    sendButton: "संदेश भेजें",
    stopButton: "रोकें",
    copyButton: "कॉपी करें",
    copiedNotice: "कॉपी हो गया!",
    typingIndicator: "AI असिस्टेंट विश्लेषण कर रहा है...",
    retryButton: "पुनः प्रयास करें",
    errorMessage: "AI असिस्टेंट अस्थायी रूप से अनुपलब्ध है। कृपया कुछ देर बाद प्रयास करें।",
    rateLimitMessage: "आप बहुत तेज़ी से अनुरोध भेज रहे हैं। कृपया कुछ सेकंड प्रतीक्षा करें।",
    brandGreeting:
      "👋 **नमस्ते! ब्रांड मालिकों और मार्केटर्स के लिए आपका AI असिस्टेंट।**\n\nमैं टॉप AI क्रिएटर्स खोजने, वायरल कैंपेन की योजना बनाने और मार्केटिंग बजट को अनुकूलित करने में आपकी मदद करता हूँ:\n- 🔍 **क्रिएटर खोज**: \"स्किनकेयर प्रोडक्ट के लिए कौन से क्रिएटर्स सबसे अच्छे हैं?\"\n- 💰 **बजट योजना**: \"₹10,000 के बजट में मेरे प्रोडक्ट के लिए कौन सा क्रिएटर सही है?\"\n- ⚖️ **क्रिएटर तुलना**: \"इन तीन क्रिएटर्स की तुलना करें और सर्वश्रेष्ठ सुझाव दें।\"\n- 🎬 **कैंपेन विचार**: \"कपड़ों के ब्रांड के लिए 15 सेकंड का Instagram Reel कैंपेन सुझाएं।\"",
    creatorGreeting:
      "👋 **नमस्ते क्रिएटर! आपका AI क्रिएटिव और कोलैबोरेशन असिस्टेंट।**\n\nमैं ब्रांड्स के साथ जुड़ने, वायरल कंटेंट बनाने और बेहतरीन स्पोंसरशिप पाने में आपकी मदद करता हूँ:\n- 💼 **ब्रांड खोज**: \"मेरी फ़ैशन प्रोफ़ाइल के लिए कौन से ब्रांड उपयुक्त हैं?\"\n- 💡 **कंटेंट विचार**: \"स्किनकेयर प्रोडक्ट के लिए वायरल रील आइडिया दें।\"\n- 🤝 **प्रस्ताव लेखन**: \"ब्रांड के लिए कोलैबोरेशन प्रस्ताव लिखें।\"\n- 📈 **ग्रोथ टिप्स**: \"मेरा एंगेजमेंट रेट और पासपोर्ट स्कोर कैसे बढ़ाएं?\"",
    brandQuickActions: [
      "स्किनकेयर लॉन्च के लिए क्रिएटर्स ढूंढें",
      "₹20,000 के अंदर फ़ैशन क्रिएटर्स सुझाएं",
      "15 सेकंड का Instagram Reel कैंपेन ब्रीफ़ लिखें",
      "टॉप वेरिफ़ाइड क्रिएटर्स की तुलना करें",
    ],
    creatorQuickActions: [
      "उपयुक्त ब्रांड कैंपेन खोजें",
      "मेरे क्षेत्र के लिए 3 वायरल रील विचार दें",
      "ब्रांड के लिए कोलैबोरेशन प्रस्ताव लिखें",
      "पासपोर्ट स्कोर कैसे सुधारें?",
    ],
    suggestedFollowUpsBrand: [
      "इनमें से किसका एंगेजमेंट रेट सबसे अधिक है?",
      "डिलीवरेबल्स और समय-सीमा के साथ कैंपेन ब्रीफ़ तैयार करें",
      "₹30,000 के बजट को कैसे विभाजित करें?",
    ],
    suggestedFollowUpsCreator: [
      "हुक और सीटीए के साथ 30 सेकंड की पूरी वीडियो स्क्रिप्ट लिखें",
      "VeriCreator पर वेरिफ़ाइड स्टेटस कैसे प्राप्त करें?",
      "ब्रांड को भेजने के लिए आउटरीच ईमेल का मसौदा तैयार करें",
    ],
    autoDetectOption: "ऑटो-डिटेक्ट (Auto-detect)",
    selectLanguageLabel: "भाषा चुनें",
    fallbackNotice: "ऑफ़लाइन नियम इंजन",
    escrowNotice: "सीधा ब्रांड-क्रिएटर भुगतान (एस्क्रो वर्तमान में ऑफ़लाइन है)।",
  },
  ta: {
    title: "AI சந்தை உதவியாளர்",
    roleBrand: "🏢 பிராண்ட் உரிமையாளர்",
    roleCreator: "🎨 படைப்பாளர்",
    liveBadge: "நேரலை AI",
    contextButton: "சூழல்",
    clearButton: "அழி",
    closeButton: "மூடு",
    inputPlaceholder: "படைப்பாளர்கள், பிரச்சாரங்கள், கட்டணங்கள் பற்றி கேளுங்கள்...",
    sendButton: "அனுப்பு",
    stopButton: "நிறுத்து",
    copyButton: "நகலெடு",
    copiedNotice: "நகலெடுக்கப்பட்டது!",
    typingIndicator: "AI உதவியாளர் சிந்திக்கிறார்...",
    retryButton: "மீண்டும் முயற்சிக்கவும்",
    errorMessage: "AI உதவியாளர் தற்காலிகமாக கிடைக்கவில்லை. சிறிது நேரம் கழித்து முயற்சிக்கவும்.",
    rateLimitMessage: "நீங்கள் மிக வேகமாக கோரிக்கைகளை அனுப்புகிறீர்கள். சில வினாடிகள் காத்திருக்கவும்.",
    brandGreeting:
      "👋 **வணக்கம்! பிராண்ட் உரிமையாளர்களுக்கான உங்கள் AI உதவியாளர்.**\n\nசிறந்த AI படைப்பாளர்களைக் கண்டறிந்து வைரல் பிரச்சாரங்களைத் திட்டமிட உதவுகிறேன்:\n- 🔍 **படைப்பாளர் தேடல்**: \"தோல் பராமரிப்பு தயாரிப்புக்கு யார் பொருத்தமானவர்கள்?\"\n- 💰 **பட்ஜெட் திட்டம்**: \"₹10,000 பட்ஜெட்டில் யார் சிறந்தவர்?\"\n- 🎬 **ரீல் யோசனை**: \"எனது ஆடை பிராண்டிற்கு 15 வினாடி Instagram Reel யோசனைகள் தாருங்கள்.\"",
    creatorGreeting:
      "👋 **வணக்கம் படைப்பாளரே! உங்கள் AI படைப்பு உதவியாளர்.**\n\nபிராண்டுகளுடன் இணைவதற்கும் வைரல் உள்ளடக்கத்தை உருவாக்குவதற்கும் உதவுகிறேன்:\n- 💼 **பிராண்ட் தேடல்**: \"எனது சுயவிவரத்திற்கு எந்த பிராண்டுகள் பொருந்தும்?\"\n- 💡 **உள்ளடக்க யோசனைகள்**: \"தோல் பராமரிப்புக்கு வைரல் ரீல் யோசனைகள் தருக.\"\n- 📈 **சுயவிவர வளர்ச்சி**: \"எனது ஈடுபாட்டு விகிதத்தை எவ்வாறு அதிகரிப்பது?\"",
    brandQuickActions: [
      "தோல் பராமரிப்புக்கான படைப்பாளர்களைக் கண்டுபிடி",
      "₹20,000 க்குள் சிறந்த படைப்பாளர்களைப் பரிந்துரைக்க",
      "15 வினாடி Instagram Reel பிரச்சார வரைவு",
    ],
    creatorQuickActions: [
      "பொருத்தமான பிராண்ட் பிரச்சாரங்களைத் தேடுங்கள்",
      "3 வைரல் ரீல் யோசனைகளை பரிந்துரைக்கவும்",
      "பிராண்டிற்கான கூட்டு முன்மொழிவை எழுதுங்கள்",
    ],
    suggestedFollowUpsBrand: [
      "இவர்களில் அதிக ஈடுபாடு யாருக்கு உள்ளது?",
      "முழு பிரச்சார சுருக்கத்தை எழுதுங்கள்",
    ],
    suggestedFollowUpsCreator: [
      "30 வினாடி முழு வீடியோ ஸ்கிரிப்டை எழுதுங்கள்",
      "சரிபார்க்கப்பட்ட பேட்ஜ் பெறுவது எப்படி?",
    ],
    autoDetectOption: "தானாகக் கண்டறி (Auto-detect)",
    selectLanguageLabel: "மொழியைத் தேர்ந்தெடுக்கவும்",
    fallbackNotice: "ஆஃப்லைன் விதிமுறை இயந்திரம்",
    escrowNotice: "நேரடி கட்டண ஒப்பந்தம் (எஸ்க்ரோ தற்போது ஆஃப்லைனில் உள்ளது).",
  },
  kn: {
    title: "AI ಮಾರುಕಟ್ಟೆ ಸಹಾಯಕ",
    roleBrand: "🏢 ಬ್ರ್ಯಾಂಡ್ ಮಾಲೀಕ",
    roleCreator: "🎨 ಕ್ರಿಯೇಟರ್",
    liveBadge: "ಲೈವ್ AI",
    contextButton: "ಸಂದರ್ಭ",
    clearButton: "ತೆರವುಗೊಳಿಸಿ",
    closeButton: "ಮುಚ್ಚಿ",
    inputPlaceholder: "ಕ್ರಿಯೇಟರ್‌ಗಳು, ಪ್ರಚಾರಗಳು, ಶುಲ್ಕಗಳ ಬಗ್ಗೆ ಕೇಳಿ...",
    sendButton: "ಕಳುಹಿಸಿ",
    stopButton: "ನಿಲ್ಲಿಸಿ",
    copyButton: "ನಕಲಿಸಿ",
    copiedNotice: "ನಕಲಿಸಲಾಗಿದೆ!",
    typingIndicator: "AI ಸಹಾಯಕ ಯೋಚಿಸುತ್ತಿದೆ...",
    retryButton: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    errorMessage: "AI ಸಹಾಯಕ ಪ್ರಸ್ತುತ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಪ್ರಯತ್ನಿಸಿ.",
    rateLimitMessage: "ದಯವಿಟ್ಟು ಕೆಲವು ಸೆಕೆಂಡುಗಳು ಕಾಯಿರಿ.",
    brandGreeting:
      "👋 **ನಮಸ್ಕಾರ! ಬ್ರ್ಯಾಂಡ್ ಮಾಲೀಕರಿಗೆ ನಿಮ್ಮ AI ಸಹಾಯಕ.**\n\nಉತ್ತಮ AI ಕ್ರಿಯೇಟರ್‌ಗಳನ್ನು ಹುಡುಕಲು ಮತ್ತು ಪ್ರಚಾರಗಳನ್ನು ಯೋಜಿಸಲು ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ:\n- 🔍 **ಕ್ರಿಯೇಟರ್ ಹುಡುಕಾಟ**: \"ಸ್ಕಿನ್‌ಕೇರ್ ಉತ್ಪನ್ನಕ್ಕೆ ಯಾರು ಸೂಕ್ತ?\"\n- 💰 **ಬಜೆಟ್ ಯೋಜನೆ**: \"₹10,000 ಬಜೆಟ್‌ಗೆ ಯಾರು ಉತ್ತಮ?\"",
    creatorGreeting:
      "👋 **ನಮಸ್ಕಾರ ಕ್ರಿಯೇಟರ್! ನಿಮ್ಮ AI ಕ್ರಿಯೇಟಿವ್ ಸಹಾಯಕ.**\n\nಬ್ರ್ಯಾಂಡ್‌ಗಳೊಂದಿಗೆ ಸಹಯೋಗ ಹೊಂದಲು ಮತ್ತು ವೈರಲ್ ಕಂಟೆಂಟ್ ರಚಿಸಲು ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ:\n- 💼 **ಬ್ರ್ಯಾಂಡ್ ಹುಡುಕಾಟ**: \"ನನ್ನ ಪ್ರೊಫೈಲ್‌ಗೆ ಯಾವ ಬ್ರ್ಯಾಂಡ್‌ಗಳು ಸೂಕ್ತ?\"\n- 💡 **ಕಂಟೆಂಟ್ ಕಲ್ಪನೆಗಳು**: \"ವೈರಲ್ ರೀಲ್ ಕಲ್ಪನೆಗಳನ್ನು ಸೂಚಿಸಿ.\"",
    brandQuickActions: [
      "ಸ್ಕಿನ್‌ಕೇರ್ ಕ್ರಿಯೇಟರ್‌ಗಳನ್ನು ಹುಡುಕಿ",
      "₹20,000 ಒಳಗೆ ಕ್ರಿಯೇಟರ್‌ಗಳನ್ನು ಸೂಚಿಸಿ",
      "15 ಸೆಕೆಂಡುಗಳ Instagram Reel ಕರಡು ಬರೆಯಿರಿ",
    ],
    creatorQuickActions: [
      "ಹೊಂದಿಕೆಯಾಗುವ ಪ್ರಚಾರಗಳನ್ನು ಹುಡುಕಿ",
      "3 ವೈರಲ್ ರೀಲ್ ಕಲ್ಪನೆಗಳನ್ನು ನೀಡಿ",
      "ಸಹಯೋಗದ ಪ್ರಸ್ತಾಪವನ್ನು ಬರೆಯಿರಿ",
    ],
    suggestedFollowUpsBrand: ["ಅತ್ಯಧಿಕ ಎಂಗೇಜ್‌ಮೆಂಟ್ ರೇಟ್ ಯಾರಿಗೆ ಇದೆ?", "ಸಂಪೂರ್ಣ ಪ್ರಚಾರ ಬ್ರೀಫ್ ಬರೆಯಿರಿ"],
    suggestedFollowUpsCreator: ["30 ಸೆಕೆಂಡಿನ ವೀಡಿಯೊ ಸ್ಕ್ರಿಪ್ಟ್ ಬರೆಯಿರಿ", "ವೆರಿಫೈಡ್ ಬ್ಯಾಡ್ಜ್ ಪಡೆಯುವುದು ಹೇಗೆ?"],
    autoDetectOption: "ಸ್ವಯಂ ಪತ್ತೆ (Auto-detect)",
    selectLanguageLabel: "ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    fallbackNotice: "ಆಫ್‌ಲೈನ್ ನಿಯಮ ಎಂಜಿನ್",
    escrowNotice: "ನೇರ ಬ್ರ್ಯಾಂಡ್-ಕ್ರಿಯೇಟರ್ ಪಾವತಿ (ಎಸ್ಕ್ರೋ ಪ್ರಸ್ತುತ ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದೆ).",
  },
  ml: {
    title: "AI മാർക്കറ്റ്പ്ലേസ് അസിസ്റ്റന്റ്",
    roleBrand: "🏢 ബ്രാൻഡ് ഉടമ",
    roleCreator: "🎨 ക്രിയേറ്റർ",
    liveBadge: "ലൈവ് AI",
    contextButton: "സന്ദർഭം",
    clearButton: "മായ്ക്കുക",
    closeButton: "അടയ്ക്കുക",
    inputPlaceholder: "ക്രിയേറ്റർമാർ, കാമ്പെയ്നുകൾ എന്നിവയെക്കുറിച്ച് ചോദിക്കുക...",
    sendButton: "അയക്കുക",
    stopButton: "നിർത്തുക",
    copyButton: "പകർപ്പുക",
    copiedNotice: "പകർത്തി!",
    typingIndicator: "AI അസിസ്റ്റന്റ് ചിന്തിക്കുന്നു...",
    retryButton: "വീണ്ടും ശ്രമിക്കുക",
    errorMessage: "AI അസിസ്റ്റന്റ് താൽക്കാലികമായി ലഭ്യമല്ല.",
    rateLimitMessage: "ദയവായി കുറച്ച് നിമിഷങ്ങൾ കാത്തിരിക്കുക.",
    brandGreeting:
      "👋 **നമസ്കാരം! ബ്രാൻഡ് ഉടമകൾക്കായുള്ള നിങ്ങളുടെ AI അസിസ്റ്റന്റ്.**\n\nമികച്ച AI ക്രിയേറ്റർമാരെ കണ്ടെത്താനും കാമ്പെയ്നുകൾ ആസൂത്രണം ചെയ്യാനും ഞാൻ സഹായിക്കുന്നു.",
    creatorGreeting:
      "👋 **ഹലോ ക്രിയേറ്റർ! നിങ്ങളുടെ AI ക്രിയേറ്റീവ് അസിസ്റ്റന്റ്.**\n\nബ്രാൻഡുകളുമായി സഹകരിക്കാനും വൈറൽ ഉള്ളടക്കം നിർമ്മിക്കാനും ഞാൻ സഹായിക്കുന്നു.",
    brandQuickActions: ["സ്കിൻകെയർ ക്രിയേറ്റർമാരെ കണ്ടെത്തുക", "₹20,000-ൽ താഴെയുള്ള ക്രിയേറ്റർമാർ", "റീൽ കാമ്പെയ്ൻ നിർദ്ദേശിക്കുക"],
    creatorQuickActions: ["യോജിച്ച കാമ്പെയ്നുകൾ കണ്ടെത്തുക", "3 വൈറൽ റീൽ ആശയങ്ങൾ നൽകുക", "കൊളാബറേഷൻ പ്രൊപ്പോസൽ എഴുതുക"],
    suggestedFollowUpsBrand: ["ആർക്കാണ് കൂടുതൽ എൻഗേജ്മെന്റ് ഉള്ളത്?", "പൂർണ്ണ കാമ്പെയ്ൻ ബ്രീഫ് നൽകുക"],
    suggestedFollowUpsCreator: ["30 സെക്കൻഡ് സ്ക്രിപ്റ്റ് എഴുതുക", "വെരിഫൈഡ് ആവുന്നത് എങ്ങനെ?"],
    autoDetectOption: "സ്വയം കണ്ടെത്തുക (Auto-detect)",
    selectLanguageLabel: "ഭാഷ തിരഞ്ഞെടുക്കുക",
    fallbackNotice: "ഓഫ്‌ലൈൻ റൂൾസ് എഞ്ചിൻ",
    escrowNotice: "നേരിട്ടുള്ള പണമിടപാട് (എസ്ക്രോ ഇപ്പോൾ ഓഫ്‌ലൈനിലാണ്).",
  },
  mr: {
    title: "AI मार्केटप्लेस असिस्टंट",
    roleBrand: "🏢 ब्रँड मालक",
    roleCreator: "🎨 क्रिएटर",
    liveBadge: "लाईव्ह AI",
    contextButton: "संदर्भ",
    clearButton: "साफ करा",
    closeButton: "बंद करा",
    inputPlaceholder: "क्रिएटर्स, मोहिमा किंवा धोरणांबद्दल विचारा...",
    sendButton: "पाठवा",
    stopButton: "थांबवा",
    copyButton: "कॉपी करा",
    copiedNotice: "कॉपी केले!",
    typingIndicator: "AI असिस्टंट विचार करत आहे...",
    retryButton: "पुन्हा प्रयत्न करा",
    errorMessage: "AI असिस्टंट तात्पुरता अनुपलब्ध आहे.",
    rateLimitMessage: "कृपया काही सेकंद प्रतीक्षा करा.",
    brandGreeting:
      "👋 **नमस्कार! ब्रँड मालकांसाठी तुमचा AI असिस्टंट.**\n\nउत्कृष्ट AI क्रिएटर्स शोधण्यात आणि मोहिमा आखण्यात मी मदत करतो.",
    creatorGreeting:
      "👋 **नमस्कार क्रिएटर! तुमचा AI क्रिएटिव्ह असिस्टंट.**\n\nब्रँड सहकार्य मिळवण्यात आणि व्हायरल कन्टेन्ट तयार करण्यात मी मदत करतो.",
    brandQuickActions: ["स्किनकेअरसाठी क्रिएटर्स शोधा", "₹20,000 च्या आत क्रिएटर्स सुचवा", "15 सेकंदांचा रील मसुदा लिहा"],
    creatorQuickActions: ["योग्य ब्रँड मोहिमा शोधा", "3 व्हायरल रील कल्पना द्या", "सहकार्याचा प्रस्ताव लिहा"],
    suggestedFollowUpsBrand: ["सर्वाधिक एंगेजमेंट कोणाची आहे?", "संपूर्ण मोहिमेचा मसुदा तयार करा"],
    suggestedFollowUpsCreator: ["30 सेकंदांची व्हिडिओ स्क्रिप्ट लिहा", "व्हेरिफाय कसे व्हावे?"],
    autoDetectOption: "स्वयं-शोध (Auto-detect)",
    selectLanguageLabel: "भाषा निवडा",
    fallbackNotice: "ऑफलाइन नियम इंजिन",
    escrowNotice: "थेट व्यवहार (एस्क्रो सध्या ऑफलाइन आहे).",
  },
  bn: {
    title: "AI মার্কেটপ্লেস অ্যাসিস্ট্যান্ট",
    roleBrand: "🏢 ব্র্যান্ডের মালিক",
    roleCreator: "🎨 ক্রিয়েটর",
    liveBadge: "লাইভ AI",
    contextButton: "প্রসঙ্গ",
    clearButton: "মুছুন",
    closeButton: "বন্ধ করুন",
    inputPlaceholder: "ক্রিয়েটর, ক্যাম্পেইন বা রেট সম্পর্কে জিজ্ঞাসা করুন...",
    sendButton: "পাঠান",
    stopButton: "থামান",
    copyButton: "কপি করুন",
    copiedNotice: "কপি করা হয়েছে!",
    typingIndicator: "AI অ্যাসিস্ট্যান্ট চিন্তা করছে...",
    retryButton: "আবার চেষ্টা করুন",
    errorMessage: "AI অ্যাসিস্ট্যান্ট বর্তমানে উপলব্ধ নেই।",
    rateLimitMessage: "অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন।",
    brandGreeting:
      "👋 **নমস্কার! ব্র্যান্ড মালিকদের জন্য আপনার AI অ্যাসিস্ট্যান্ট।**\n\nসেরা AI ক্রিয়েটরদের খুঁজে পেতে এবং ভাইরাল ক্যাম্পেইন পরিকল্পনা করতে আমি সাহায্য করি।",
    creatorGreeting:
      "👋 **হ্যালো ক্রিয়েটর! আপনার AI ক্রিয়েটিভ অ্যাসিস্ট্যান্ট।**\n\nব্র্যান্ড স্পনসরশিপ পেতে এবং চমৎকার কন্টেন্ট তৈরি করতে আমি সাহায্য করি।",
    brandQuickActions: ["স্কিনকেয়ার ক্রিয়েটর খুঁজুন", "₹২০,০০০ এর মধ্যে ক্রিয়েটর", "১৫ সেকেন্ডের রিল ক্যাম্পেইন লিখুন"],
    creatorQuickActions: ["উপযুক্ত ব্র্যান্ড ক্যাম্পেইন খুঁজুন", "৩টি ভাইরাল রিল আইডিয়া দিন", "সহযোগিতার প্রস্তাব লিখুন"],
    suggestedFollowUpsBrand: ["কার এনগেজমেন্ট সবচেয়ে বেশি?", "সম্পূর্ণ ক্যাম্পেইন ব্রিফ দিন"],
    suggestedFollowUpsCreator: ["৩০ সেকেন্ডের সম্পূর্ণ ভিডিও স্ক্রিপ্ট লিখুন", "ভেরিফায়েড ব্যাজ কীভাবে পাবেন?"],
    autoDetectOption: "অটো-ডিটেক্ট (Auto-detect)",
    selectLanguageLabel: "ভাষা নির্বাচন করুন",
    fallbackNotice: "অফলাইন রুলস ইঞ্জিন",
    escrowNotice: "সরাসরি পেমেন্ট ব্যবস্থা (এসক্রো বর্তমানে অফলাইনে রয়েছে)।",
  },
  es: {
    title: "Asistente AI del Marketplace",
    roleBrand: "🏢 Propietario de Marca",
    roleCreator: "🎨 Creador",
    liveBadge: "AI en Vivo",
    contextButton: "Contexto",
    clearButton: "Limpiar",
    closeButton: "Cerrar",
    inputPlaceholder: "Pregunta sobre creadores, campañas, tarifas o estrategia...",
    sendButton: "Enviar",
    stopButton: "Detener",
    copyButton: "Copiar",
    copiedNotice: "¡Copiado!",
    typingIndicator: "El asistente AI está analizando...",
    retryButton: "Reintentar",
    errorMessage: "El asistente AI no está disponible temporalmente. Inténtalo de nuevo.",
    rateLimitMessage: "Estás enviando solicitudes demasiado rápido. Espera unos segundos.",
    brandGreeting:
      "👋 **¡Hola! Soy tu asistente de producción con inteligencia artificial para marcas y especialistas en marketing.**\n\nTe ayudo a descubrir creadores de contenido de IA destacados y planificar campañas virales:\n- 🔍 **Búsqueda de Creadores**: \"Quiero promocionar un producto para el cuidado de la piel. ¿Qué creadores son adecuados?\"\n- 💰 **Presupuesto**: \"¿Qué creador se adapta a un presupuesto de ₹10,000?\"\n- 🎬 **Concepto de Reel**: \"Sugiere una campaña de Reels de 15 segundos para mi marca de ropa.\"",
    creatorGreeting:
      "👋 **¡Hola Creador! Soy tu asistente creativo y de colaboración con IA.**\n\nTe ayudo a conectar con marcas, crear contenido viral y conseguir colaboraciones de alto valor:\n- 💼 **Descubrimiento de Marcas**: \"¿Qué marcas se adaptan a mi perfil de moda?\"\n- 💡 **Ideas de Contenido**: \"Sugiere ideas virales para un producto de cuidado facial.\"\n- 🤝 **Propuestas**: \"Redacta una propuesta de colaboración profesional para una marca.\"",
    brandQuickActions: [
      "Buscar creadores para cuidado facial",
      "Sugerir creadores de moda por menos de ₹20k",
      "Redactar brief de campaña para Reels de 15s",
      "Comparar creadores verificados destacados",
    ],
    creatorQuickActions: [
      "Buscar campañas de marcas compatibles",
      "Sugerir 3 ideas virales de Reels para mi nicho",
      "Escribir propuesta de colaboración para marca",
      "¿Cómo mejorar mi Passport Score?",
    ],
    suggestedFollowUpsBrand: [
      "¿Cuál de estos creadores tiene mayor tasa de interacción?",
      "Redacta un brief completo de campaña",
      "¿Cómo optimizar mi presupuesto en entregables?",
    ],
    suggestedFollowUpsCreator: [
      "Escribe un guion completo de 30s con gancho y CTA",
      "¿Cómo obtener el estado verificado en VeriCreator?",
      "Redacta un correo de propuesta para esta marca",
    ],
    autoDetectOption: "Detección automática",
    selectLanguageLabel: "Seleccionar idioma",
    fallbackNotice: "Motor de reglas heurísticas fuera de línea",
    escrowNotice: "Liquidación directa entre marca y creador (el depósito en garantía está inactivo).",
  },
  fr: {
    title: "Assistant IA Marketplace",
    roleBrand: "🏢 Marque",
    roleCreator: "🎨 Créateur",
    liveBadge: "IA en Direct",
    contextButton: "Contexte",
    clearButton: "Effacer",
    closeButton: "Fermer",
    inputPlaceholder: "Posez une question sur les créateurs, campagnes, tarifs...",
    sendButton: "Envoyer",
    stopButton: "Arrêter",
    copyButton: "Copier",
    copiedNotice: "Copié !",
    typingIndicator: "L'assistant IA analyse votre demande...",
    retryButton: "Réessayer",
    errorMessage: "L'assistant IA est temporairement indisponible. Veuillez réessayer.",
    rateLimitMessage: "Vous envoyez des requêtes trop rapidement. Veuillez patienter.",
    brandGreeting:
      "👋 **Bonjour ! Je suis votre assistant IA dédié aux marques et créateurs.**\n\nJe vous aide à découvrir des créateurs d'IA performants et à concevoir des campagnes percutantes :\n- 🔍 **Découverte de Créateurs** : \"Quels créateurs recommandez-vous pour un produit cosmétique ?\"\n- 💰 **Budget** : \"Quel créateur choisir pour un budget de ₹10,000 ?\"\n- 🎬 **Scénario Reel** : \"Proposez une idée de Reel de 15 secondes pour ma marque de mode.\"",
    creatorGreeting:
      "👋 **Bonjour Créateur ! Je suis votre assistant créatif IA.**\n\nJe vous aide à décrocher des partenariats et à concevoir du contenu viral :\n- 💼 **Opportunités** : \"Quelles marques correspondent à mon profil ?\"\n- 💡 **Idées de Contenu** : \"Suggérez 3 idées de Reels pour le secteur tech.\"\n- 🤝 **Pitchs** : \"Rédigez une proposition de partenariat percutante.\"",
    brandQuickActions: [
      "Trouver des créateurs pour lancement skincare",
      "Suggérer des créateurs mode sous ₹20,000",
      "Rédiger un brief de campagne Instagram Reel 15s",
    ],
    creatorQuickActions: [
      "Trouver des campagnes de marques compatibles",
      "Suggérer 3 idées de Reels viraux",
      "Rédiger une proposition de collaboration",
    ],
    suggestedFollowUpsBrand: [
      "Quel créateur a le meilleur taux d'engagement ?",
      "Rédigez un brief complet avec calendrier et livrables",
    ],
    suggestedFollowUpsCreator: [
      "Écrivez un script complet de 30 secondes avec accroche",
      "Comment obtenir le badge vérifié sur VeriCreator ?",
    ],
    autoDetectOption: "Détection automatique",
    selectLanguageLabel: "Choisir la langue",
    fallbackNotice: "Moteur de règles heuristiques hors ligne",
    escrowNotice: "Règlement direct entre la marque et le créateur (séquestre actuellement inactif).",
  },
  ar: {
    title: "مساعد السوق بالذكاء الاصطناعي",
    roleBrand: "🏢 صاحب العلامة التجارية",
    roleCreator: "🎨 صانع المحتوى",
    liveBadge: "ذكاء اصطناعي مباشر",
    contextButton: "السياق",
    clearButton: "مسح",
    closeButton: "إغلاق",
    inputPlaceholder: "اسأل عن صناع المحتوى، الحملات، الأسعار أو الاستراتيجيات...",
    sendButton: "إرسال",
    stopButton: "إيقاف",
    copyButton: "نسخ",
    copiedNotice: "تم النسخ!",
    typingIndicator: "المساعد الذكي يقوم بالتحليل...",
    retryButton: "إعادة المحاولة",
    errorMessage: "المساعد الذكي غير متوفر حالياً. يرجى المحاولة بعد قليل.",
    rateLimitMessage: "أنت ترسل الطلبات بسرعة كبيرة. يرجى الانتظار بضع ثوانٍ.",
    brandGreeting:
      "👋 **مرحباً بك! أنا مساعد الذ his الاصطناعي لأصحاب العلامات التجارية والمسوقين.**\n\nأساعدك في اكتشاف أفضل صناع محتوى الذكاء الاصطناعي والتخطيط لحملات تسويقية ناجحة:\n- 🔍 **اكتشاف المبدعين**: \"أريد الترويج لمنتج عناية بالبشرة. من هم المبدعون المناسبون؟\"\n- 💰 **تحديد الميزانية**: \"من هو أفضل صانع محتوى لميزانية قدرها ₹10,000؟\"\n- 🎬 **أفكار ريلز**: \"اقترح حملة ريلز مدتها 15 ثانية لعلامة تجارية في مجال الأزياء.\"",
    creatorGreeting:
      "👋 **مرحباً بك يا صانع المحتوى! أنا مساعدك الإبداعي بالذكاء الاصطناعي.**\n\nأساعدك في التواصل مع العلامات التجارية وصناعة محتوى ينتشر بقوة والحصول على رعاية مميزة:\n- 💼 **اكتشاف العلامات التجارية**: \"ما هي العلامات التجارية المناسبة لملفي الشخصي في الأزياء؟\"\n- 💡 **أفكار المحتوى**: \"اقترح أفكار ريلز لمنتج عناية بالبشرة.\"\n- 🤝 **كتابة العروض**: \"اكتب عرض تعاون احترافي لعلامة تجارية.\"",
    brandQuickActions: [
      "ابحث عن صناع محتوى لإطلاق منتج عناية بالبشرة",
      "اقترح صناع محتوى في الأزياء بأقل من ₹20,000",
      "اكتب ملخص حملة ريلز 15 ثانية على Instagram",
      "قارن بين أفضل المبدعين المعتمدين",
    ],
    creatorQuickActions: [
      "ابحث عن حملات علامات تجارية متوافقة",
      "اقترح 3 أفكار ريلز سريعة الانتشار لمجالي",
      "اكتب عرض تعاون لعلامة تجارية",
      "كيف أرفع درجة Passport Score الخاصة بي؟",
    ],
    suggestedFollowUpsBrand: [
      "من من هؤلاء المبدعين لديه أعلى معدل تفاعل؟",
      "اكتب ملخص حملة تسويقية كامل مع التسليمات والجدول الزمني",
      "كيف أقسم ميزانية ₹30,000 على التسليمات؟",
    ],
    suggestedFollowUpsCreator: [
      "اكتب نص فيديو كامل مدته 30 ثانية مع خطاف وجملة للحث على اتخاذ إجراء",
      "كيف أحصل على علامة التوثيق في VeriCreator؟",
      "اكتب مسودة بريد إلكتروني للتواصل مع هذه العلامة التجارية",
    ],
    autoDetectOption: "كشف تلقائي (Auto-detect)",
    selectLanguageLabel: "اختر اللغة",
    fallbackNotice: "محرك القواعد التجريبية دون اتصال",
    escrowNotice: "تسوية مباشرة بين العلامة التجارية والمبدع (الضمان المالي متوقف حالياً).",
  },
};

/**
 * Helper to get localized strings for any supported language with fallback to English
 */
export function getChatbotStrings(code: SupportedLanguageCode | string): ChatbotLocalizedStrings {
  if (code === "auto" || !code) {
    return CHATBOT_LOCALIZED_STRINGS.en;
  }
  return CHATBOT_LOCALIZED_STRINGS[code as ConcreteLanguageCode] || CHATBOT_LOCALIZED_STRINGS.en;
}
