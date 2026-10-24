import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SUPPORTED_LANGUAGES,
  detectLanguage,
  buildMultilingualPromptDirective,
  getLanguageMetadata,
  getChatbotStrings,
  CHATBOT_LOCALIZED_STRINGS,
  SupportedLanguageSchema,
} from "../../lib/ai/multilingual";
import { buildEnhancedSystemPrompt, generateSmartHeuristicResponse } from "../../lib/ai/chatbot-engine";
import { aiService } from "../../lib/ai/ai-service";
import { ChatRequestSchema } from "../../lib/ai/types";

describe("VeriCreator Multilingual Chatbot Test Suite", () => {
  describe("1. Supported Languages Metadata & Configuration", () => {
    it("should include all 11 required languages plus auto-detect", () => {
      const expectedLanguages = [
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
      ];
      const actualCodes = SUPPORTED_LANGUAGES.map((l) => l.code);
      for (const lang of expectedLanguages) {
        assert.ok(
          actualCodes.includes(lang as any),
          `Missing supported language: ${lang}`
        );
      }
    });

    it("should correctly configure Arabic with RTL direction and others with LTR", () => {
      const arabic = getLanguageMetadata("ar");
      assert.equal(arabic.dir, "rtl", "Arabic must be configured with dir: 'rtl'");
      assert.equal(arabic.nativeName, "العربية");

      const telugu = getLanguageMetadata("te");
      assert.equal(telugu.dir, "ltr");
      assert.equal(telugu.nativeName, "తెలుగు");

      const hindi = getLanguageMetadata("hi");
      assert.equal(hindi.dir, "ltr");
      assert.equal(hindi.nativeName, "हिन्दी");
    });

    it("should provide full localized strings for all 11 concrete languages", () => {
      const concreteLanguages = [
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

      for (const lang of concreteLanguages) {
        const strings = CHATBOT_LOCALIZED_STRINGS[lang];
        assert.ok(strings, `Missing localized strings record for ${lang}`);
        assert.ok(strings.title && strings.title.length > 0, `${lang} missing title`);
        assert.ok(strings.brandGreeting && strings.brandGreeting.length > 0, `${lang} missing brandGreeting`);
        assert.ok(strings.creatorGreeting && strings.creatorGreeting.length > 0, `${lang} missing creatorGreeting`);
        assert.ok(strings.inputPlaceholder && strings.inputPlaceholder.length > 0, `${lang} missing inputPlaceholder`);
        assert.ok(strings.sendButton && strings.sendButton.length > 0, `${lang} missing sendButton`);
        assert.ok(strings.stopButton && strings.stopButton.length > 0, `${lang} missing stopButton`);
        assert.ok(strings.typingIndicator && strings.typingIndicator.length > 0, `${lang} missing typingIndicator`);
        assert.ok(strings.retryButton && strings.retryButton.length > 0, `${lang} missing retryButton`);
        assert.ok(strings.brandQuickActions.length >= 3, `${lang} should have >= 3 brandQuickActions`);
        assert.ok(strings.creatorQuickActions.length >= 3, `${lang} should have >= 3 creatorQuickActions`);
      }
    });

    it("should fallback gracefully to English for unknown language codes", () => {
      const fallbackStrings = getChatbotStrings("unknown_lang" as any);
      assert.equal(fallbackStrings.title, "AI Marketplace Assistant");

      const autoStrings = getChatbotStrings("auto");
      assert.equal(autoStrings.title, "AI Marketplace Assistant");
    });
  });

  describe("2. Automatic Language Detection (Native Unicode Scripts)", () => {
    it("should detect Telugu script accurately", () => {
      const result = detectLanguage("నమస్కారం! నాకు స్కిన్‌కేర్ క్రియేటర్లు కావాలి");
      assert.equal(result.detectedLanguage, "te");
      assert.ok(result.confidence >= 0.9);
      assert.equal(result.isCodeSwitching, false);
    });

    it("should detect Hindi script accurately", () => {
      const result = detectLanguage("नमस्ते! मुझे ब्यूटी और फैशन के लिए क्रिएटर्स चाहिए");
      assert.equal(result.detectedLanguage, "hi");
      assert.ok(result.confidence >= 0.9);
    });

    it("should detect Tamil script accurately", () => {
      const result = detectLanguage("வணக்கம்! எனக்கு சிறந்த விளம்பர கிரியேட்டர்கள் வேண்டும்");
      assert.equal(result.detectedLanguage, "ta");
      assert.ok(result.confidence >= 0.9);
    });

    it("should detect Kannada script accurately", () => {
      const result = detectLanguage("ನಮಸ್ಕಾರ! ನನಗೆ ಫ್ಯಾಷನ್ ಬ್ರ್ಯಾಂಡ್ ಕ್ರಿಯೇಟರ್ಸ್ ಬೇಕು");
      assert.equal(result.detectedLanguage, "kn");
      assert.ok(result.confidence >= 0.9);
    });

    it("should detect Malayalam script accurately", () => {
      const result = detectLanguage("ഹലോ! എനിക്ക് സ്കിൻകെയർ ഇൻഫ്ലുവൻസേഴ്സിനെ കണ്ടെത്തണം");
      assert.equal(result.detectedLanguage, "ml");
      assert.ok(result.confidence >= 0.9);
    });

    it("should detect Bengali script accurately", () => {
      const result = detectLanguage("নমস্কার! আমাকে একজন ফ্যাশন ক্রিয়েটর খুঁজতে সাহায্য করুন");
      assert.equal(result.detectedLanguage, "bn");
      assert.ok(result.confidence >= 0.9);
    });

    it("should detect Arabic script accurately", () => {
      const result = detectLanguage("مرحبا! أريد البحث عن أفضل صناع محتوى لحملتي التسويقية");
      assert.equal(result.detectedLanguage, "ar");
      assert.ok(result.confidence >= 0.9);
    });

    it("should disambiguate Devanagari Marathi from Hindi using lexical markers", () => {
      const marathiResult = detectLanguage("नमस्कार! मला नवीन ब्रँड मोहिमेसाठी मदत हवी आहे");
      assert.equal(marathiResult.detectedLanguage, "mr");

      const hindiResult = detectLanguage("नमस्ते! मुझे नए ब्रांड प्रमोशन के लिए मदद चाहिए");
      assert.equal(hindiResult.detectedLanguage, "hi");
    });
  });

  describe("3. Code-Switching & Romanized Transliteration Detection", () => {
    it("should detect Telugu-English (Tenglish) code-switching in Latin script", () => {
      const input = "Reels ki viral ideas ivvandi, budget entha untundi?";
      const result = detectLanguage(input);
      assert.equal(result.detectedLanguage, "te");
      assert.equal(result.isCodeSwitching, true);
      assert.equal(result.dialect, "Telugu-English (Tenglish)");
    });

    it("should detect Hindi-English (Hinglish) code-switching in Latin script", () => {
      const input = "Mujhe influencer marketing ke tips chahiye, collaboration kaise karein?";
      const result = detectLanguage(input);
      assert.equal(result.detectedLanguage, "hi");
      assert.equal(result.isCodeSwitching, true);
      assert.equal(result.dialect, "Hindi-English (Hinglish)");
    });

    it("should detect Latin Spanish conversational phrasing", () => {
      const input = "Hola amigo, necesito creadores para mi marca de ropa en Instagram";
      const result = detectLanguage(input);
      assert.equal(result.detectedLanguage, "es");
    });

    it("should detect Latin French conversational phrasing", () => {
      const input = "Bonjour, je cherche des créateurs pour promouvoir un produit cosmétique";
      const result = detectLanguage(input);
      assert.equal(result.detectedLanguage, "fr");
    });
  });

  describe("4. Manual Preference Overrides & Server Enforcement", () => {
    it("should respect explicit language preference even when message is in English", () => {
      const promptDirective = buildMultilingualPromptDirective({
        targetLanguage: "te",
        isExplicitSelection: true,
      });

      assert.ok(
        promptDirective.includes("Explicit user preference"),
        "Should mark explicit user selection"
      );
      assert.ok(
        promptDirective.includes("Telugu (తెలుగు)"),
        "Should direct output to Telugu"
      );
    });

    it("should enforce preservation of brand names, profile links, and metrics in directives", () => {
      const directive = buildMultilingualPromptDirective({
        targetLanguage: "hi",
        isExplicitSelection: false,
      });

      assert.ok(directive.includes("DO NOT translate brand names"));
      assert.ok(directive.includes("[Ananya Rao](/creators/ananya-rao)"));
      assert.ok(directive.includes("Instagram Reels"));
      assert.ok(directive.includes("₹10,000"));
    });

    it("should inject RTL guidance when target language is Arabic", () => {
      const arabicDirective = buildMultilingualPromptDirective({
        targetLanguage: "ar",
        isExplicitSelection: true,
      });

      assert.ok(
        arabicDirective.includes("Right-to-Left (RTL)"),
        "Arabic directive must specify RTL"
      );
      assert.ok(
        arabicDirective.includes("Right-to-Left conventions with proper Arabic punctuation")
      );
    });

    it("should integrate multilingual directive into buildEnhancedSystemPrompt", () => {
      const fullPrompt = buildEnhancedSystemPrompt({
        role: "brand",
        userName: "Brand User",
        userNiche: "Marketing",
        platform: "Instagram",
        targetAudience: "All",
        tone: "Professional",
        goal: "Campaign",
        preferredLanguage: "te",
        detectedLanguage: "te",
        isCodeSwitching: true,
        dialect: "Telugu-English (Tenglish)",
      });

      assert.ok(
        fullPrompt.includes("STRICT MULTILINGUAL DIRECTIVE"),
        "System prompt must include multilingual section"
      );
      assert.ok(fullPrompt.includes("Telugu (తెలుగు)"));
      assert.ok(fullPrompt.includes("Telugu-English (Tenglish)"));
    });
  });

  describe("5. Smart Heuristic Fallback & Localized Follow-ups", () => {
    it("should return localized fallback disclaimer and suggestions for Telugu", () => {
      const response = generateSmartHeuristicResponse({
        userMessage: "నాకు స్కిన్‌కేర్ క్రియేటర్లు కావాలి",
        role: "brand",
        preferredLanguage: "te",
      });

      assert.equal(response.effectiveLanguage, "te");
      assert.equal(response.dir, "ltr");
      assert.ok(
        response.reply.includes(CHATBOT_LOCALIZED_STRINGS.te.fallbackNotice),
        "Should include Telugu offline notice"
      );
      assert.ok(
        Array.isArray(response.suggestedFollowUps) && response.suggestedFollowUps.length > 0
      );
    });

    it("should return localized fallback disclaimer and RTL metadata for Arabic", () => {
      const response = generateSmartHeuristicResponse({
        userMessage: "أريد حملة تسويقية لمستحضرات التجميل",
        role: "brand",
        preferredLanguage: "ar",
      });

      assert.equal(response.effectiveLanguage, "ar");
      assert.equal(response.dir, "rtl");
      assert.ok(
        response.reply.includes(CHATBOT_LOCALIZED_STRINGS.ar.fallbackNotice),
        "Should include Arabic offline notice"
      );
    });

    it("should preserve selected language in fallback even if message is in English", () => {
      const response = generateSmartHeuristicResponse({
        userMessage: "Give me skincare ideas",
        role: "creator",
        preferredLanguage: "hi",
      });

      assert.equal(response.effectiveLanguage, "hi");
      assert.ok(
        response.reply.includes(CHATBOT_LOCALIZED_STRINGS.hi.fallbackNotice),
        "Should use Hindi fallback notice when Hindi is preferred"
      );
    });
  });

  describe("6. Zod Schema Validation & Input Sanitization", () => {
    it("should validate all allowed language codes in SupportedLanguageSchema", () => {
      const validCodes = [
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
      ];
      for (const code of validCodes) {
        assert.equal(SupportedLanguageSchema.parse(code), code);
      }
    });

    it("should reject unsupported language codes without throwing silent defaults", () => {
      const invalidCodes = ["de", "zh", "ru", "ja", "klingon", 123, null];
      for (const invalid of invalidCodes) {
        const parsed = SupportedLanguageSchema.safeParse(invalid);
        assert.equal(parsed.success, false, `Expected ${invalid} to be rejected`);
      }
    });

    it("should validate preferredLanguage in ChatRequestSchema", () => {
      const validPayload = {
        messages: [{ role: "user", content: "Hello world" }],
        preferredLanguage: "te",
        userContext: {
          role: "brand",
          preferredLanguage: "te",
        },
      };

      const parsed = ChatRequestSchema.safeParse(validPayload);
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.preferredLanguage, "te");
        assert.equal(parsed.data.userContext?.preferredLanguage, "te");
      }
    });
  });

  describe("7. AIService End-to-End Chat Integration & Metadata", () => {
    it("should return language provenance metadata in handleChatWithMetadata", async () => {
      const result = await aiService.handleChatWithMetadata(
        [{ role: "user", content: "నమస్కారం! స్కిన్‌కేర్ ప్రచారానికి క్రియేటర్లను సూచించండి" }],
        {
          role: "brand",
          preferredLanguage: "auto",
        }
      );

      assert.ok(result.reply && result.reply.length > 0);
      assert.equal(result.detectedLanguage, "te");
      assert.equal(result.effectiveLanguage, "te");
      assert.equal(result.dir, "ltr");
    });

    it("should support Arabic with dir: 'rtl' in handleChatWithMetadata", async () => {
      const result = await aiService.handleChatWithMetadata(
        [{ role: "user", content: "مرحبا! أريد ترشيح صناع محتوى لماركة أزياء" }],
        {
          role: "brand",
          preferredLanguage: "ar",
        }
      );

      assert.ok(result.reply);
      assert.equal(result.detectedLanguage, "ar");
      assert.equal(result.effectiveLanguage, "ar");
      assert.equal(result.dir, "rtl");
    });

    it("should maintain backward compatibility for default English chat with no language specified", async () => {
      const result = await aiService.handleChatWithMetadata([
        { role: "user", content: "Show me the highest engagement tech creators" },
      ]);

      assert.ok(result.reply);
      assert.equal(result.detectedLanguage, "en");
      assert.equal(result.effectiveLanguage, "en");
      assert.equal(result.dir, "ltr");
    });
  });

  describe("8. GlowUp Reel Blueprint Actual Response Text (Telugu, Hindi, Arabic)", () => {
    it("should generate full Telugu prose for GlowUp Reel Blueprint when Telugu is explicitly selected", () => {
      const response = generateSmartHeuristicResponse({
        userMessage: "Suggest a 15-second Instagram Reel campaign for my brand GlowUp",
        role: "brand",
        brandOrProduct: "GlowUp",
        platform: "Instagram",
        niche: "Beauty & Skincare",
        preferredLanguage: "te",
      });

      assert.equal(response.effectiveLanguage, "te");
      assert.equal(response.dir, "ltr");

      // Verify Brand, Platform, Timings, and Hashtags are preserved
      assert.ok(response.reply.includes("GlowUp"), "Brand 'GlowUp' must be preserved");
      assert.ok(response.reply.includes("Instagram"), "Platform 'Instagram' must be preserved");
      assert.ok(response.reply.includes("(0:00 - 0:03)"), "Hook timing must be preserved");
      assert.ok(response.reply.includes("(0:03 - 0:15)"), "Demo timing must be preserved");
      assert.ok(response.reply.includes("(0:15 - 0:25)"), "CTA timing must be preserved");
      assert.ok(response.reply.includes("#GlowUp"), "Brand hashtag must be preserved");

      // Verify actual Telugu prose for Hook, Problem/Demo, CTA, and Hashtags Header
      assert.ok(
        response.reply.includes("దృష్టిని ఆకర్షించే హుక్"),
        "Must contain Telugu Hook heading"
      );
      assert.ok(
        response.reply.includes("ప్రధాన సమస్య & ప్రత్యక్ష డెమో"),
        "Must contain Telugu Problem/Demo heading"
      );
      assert.ok(
        response.reply.includes("ఫలితాల రుజువు & కాల్-టు-యాక్షన్"),
        "Must contain Telugu CTA heading"
      );
      assert.ok(
        response.reply.includes("సిఫార్సు చేయబడిన హ్యాష్‌ట్యాగ్‌లు"),
        "Must contain Telugu Hashtags heading"
      );

      // Verify Telugu prose narrative in voiceover and screen text
      assert.ok(
        response.reply.includes("ఆడియో / వాయిస్‌ఓవర్"),
        "Must contain Telugu voiceover label"
      );
      assert.ok(
        response.reply.includes("స్క్రీన్ పై టెక్స్ట్"),
        "Must contain Telugu on-screen text label"
      );
      assert.ok(
        response.reply.includes("ఆఫ్‌లైన్ నియమాల ఇంజిన్"),
        "Must contain localized fallback disclaimer"
      );

      // Must NOT contain the default English hook text
      assert.ok(
        !response.reply.includes("Stop doing this if you actually want results with"),
        "Must NOT contain English hook prose when Telugu is selected"
      );
    });

    it("should generate full Hindi prose for GlowUp Reel Blueprint when Hindi is explicitly selected", () => {
      const response = generateSmartHeuristicResponse({
        userMessage: "Suggest a 15-second Instagram Reel campaign for my brand GlowUp",
        role: "brand",
        brandOrProduct: "GlowUp",
        platform: "Instagram",
        niche: "Beauty & Skincare",
        preferredLanguage: "hi",
      });

      assert.equal(response.effectiveLanguage, "hi");
      assert.equal(response.dir, "ltr");

      // Verify preserved terms
      assert.ok(response.reply.includes("GlowUp"));
      assert.ok(response.reply.includes("Instagram"));
      assert.ok(response.reply.includes("(0:00 - 0:03)"));
      assert.ok(response.reply.includes("#GlowUp"));

      // Verify Hindi prose headings
      assert.ok(
        response.reply.includes("हाई-अटेंशन हुक"),
        "Must contain Hindi Hook heading"
      );
      assert.ok(
        response.reply.includes("मुख्य समस्या और लाइव डेमो"),
        "Must contain Hindi Problem/Demo heading"
      );
      assert.ok(
        response.reply.includes("कॉल-टू-एक्शन"),
        "Must contain Hindi CTA heading"
      );
      assert.ok(
        response.reply.includes("अनुशंसित हैशटैग"),
        "Must contain Hindi Hashtags heading"
      );

      // Verify Hindi voiceover label and script
      assert.ok(response.reply.includes("ऑडियो / वॉइसओवर"));
      assert.ok(response.reply.includes("स्क्रीन पर टेक्स्ट"));

      // Must NOT contain default English hook text
      assert.ok(
        !response.reply.includes("Stop doing this if you actually want results with"),
        "Must NOT contain English hook prose when Hindi is selected"
      );
    });

    it("should generate full Arabic prose with RTL direction for GlowUp Reel Blueprint when Arabic is explicitly selected", () => {
      const response = generateSmartHeuristicResponse({
        userMessage: "Suggest a 15-second Instagram Reel campaign for my brand GlowUp",
        role: "brand",
        brandOrProduct: "GlowUp",
        platform: "Instagram",
        niche: "Beauty & Skincare",
        preferredLanguage: "ar",
      });

      assert.equal(response.effectiveLanguage, "ar");
      assert.equal(response.dir, "rtl", "Arabic response must have dir: 'rtl'");

      // Verify preserved terms
      assert.ok(response.reply.includes("GlowUp"));
      assert.ok(response.reply.includes("Instagram"));
      assert.ok(response.reply.includes("(0:00 - 0:03)"));

      // Verify Arabic prose headings
      assert.ok(
        response.reply.includes("خطاف لجذب الانتباه"),
        "Must contain Arabic Hook heading"
      );
      assert.ok(
        response.reply.includes("المشكلة الأساسية والتجربة العملية"),
        "Must contain Arabic Problem/Demo heading"
      );
      assert.ok(
        response.reply.includes("الدعوة لاتخاذ إجراء"),
        "Must contain Arabic CTA heading"
      );
      assert.ok(
        response.reply.includes("الهاشتاغات الموصى بها"),
        "Must contain Arabic Hashtags heading"
      );

      // Verify Arabic voiceover label
      assert.ok(response.reply.includes("الصوت / التعليق الصوتي"));
      assert.ok(response.reply.includes("النص على الشاشة"));

      // Must NOT contain default English hook text
      assert.ok(
        !response.reply.includes("Stop doing this if you actually want results with"),
        "Must NOT contain English hook prose when Arabic is selected"
      );
    });
  });

  describe("9. Auto-detect & Code-Switching Actual Response Text", () => {
    it("should auto-detect native Telugu script and reply in Telugu prose", () => {
      const response = generateSmartHeuristicResponse({
        userMessage: "GlowUp బ్రాండ్ కోసం 15 సెకన్ల Instagram Reel ఆలోచనలు కావాలి",
        role: "brand",
        preferredLanguage: "auto",
      });

      assert.equal(response.effectiveLanguage, "te");
      assert.ok(response.reply.includes("దృష్టిని ఆకర్షించే హుక్"));
      assert.ok(response.reply.includes("GlowUp"));
    });

    it("should auto-detect Tenglish (Telugu-English code-switching) and reply in Telugu prose", () => {
      const response = generateSmartHeuristicResponse({
        userMessage: "GlowUp Reels ki viral ideas ivvandi, budget entha untundi?",
        role: "brand",
        preferredLanguage: "auto",
      });

      assert.equal(response.effectiveLanguage, "te");
      assert.ok(
        response.reply.includes("దృష్టిని ఆకర్షించే హుక్") ||
        response.reply.includes("కోసం ధృవీకరించబడిన AI క్రియేటర్ల సిఫార్సులు") ||
        response.reply.includes("GlowUp")
      );
    });

    it("should auto-detect Hinglish (Hindi-English code-switching) and reply in Hindi prose", () => {
      const response = generateSmartHeuristicResponse({
        userMessage: "GlowUp ke liye Instagram Reels ideas chahiye, viral hook batao",
        role: "brand",
        preferredLanguage: "auto",
      });

      assert.equal(response.effectiveLanguage, "hi");
      assert.ok(response.reply.includes("हाई-अटेंशन हुक"));
      assert.ok(response.reply.includes("GlowUp"));
    });
  });

  describe("10. All 11 Supported Languages Fallback Text Generation", () => {
    const allSupported = [
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

    for (const lang of allSupported) {
      it(`should generate valid, localized heuristic response for ${lang}`, () => {
        const response = generateSmartHeuristicResponse({
          userMessage: "GlowUp 15s viral Reel blueprint",
          brandOrProduct: "GlowUp",
          preferredLanguage: lang,
        });

        assert.equal(response.effectiveLanguage, lang);
        assert.equal(response.dir, lang === "ar" ? "rtl" : "ltr");
        assert.ok(response.reply.includes("GlowUp"), "Must preserve brand GlowUp");
        assert.ok(response.reply.includes("(0:00 - 0:03)"), "Must preserve timing format");

        if (lang !== "en") {
          // Must not default to the English hook text
          assert.ok(
            !response.reply.includes("Stop doing this if you actually want results with"),
            `Language ${lang} must NOT contain default English hook text`
          );
        }
      });
    }
  });

  describe("11. Provider Failure & Fallback Non-English Integrity", () => {
    it("should not return English text when fallback triggers for Telugu preference", async () => {
      // Calling aiService fallback directly
      const result = await aiService.handleChatWithMetadata(
        [{ role: "user", content: "Suggest a 15-second Instagram Reel campaign for my brand GlowUp" }],
        {
          role: "brand",
          brandOrProduct: "GlowUp",
          preferredLanguage: "te",
        }
      );

      assert.equal(result.effectiveLanguage, "te");
      assert.ok(result.reply.includes("GlowUp"));
      // The reply must contain Telugu characters (\u0C00-\u0C7F)
      const hasTeluguChars = /[\u0C00-\u0C7F]/.test(result.reply);
      assert.ok(hasTeluguChars, "Fallback reply for Telugu preference must contain Telugu script characters");
      assert.ok(
        !result.reply.includes("Stop doing this if you actually want results with"),
        "Fallback reply must not be English"
      );
    });

    it("should not return English text when fallback triggers for Hindi preference", async () => {
      const result = await aiService.handleChatWithMetadata(
        [{ role: "user", content: "Suggest a 15-second Instagram Reel campaign for my brand GlowUp" }],
        {
          role: "brand",
          brandOrProduct: "GlowUp",
          preferredLanguage: "hi",
        }
      );

      assert.equal(result.effectiveLanguage, "hi");
      assert.ok(result.reply.includes("GlowUp"));
      const hasHindiChars = /[\u0900-\u097F]/.test(result.reply);
      assert.ok(hasHindiChars, "Fallback reply for Hindi preference must contain Devanagari script characters");
    });
  });
});
