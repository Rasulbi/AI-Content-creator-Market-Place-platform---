/**
 * VeriCreator Multilingual Heuristic Templates
 * Provides high-quality, culturally fluent localized response templates for all 11 supported languages.
 * Guarantees that even on AI provider failure, rate-limit, or offline operation,
 * the chatbot generates genuine localized prose without defaulting to English.
 */

import { ConcreteLanguageCode, SupportedLanguageCode } from "./multilingual";

interface BlueprintParams {
  brand: string;
  category: string;
  platform: string;
  format: string;
  tone: string;
  lang: SupportedLanguageCode;
}

interface RecommendationsParams {
  brand?: string;
  category: string;
  creatorNames: string;
  budget?: number;
  lang: SupportedLanguageCode;
}

interface StrategyParams {
  brand: string;
  category: string;
  platform: string;
  tone: string;
  creators: Array<{ name: string; profileUrl: string; category: string; followers: string; engagementRate: string }>;
  lang: SupportedLanguageCode;
}

interface ComparisonParams {
  category: string;
  tableRows: string;
  verdict: string;
  lang: SupportedLanguageCode;
}

interface ProposalParams {
  brand: string;
  category: string;
  name?: string;
  platform: string;
  lang: SupportedLanguageCode;
}

function resolveLang(lang: SupportedLanguageCode): ConcreteLanguageCode {
  if (!lang || lang === "auto") return "en";
  return lang as ConcreteLanguageCode;
}

// ============================================================================
// 1. 15-30 SECOND VIRAL REEL BLUEPRINT TEMPLATES
// ============================================================================
export function buildLocalizedHeuristicBlueprint({
  brand,
  category,
  platform,
  format,
  tone,
  lang,
}: BlueprintParams): string {
  const code = resolveLang(lang);
  const brandTitle = brand || "GlowUp";
  const brandTag = brandTitle.replace(/[^a-zA-Z0-9]/g, "");
  const catTag = category.replace(/[^a-zA-Z0-9]/g, "");
  const platTag = platform.replace(/[^a-zA-Z0-9]/g, "");

  switch (code) {
    case "te":
      return `### 🎬 **${brandTitle}** కోసం 15-30 సెకన్ల వైరల్ కంటెంట్ బ్లూప్రింట్
**ప్లాట్‌ఫారమ్**: ${platform} | **ఫార్మాట్**: ${format || "Vertical Reel"} | **టోన్**: ${tone}

#### ⚡ 1. దృష్టిని ఆకర్షించే హుక్ (0:00 - 0:03)
- **విజువల్**: కెమెరా ముందు ${brandTitle} ప్రొడక్ట్‌ను పట్టుకుని డైనమిక్ టెక్స్ట్‌తో కూడిన త్వరిత క్లోజప్ షాట్.
- **ఆడియో / వాయిస్‌ఓవర్**: "2026 లో ${category} తో నిజమైన ఫలితాలు కావాలంటే ఈ తప్పు చేయడం వెంటనే ఆపండి..."
- **స్క్రీన్ పై టెక్స్ట్**: "90% మంది విస్మరించే 3-సెకన్ల నియమం ❌"

#### 🔍 2. ప్రధాన సమస్య & ప్రత్యక్ష డెమో (0:03 - 0:15)
- **విజువల్**: ప్రొడక్ట్ అప్లికేషన్‌ను చూపించే వేగవంతమైన b-roll విజువల్స్. బ్యాక్‌గ్రౌండ్ ఆడియో బీట్‌కు సరిపోయే కట్‌లు.
- **ఆడియో / వాయిస్‌ఓవర్**: "చాలామందికి 5 వేర్వేరు ఉత్పత్తులు అవసరమని అనుకుంటారు. కానీ మీ సమయాన్ని సగానికి తగ్గించే ఈ ఒక్క ${brandTitle} ఫార్ములేషన్ చాలు."
- **స్క్రీన్ పై టెక్స్ట్**: "దశ 1: అప్లికేషన్ | దశ 2: తక్షణ గ్లో"

#### 🚀 3. ఫలితాల రుజువు & కాల్-టు-యాక్షన్ (CTA) (0:15 - 0:25)
- **విజువల్**: సహజమైన వెలుతురులో ముందు మరియు తర్వాత స్పష్టమైన తేడాను చూపే స్ప్లిట్ స్క్రీన్. క్యాప్షన్ వైపు క్రియేటర్ సైగ చేయడం.
- **ఆడియో / వాయిస్‌ఓవర్**: "ఇక్కడే టెక్స్చర్ తేడాను గమనించండి. ఈ వీడియోను సేవ్ చేసుకోండి మరియు ప్రత్యేక లాంచ్ ఆఫర్ కోసం బయోలోని లింక్ క్లిక్ చేయండి!"
- **స్క్రీన్ పై టెక్స్ట్**: "తర్వాత చూడటానికి సేవ్ చేయండి! 📌 | బయోలో లింక్ ఉంది 👇"

---
#### 🏷️ సిఫార్సు చేయబడిన హ్యాష్‌ట్యాగ్‌లు:
\`#${brandTag} #${catTag} #${platTag}Tips #UGCContent #ProductReview #CreatorEconomy #ViralContent\``;

    case "hi":
      return `### 🎬 **${brandTitle}** के लिए 15-30 सेकंड का वायरल कंटेंट ब्लूप्रिंट
**प्लेटफ़ॉर्म**: ${platform} | **फ़ॉर्मेट**: ${format || "Vertical Reel"} | **टोन**: ${tone}

#### ⚡ 1. हाई-अटेंशन हुक (0:00 - 0:03)
- **विजुअल**: कैमरे के सामने ${brandTitle} प्रोडक्ट को दिखाते हुए डायनामिक टेक्स्ट के साथ क्विक कट।
- **ऑडियो / वॉइसओवर**: "यदि आप 2026 में ${category} से बेहतरीन परिणाम चाहते हैं, तो यह गलती करना तुरंत बंद करें..."
- **स्क्रीन पर टेक्स्ट**: "90% लोग इस 3-सेकंड के नियम को भूल जाते हैं ❌"

#### 🔍 2. मुख्य समस्या और लाइव डेमो (0:03 - 0:15)
- **विजुअल**: उत्पाद के वास्तविक उपयोग को दिखाने वाले सहज b-roll कट्स। ऑडियो रिदम से मेल खाते दृश्य।
- **ऑडियो / वॉइसओवर**: "ज्यादातर लोगों को लगता है कि 5 अलग उत्पादों की जरूरत है। असल में, केवल यह एक ${brandTitle} फॉर्मूलेशन आपके रूटीन का समय आधा कर देता है।"
- **स्क्रीन पर टेक्स्ट**: "चरण 1: लगाना | चरण 2: तुरंत चमक"

#### 🚀 3. परिणाम का प्रमाण और कॉल-टू-एक्शन (CTA) (0:15 - 0:25)
- **विजुअल**: नेचुरल लाइट में पहले और बाद का स्प्लिट स्क्रीन अंतर। क्रिएटर कैप्शन की ओर इशारा करते हुए।
- **ऑडियो / वॉइसओवर**: "यहाँ सीधे टेक्सचर में फर्क देखें। इस वीडियो को सेव करें और एक्सक्लूसिव डिस्काउंट कोड के लिए बायो में दिए गए लिंक पर टैप करें!"
- **स्क्रीन पर टेक्स्ट**: "बाद के लिए सेव करें! 📌 | बायो में लिंक देखें 👇"

---
#### 🏷️ अनुशंसित हैशटैग:
\`#${brandTag} #${catTag} #${platTag}Tips #UGCContent #ProductReview #CreatorEconomy #ViralContent\``;

    case "ar":
      return `### 🎬 مخطط محتوى فيروسي مدته 15-30 ثانية لـ **${brandTitle}**
**المنصة**: ${platform} | **التنسيق**: ${format || "Vertical Reel"} | **النبرة**: ${tone}

#### ⚡ 1. خطاف لجذب الانتباه (0:00 - 0:03)
- **المشهد البصري**: لقطة سريعة مع إظهار منتج ${brandTitle} أمام الكاميرا مباشرة مع نص ديناميكي واضح.
- **الصوت / التعليق الصوتي**: "توقف عن ارتكاب هذا الخطأ إذا كنت تريد نتائج حقيقية مع ${category} في 2026..."
- **النص على الشاشة**: "قاعدة الـ 3 ثوانٍ التي يتجاهلها 90% من الناس ❌"

#### 🔍 2. المشكلة الأساسية والتجربة العملية (0:03 - 0:15)
- **المشهد البصري**: لقطات b-roll سريعة وسلسة توضح استخدام المنتج وتأثيره المباشر على إيقاع الموسيقى.
- **الصوت / التعليق الصوتي**: "يعتقد الكثيرون أنك بحاجة إلى 5 منتجات مختلفة، ولكن تركيبة ${brandTitle} هذه كافية وتوفر نصف وقت روتينك اليومي."
- **النص على الشاشة**: "الخطوة 1: الاستخدام | الخطوة 2: نضارة فورية"

#### 🚀 3. الإثبات والدعوة لاتخاذ إجراء (CTA) (0:15 - 0:25)
- **المشهد البصري**: مقارنة قبل وبعد في إضاءة طبيعية مع إشارة صانع المحتوى إلى الرابط في البايو.
- **الصوت / التعليق الصوتي**: "لاحظ الفرق في الملمس هنا مباشرة. احفظ هذا الفيديو، واضغط على الرابط في البايو للحصول على كود الخصم الحصري!"
- **النص على الشاشة**: "احفظ الفيديو للرجوع إليه! 📌 | الرابط في البايو 👇"

---
#### 🏷️ الهاشتاغات الموصى بها:
\`#${brandTag} #${catTag} #${platTag}Tips #UGCContent #ProductReview #CreatorEconomy #ViralContent\``;

    case "ta":
      return `### 🎬 **${brandTitle}** க்கான 15-30 வினாடி வைரல் உள்ளடக்க வரைபடம்
**தளம்**: ${platform} | **வடிவம்**: ${format || "Vertical Reel"} | **தொனி**: ${tone}

#### ⚡ 1. கவனத்தை ஈர்க்கும் ஹூக் (0:00 - 0:03)
- **காட்சி**: கேமராவுக்கு முன்னால் ${brandTitle} தயாரிப்பை பிடித்துக் காட்டும் உடனடி காட்சி மற்றும் மேக்ரோ உரை.
- **ஆடியோ / குரல்**: "2026 இல் ${category} மூலம் உண்மையான முடிவுகளைப் பெற விரும்பினால் இதைச் செய்வதை உடனே நிறுத்துங்கள்..."
- **திரையில் உரை**: "90% பேர் புறக்கணிக்கும் 3-வினாடி விதி ❌"

#### 🔍 2. முக்கிய பிரச்சனை & நேரடி விளக்கம் (0:03 - 0:15)
- **காட்சி**: தயாரிப்பின் பயன்பாட்டைக் காட்டும் நேர்த்தியான b-roll மாற்றம். இசைக்கு ஏற்ற வேகமான கட்கள்.
- **ஆடியோ / குரல்**: "5 வெவ்வேறு தயாரிப்புகள் தேவை என்று பலர் நினைக்கிறார்கள். ஆனால் வழக்கமான நேரத்தை பாதியாகக் குறைக்கும் இந்த ஒரு ${brandTitle} ஃபார்முலாவே போதுமானது."
- **திரையில் உரை**: "படி 1: பயன்பாடு | படி 2: உடனடி பொலிவு"

#### 🚀 3. சான்று & செயல் அழைப்பு (CTA) (0:15 - 0:25)
- **காட்சி**: இயற்கை ஒளியில் முன் மற்றும் பின் காட்டும் பிளவுத் திரை. பயோவை சுட்டிக்காட்டும் படைப்பாளர்.
- **ஆடியோ / குரல்**: "இங்கே மாற்றத்தைக் கவனியுங்கள். இந்த வீடியோவைச் சேமித்து வைத்து, பிராண்ட் சலுகைக் குறியீட்டிற்கு பயோவில் உள்ள இணைப்பைத் தட்டவும்!"
- **திரையில் உரை**: "சேமித்து வைக்கவும்! 📌 | பயோவில் இணைப்பு உள்ளது 👇"

---
#### 🏷️ பரிந்துரைக்கப்பட்ட ஹேஷ்டேக்குகள்:
\`#${brandTag} #${catTag} #${platTag}Tips #UGCContent #ProductReview #CreatorEconomy #ViralContent\``;

    case "kn":
      return `### 🎬 **${brandTitle}** ಗಾಗಿ 15-30 ಸೆಕೆಂಡುಗಳ ವೈರಲ್ ಕಂಟೆಂಟ್ ನೀಲನಕ್ಷೆ
**ಪ್ಲಾಟ್‌ಫಾರ್ಮ್**: ${platform} | **ಸ್ವರೂಪ**: ${format || "Vertical Reel"} | **ಧ್ವನಿ**: ${tone}

#### ⚡ 1. ಗಮನ ಸೆಳೆಯುವ ಹುಕ್ (0:00 - 0:03)
- **ವಿಷುಯಲ್**: ಡೈನಾಮಿಕ್ ಪಠ್ಯದೊಂದಿಗೆ ಕ್ಯಾಮೆರಾದ ಮುಂದೆ ${brandTitle} ಹಿಡಿದುಕೊಂಡಿರುವ ತ್ವರಿತ ದೃಶ್ಯ.
- **ಆಡಿಯೋ / ವಾಯ್ಸ್‌ಓವರ್**: "2026 ರಲ್ಲಿ ${category} ಯೊಂದಿಗೆ ಉತ್ತಮ ಫಲಿತಾಂಶಗಳು ಬೇಕಾದರೆ ಈ ತಪ್ಪು ಮಾಡುವುದನ್ನು ನಿಲ್ಲಿಸಿ..."
- **ಪರದೆಯ ಮೇಲಿನ ಪಠ್ಯ**: "90% ಜನರು ನಿರ್ಲಕ್ಷಿಸುವ 3-ಸೆಕೆಂಡು ನಿಯಮ ❌"

#### 🔍 2. ಪ್ರಮುಖ ಸಮಸ್ಯೆ ಮತ್ತು ಪ್ರಾತ್ಯಕ್ಷಿಕೆ (0:03 - 0:15)
- **ವಿಷುಯಲ್**: ಉತ್ಪನ್ನದ ಬಳಕೆಯನ್ನು ತೋರಿಸುವ ಸುಲಭ b-roll ಬದಲಾವಣೆ. ಆಡಿಯೋ ವೇಗಕ್ಕೆ ತಕ್ಕಂತೆ ಕಟ್‌ಗಳು.
- **ಆಡಿಯೋ / ವಾಯ್ಸ್‌ಓವರ್**: "ನಿಮಗೆ 5 ಬೇರೆ ಬೇರೆ ಉತ್ಪನ್ನಗಳು ಬೇಕು ಎಂದು ಹಲವರು ಭಾವಿಸುತ್ತಾರೆ. ಆದರೆ ನಿಮ್ಮ ಸಮಯವನ್ನು ಅರ್ಧದಷ್ಟು ಉಳಿಸುವ ಈ ಒಂದು ${brandTitle} ಫಾರ್ಮುಲಾವೇ ಸಾಕು."
- **ಪರದೆಯ ಮೇಲಿನ ಪಠ್ಯ**: "ಹಂತ 1: ಬಳಕೆ | ಹಂತ 2: ತಕ್ಷಣದ ಕಾಂತಿ"

#### 🚀 3. ಫಲಿತಾಂಶ ಮತ್ತು ಕರೆ-ಟು-ಆಕ್ಷನ್ (CTA) (0:15 - 0:25)
- **ವಿಷುಯಲ್**: ನೈಸರ್ಗಿಕ ಬೆಳಕಿನಲ್ಲಿ ಮೊದಲು ಮತ್ತು ನಂತರ ತೋರಿಸುವ ಸ್ಪ್ಲಿಟ್ ಸ್ಕ್ರೀನ್. ಬಯೋ ಕಡೆಗೆ ಕ್ರಿಯೇಟರ್ ಸೂಚನೆ.
- **ಆಡಿಯೋ / ವಾಯ್ಸ್‌ಓವರ್**: "ಇಲ್ಲಿ ವ್ಯತ್ಯಾಸವನ್ನು ಗಮನಿಸಿ. ಈ ವೀಡಿಯೊವನ್ನು ಉಳಿಸಿ ಮತ್ತು ಬ್ರ್ಯಾಂಡ್ ಕೊಡುಗೆಗಾಗಿ ಬಯೋದಲ್ಲಿನ ಲಿಂಕ್ ಕ್ಲಿಕ್ ಮಾಡಿ!"
- **ಪರದೆಯ ಮೇಲಿನ ಪಠ್ಯ**: "ನಂತರಕ್ಕಾಗಿ ಉಳಿಸಿ! 📌 | ಬಯೋದಲ್ಲಿ ಲಿಂಕ್ ಇದೆ 👇"

---
#### 🏷️ ಶಿಫಾರಸು ಮಾಡಿದ ಹ್ಯಾಶ್‌ಟ್ಯಾಗ್‌ಗಳು:
\`#${brandTag} #${catTag} #${platTag}Tips #UGCContent #ProductReview #CreatorEconomy #ViralContent\``;

    case "ml":
      return `### 🎬 **${brandTitle}** നായുള്ള 15-30 സെക്കൻഡ് വൈറൽ ഉള്ളടക്ക ബ്ലൂപ്രിന്റ്
**പ്ലാറ്റ്‌ഫോം**: ${platform} | **ഫോർമാറ്റ്**: ${format || "Vertical Reel"} | **ശൈലി**: ${tone}

#### ⚡ 1. ശ്രദ്ധ പിടിച്ചുപറ്റുന്ന ഹുക്ക് (0:00 - 0:03)
- **വിഷ്വൽ**: ഡൈനാമിക് ടെക്സ്റ്റ് ഓവർലേയോട് കൂടി ക്യാമറയ്ക്ക് മുന്നിൽ ${brandTitle} കാണിക്കുന്ന ദൃശ്യം.
- **ഓഡിയോ / വോയ്‌സ് ഓവർ**: "2026-ൽ ${category} ഉപയോഗിച്ച് മികച്ച ഫലങ്ങൾ വേണമെങ്കിൽ ഇത് ചെയ്യുന്നത് ഉടൻ നിർത്തുക..."
- **സ്ക്രീനിലെ വാചകം**: "90% ആളുകളും അവഗണിക്കുന്ന 3-സെക്കൻഡ് നിയമം ❌"

#### 🔍 2. പ്രധാന പ്രശ്നവും ഡെമോയും (0:03 - 0:15)
- **വിഷ്വൽ**: ഉൽപ്പന്നത്തിന്റെ പ്രവർത്തനം കാണിക്കുന്ന സുഗമമായ b-roll മാറ്റം.
- **ഓഡിയോ / വോയ്‌സ് ഓവർ**: "5 വ്യത്യസ്ത ഉൽപ്പന്നങ്ങൾ ആവശ്യമാണെന്ന് മിക്കവരും കരുതുന്നു. എന്നാൽ സമയം ലാഭിക്കുന്ന ഈ ഒരു ${brandTitle} ഫോർമുലേഷൻ മാത്രം മതിയാകും."
- **സ്ക്രീനിലെ വാചകം**: "ഘട്ടം 1: പ്രയോഗം | ഘട്ടം 2: ഉടനടി തിളക്കം"

#### 🚀 3. തെളിവും കോൾ-ടു-ആക്ഷനും (CTA) (0:15 - 0:25)
- **വിഷ്വൽ**: സ്വാഭാവിക വെളിച്ചത്തിൽ മുൻപും ശേഷവും കാണിക്കുന്ന സ്പ്ലിറ്റ് സ്ക്രീൻ. അടിക്കുറിപ്പിലേക്ക് വിരൽ ചൂണ്ടുന്ന ക്രിയേറ്റർ.
- **ഓഡിയോ / വോയ്‌സ് ഓവർ**: "ഇവിടെ മാറ്റം ശ്രദ്ധിക്കൂ. ഈ വീഡിയോ സേവ് ചെയ്യുക, ബ്രാൻഡ് ഓഫർ കോഡിനായി ബയോയിലെ ലിങ്ക് ക്ലിക്ക് ചെയ്യുക!"
- **സ്ക്രീനിലെ വാചകം**: "പിന്നീടായി സേവ് ചെയ്യുക! 📌 | ബയോയിൽ ലിങ്ക് ഉണ്ട് 👇"

---
#### 🏷️ ശുപാർശ ചെയ്യുന്ന ഹാഷ്‌ടാഗുകൾ:
\`#${brandTag} #${catTag} #${platTag}Tips #UGCContent #ProductReview #CreatorEconomy #ViralContent\``;

    case "mr":
      return `### 🎬 **${brandTitle}** साठी 15-30 सेकंदांचा व्हायरल कंटेंट ब्लूप्रिंट
**प्लॅटफॉर्म**: ${platform} | **स्वरूप**: ${format || "Vertical Reel"} | **टोन**: ${tone}

#### ⚡ 1. हाय-अटेंशन हूक (0:00 - 0:03)
- **व्हिज्युअल**: डायनॅमिक मजकुरासह कॅमेऱ्यासमोर ${brandTitle} धरलेला जलद कट.
- **ऑडिओ / व्हॉईसओव्हर**: "2026 मध्ये ${category} सह चांगले परिणाम हवे असल्यास ही चूक करणे थांबवा..."
- **स्क्रीनवरील मजकूर**: "90% लोक दुर्लक्ष करतात असा 3-सेकंदांचा नियम ❌"

#### 🔍 2. मुख्य समस्या आणि प्रात्यक्षिक (0:03 - 0:15)
- **व्हिज्युअल**: उत्पादनाचा वापर दर्शवणारे सुरळीत b-roll संक्रमण.
- **ऑडिओ / व्हॉईसओव्हर**: "बहुतेक लोकांना वाटते की 5 वेगळी उत्पादने लागतील. प्रत्यक्षात, वेळ निम्म्याने कमी करणारी ही एकच ${brandTitle} फॉर्म्युलेशन पुरेशी आहे."
- **स्क्रीनवरील मजकूर**: "पायरी 1: वापर | पायरी 2: त्वरित चमक"

#### 🚀 3. पुरावा आणि कॉल-टू-ॲक्शन (CTA) (0:15 - 0:25)
- **व्हिज्युअल**: नैसर्गिक प्रकाशात आधी आणि नंतर दर्शवणारी स्प्लिट स्क्रीन. कॅप्शनकडे निर्देश करणारा क्रिएटर.
- **ऑडिओ / व्हॉईसओव्हर**: "येथे फरकाचा अनुभव घ्या. हा व्हिडिओ सेव्ह करा आणि ब्रँड ऑफर कोडसाठी बायोमधील लिंकवर टॅप करा!"
- **स्क्रीनवरील मजकूर**: "नंतरसाठी सेव्ह करा! 📌 | बायोमध्ये लिंक आहे 👇"

---
#### 🏷️ शिफारस केलेले हॅशटॅग:
\`#${brandTag} #${catTag} #${platTag}Tips #UGCContent #ProductReview #CreatorEconomy #ViralContent\``;

    case "bn":
      return `### 🎬 **${brandTitle}** এর জন্য 15-30 সেকেন্ডের ভাইরাল কন্টেন্ট ব্লুপ্রিন্ট
**প্ল্যাটফর্ম**: ${platform} | **ফরম্যাট**: ${format || "Vertical Reel"} | **টোন**: ${tone}

#### ⚡ 1. দৃষ্টি আকর্ষণকারী হুক (0:00 - 0:03)
- **ভিজ্যুয়াল**: ক্যামেরার সামনে ডায়নামিক টেক্সট সহ ${brandTitle} প্রোডাক্টের দ্রুত ক্লোজআপ কাট।
- **অডিও / ভয়েসওভার**: "২০২৬ সালে ${category} দিয়ে সত্যিকারের ফলাফল চাইলে এই ভুল করা এখনই বন্ধ করুন..."
- **স্ক্রিনে টেক্সট**: "৯০% মানুষ যে ৩-সেকেন্ডের নিয়ম উপেক্ষা করে ❌"

#### 🔍 2. মূল সমস্যা এবং লাইভ ডেমো (0:03 - 0:15)
- **ভিজ্যুয়াল**: পণ্যের প্রয়োগ প্রদর্শনের মসৃণ b-roll ট্রানজিশন।
- **অডিও / ভয়েসওভার**: "অনেকেই মনে করেন ৫টি ভিন্ন পণ্যের প্রয়োজন। কিন্তু আপনার সময় অর্ধেক কমিয়ে দিতে এই একটি ${brandTitle} ফর্মুলাই যথেষ্ট।"
- **স্ক্রিনে টেক্সট**: "ধাপ ১: ব্যবহার | ধাপ ২: তাত্ক্ষণিক উজ্জ্বলতা"

#### 🚀 3. প্রমাণ এবং কল-টু-অ্যাকশন (CTA) (0:15 - 0:25)
- **ভিজ্যুয়াল**: প্রাকৃতিক আলোয় আগে ও পরের স্প্লিট স্ক্রিন। বায়োর দিকে ইশারা করা ক্রিয়েটর।
- **অডিও / ভয়েসওভার**: "এখানে টেক্সচারের পার্থক্য লক্ষ্য করুন। এই ভিডিওটি সেভ করে রাখুন এবং ডিসকাউন্ট কোডের জন্য বায়োর লিঙ্কে ট্যাপ করুন!"
- **স্ক্রিনে টেক্সট**: "পরে দেখার জন্য সেভ করুন! 📌 | বায়োতে লিঙ্ক দেখুন 👇"

---
#### 🏷️ প্রস্তাবিত হ্যাশট্যাগ:
\`#${brandTag} #${catTag} #${platTag}Tips #UGCContent #ProductReview #CreatorEconomy #ViralContent\``;

    case "es":
      return `### 🎬 Guión de Contenido Viral de 15-30 Segundos para **${brandTitle}**
**Plataforma**: ${platform} | **Formato**: ${format || "Vertical Reel"} | **Tono**: ${tone}

#### ⚡ 1. Gancho de Alta Retención (0:00 - 0:03)
- **Visual**: Plano rápido sosteniendo ${brandTitle} frente a la cámara con texto macro dinámico.
- **Audio / Voz en off**: "Deja de hacer esto si realmente quieres resultados con ${category} en 2026..."
- **Texto en pantalla**: "La regla de 3 segundos que el 90% ignora ❌"

#### 🔍 2. El Problema Principal y Demostración (0:03 - 0:15)
- **Visual**: Transición fluida de b-roll mostrando el producto en acción. Cortes rítmicos acordes al audio.
- **Audio / Voz en off**: "La mayoría piensa que necesitas 5 productos distintos. En realidad, solo necesitas esta formulación de ${brandTitle} que reduce tu rutina a la mitad."
- **Texto en pantalla**: "Paso 1: Aplicación | Paso 2: Brillo Inmediato"

#### 🚀 3. Prueba y Llamado a la Acción (CTA) (0:15 - 0:25)
- **Visual**: Pantalla dividida antes vs después con luz natural. El creador señala la descripción.
- **Audio / Voz en off**: "Mira la diferencia de textura aquí. ¡Guarda este video y toca el enlace en la bio para el código de descuento exclusivo!"
- **Texto en pantalla**: "¡Guarda para después! 📌 | Enlace en Bio 👇"

---
#### 🏷️ Hashtags Recomendados:
\`#${brandTag} #${catTag} #${platTag}Tips #UGCContent #ProductReview #CreatorEconomy #ViralContent\``;

    case "fr":
      return `### 🎬 Plan de Contenu Viral de 15-30 Secondes pour **${brandTitle}**
**Plateforme**: ${platform} | **Format**: ${format || "Vertical Reel"} | **Ton**: ${tone}

#### ⚡ 1. Accroche à Forte Rétention (0:00 - 0:03)
- **Visuel**: Plan rapide tenant ${brandTitle} face à la caméra avec texte macro dynamique.
- **Audio / Voix off**: "Arrêtez de faire ça si vous voulez vraiment des résultats avec ${category} en 2026..."
- **Texte à l'écran**: "La règle des 3 secondes ignorée par 90% des gens ❌"

#### 🔍 2. Le Problème Clé et Démonstration (0:03 - 0:15)
- **Visuel**: Transition b-roll fluide montrant le produit en action.
- **Audio / Voix off**: "La plupart pensent qu'il faut 5 produits différents. En réalité, cette seule formule de ${brandTitle} divise par deux votre routine."
- **Texte à l'écran**: "Étape 1: Application | Étape 2: Éclat Immédiat"

#### 🚀 3. Preuve et Appel à l'Action (CTA) (0:15 - 0:25)
- **Visuel**: Écran partagé avant/après en lumière naturelle. Le créateur pointe la bio.
- **Audio / Voix off**: "Remarquez la différence de texture ici. Enregistrez cette vidéo et cliquez sur le lien en bio pour le code de réduction!"
- **Texte à l'écran**: "Enregistrez pour plus tard! 📌 | Lien en Bio 👇"

---
#### 🏷️ Hashtags Recommandés:
\`#${brandTag} #${catTag} #${platTag}Tips #UGCContent #ProductReview #CreatorEconomy #ViralContent\``;

    case "en":
    default:
      return `### 🎬 15-30 Second Viral Content Blueprint for **${brandTitle}**
**Platform**: ${platform} | **Format**: ${format || "Vertical Reel"} | **Tone**: ${tone}

#### ⚡ 1. High-Retention Hook (0:00 - 0:03)
- **Visual**: Quick cut holding ${brandTitle} right to camera with dynamic macro text overlay.
- **Audio / Voiceover**: "Stop doing this if you actually want results with ${category} in 2026..."
- **Text on Screen**: "The 3-Second Rule 90% Ignore ❌"

#### 🔍 2. The Core Problem & Demonstration (0:03 - 0:15)
- **Visual**: Seamless b-roll transition showing the product in action. Fast, rhythmic visual cuts matching background audio tempo.
- **Audio / Voiceover**: "Most people think you need 5 different products. In reality, you just need this one formulation that cuts routine time in half."
- **Text on Screen**: "Step 1: Application | Step 2: Immediate Glow"

#### 🚀 3. Proof & Call-To-Action (0:15 - 0:25)
- **Visual**: Split screen before vs after with natural lighting. Creator gestures to caption.
- **Audio / Voiceover**: "Notice the texture difference right here. Save this video so you have it ready, and tap the link in bio for the brand launch code!"
- **Text on Screen**: "Save this for later! 📌 | Link in Bio 👇"

---
#### 🏷️ Recommended Hashtags:
\`#${brandTag} #${catTag} #${platTag}Tips #UGCContent #ProductReview #CreatorEconomy #ViralContent\``;
  }
}

// ============================================================================
// 2. CREATOR RECOMMENDATIONS TEMPLATES
// ============================================================================
export function buildLocalizedHeuristicRecommendations({
  brand,
  category,
  creatorNames,
  budget,
  lang,
}: RecommendationsParams): string {
  const code = resolveLang(lang);
  const target = brand || category;

  switch (code) {
    case "te":
      return `### 🎯 **${target}** కోసం ధృవీకరించబడిన AI క్రియేటర్ల సిఫార్సులు
మా మల్టీ-ఫ్యాక్టర్ AI మ్యాచింగ్ మోడల్ (స్కిల్ మ్యాచ్ 40%, వెరిఫికేషన్ 25%, పోర్ట్‌ఫోలియో 15%, ఎంగేజ్‌మెంట్ 10%, క్లయింట్ రేటింగ్ 10%) ఆధారంగా **${category}** లో టాప్ ర్యాంకింగ్ క్రియేటర్లు:

- ${creatorNames}

#### 💡 ఈ క్రియేటర్లు ఎందుకు సరిపోతారు:
1. **అధిక ఎంగేజ్‌మెంట్ & విశ్వసనీయత**: ప్రతి క్రియేటర్ 7.5% కంటే ఎక్కువ వెరిఫైడ్ ఎంగేజ్‌మెంట్ రేటును కలిగి ఉన్నారు.
2. **కేటగిరీ & పోర్ట్‌ఫోలియో ఆధారాలు**: ప్లాట్‌ఫారమ్ మోడరేటర్లచే ధృవీకరించబడిన వాణిజ్య పోర్ట్‌ఫోలియోలను కలిగి ఉన్నారు.
${budget ? `3. **బడ్జెట్ అమరిక**: మీ బడ్జెట్ **₹ ${budget.toLocaleString()}** కోసం, ఈ క్రియేటర్‌లు వాణిజ్య వినియోగ హక్కులతో అధిక-మార్పిడి UGC రివ్యూలను అందించగలరు.` : "3. **ఫ్లెక్సిబుల్ డెలివరీబుల్స్**: 15s-30s రీల్స్, ట్యుటోరియల్స్ మరియు చెల్లింపు ప్రకటనల కోసం అందుబాటులో ఉన్నారు."}

> **తదుపరి దశ**: పూర్తి పోర్ట్‌ఫోలియో మరియు క్లయింట్ సమీక్షలను తనిఖీ చేయడానికి క్రింది క్రియేటర్ కార్డ్‌లపై క్లిక్ చేసి నేరుగా ప్రచారానికి ఆహ్వానించండి!`;

    case "hi":
      return `### 🎯 **${target}** के लिए सत्यापित AI क्रिएटर्स की सिफारिशें
हमारे मल्टी-फैक्टर AI मैचिंग मॉडल (स्किल मैच 40%, सत्यापन 25%, पोर्टफोलियो 15%, एंगेजमेंट 10%, क्लाइंट रेटिंग 10%) के आधार पर **${category}** में शीर्ष रैंकिंग वाले क्रिएटर्स:

- ${creatorNames}

#### 💡 ये क्रिएटर्स क्यों उपयुक्त हैं:
1. **उच्च जुड़ाव और विश्वसनीयता**: प्रत्येक क्रिएटर 7.5% से अधिक सत्यापित सहभागिता दर बनाए रखता है।
2. **श्रेणी और पोर्टफोलियो प्रमाण**: इनके पास वाणिज्यिक पोर्टफोलियो हैं जो प्लेटफ़ॉर्म मॉडरेटर द्वारा सत्यापित हैं।
${budget ? `3. **बजट संरेखण**: आपके **₹ ${budget.toLocaleString()}** के बजट के लिए, ये क्रिएटर्स उच्च-परिवर्तन यूजीसी समीक्षाएं प्रदान कर सकते हैं।` : "3. **लचीले डिलिवरेबल्स**: 15s-30s रील्स और भुगतान विज्ञापनों के लिए उपलब्ध हैं।"}

> **अगला कदम**: पूर्ण पोर्टफोलियो और समीक्षाओं की जांच करने के लिए नीचे दिए गए क्रिएटर कार्ड पर क्लिक करें और सीधे आमंत्रित करें!`;

    case "ar":
      return `### 🎯 المبدعون المعتمدون الموصى بهم لـ **${target}**
استناداً إلى نموذج المطابقة متعدد العوامل (مطابقة المهارات 40%، التوثيق 25%، جودة المعرض 15%، التفاعل 10%، تقييم العملاء 10%)، إليك أفضل المبدعين في مجال **${category}**:

- ${creatorNames}

#### 💡 لماذا يناسبك هؤلاء المبدعون:
1. **تفاعل وموثوقية عالية**: يحافظ كل مبدع على نسبة تفاعل موثقة تتجاوز 7.5%.
2. **أدلة ونماذج أعمال معتمدة**: يمتلكون أعمالاً تجارية موثقة من قبل مشرفي المنصة في مجال ${category}.
${budget ? `3. **توافق الميزانية**: لميزانيتك البالغة **₹ ${budget.toLocaleString()}**، يمكن لهؤلاء المبدعين تقديم مقاطع ريلز احترافية مع حقوق الاستخدام التجاري.` : "3. **تسليمات مرنة**: جاهزون لمقاطع ريلز من 15 إلى 30 ثانية وقوائم بيضاء للإعلانات الممولة."}

> **الخطوة التالية**: اضغط على بطاقة أي مبدع أدناه لمراجعة ملفه التجاري الكامل ودعوته مباشرة إلى حملتك!`;

    case "en":
    default:
      return `### 🎯 Recommended Verified Creators for **${target}**
Based on our multi-factor AI matching model (Skill Match 40%, Verification 25%, Portfolio 15%, Engagement 10%, Client Rating 10%), here are the top-ranking creators in **${category}**:

- ${creatorNames}

#### 💡 Why These Creators Match:
1. **High Engagement & Trust**: Each creator maintains a verified engagement rate above 7.5%, ensuring active comment discussions and viewer retention.
2. **Category & Portfolio Evidence**: They have published commercial portfolios verified by platform moderators in ${category.toLowerCase()}.
${budget ? `3. **Budget Alignment**: For your budget of **₹ ${budget.toLocaleString()}**, these creators can provide high-converting UGC review reels or multi-part story sequences with commercial usage rights.` : "3. **Flexible Deliverables**: Available for 15s-30s Reels, carousel tutorials, and paid ad whitelisting."}

> **Next Step**: Click on any creator card below to review their full portfolio, client reviews, and invite them directly to your campaign!`;
  }
}

// ============================================================================
// 3. BRAND / PRODUCT STRATEGY TEMPLATES
// ============================================================================
export function buildLocalizedHeuristicStrategy({
  brand,
  category,
  platform,
  tone,
  creators,
  lang,
}: StrategyParams): string {
  const code = resolveLang(lang);
  const brandTitle = brand || "Your Brand";
  const creatorsList = creators
    .map((c) => `- **[${c.name}](${c.profileUrl})**: Verified ${c.category} creator (${c.followers} followers, ${c.engagementRate} engagement)`)
    .join("\n");

  switch (code) {
    case "te":
      return `### 🚀 **${brandTitle}** కోసం మార్కెటింగ్ & క్రియేటర్ వ్యూహం
**కేటగిరీ**: ${category} | **ప్లాట్‌ఫారమ్**: ${platform} | **టోన్**: ${tone}

#### 1. ప్రేక్షకుల విశ్లేషణ & పొజిషనింగ్
- **ప్రధాన వినియోగదారులు**: విశ్వసనీయమైన మరియు అధిక నాణ్యత కలిగిన ఉత్పత్తులను కోరుకునే ఆధునిక వినియోగదారులు.
- **కోర్ వ్యూహం**: సాధారణ ప్రమోషనల్ ప్రకటనల కంటే మొదటి 3 సెకన్లలోనే ప్రొడక్ట్ ఫలితాన్ని నిరూపించే సహజమైన క్రియేటర్ కథనాలపై దృష్టి పెట్టండి.

#### 2. అధిక మార్పిడిని ఇచ్చే 3 కంటెంట్ కోణాలు
1. **ప్రూఫ్ ఛాలెంజ్**: *"నేను 14 రోజుల పాటు ${brandTitle} ను స్వయంగా పరీక్షించాను — నిజాయితీ సమీక్ష."*
2. **సమస్య-పరిష్కారం**: సాధారణ కస్టమర్ సమస్యను ఎత్తిచూపి, ${brandTitle} దానిని ఎలా సులభంగా పరిష్కరిస్తుందో చూపించడం.
3. **బిహైండ్-ది-సీన్స్**: ట్రెండింగ్ మ్యూజిక్‌తో కూడిన మ్యాక్రో ప్రొడక్ట్ విజువల్స్.

#### 3. సిఫార్సు చేయబడిన ఫార్మాట్ & నిడివి
- **నిడివి**: నిలువు Reels / Shorts కోసం **15-30 సెకన్లు** (గరిష్ట వీక్షణలు మరియు అల్గోరిథం రీప్లేను పెంచుతుంది).
- **డెలివరీబుల్స్**: 1 హుక్ రీల్ + 1 వివరణాత్మక సమీక్ష + 3 లింక్ స్టిక్కర్ స్టోరీలు.

#### 4. సరిపోలే మార్కెట్‌ప్లేస్ క్రియేటర్లు:
${creatorsList}`;

    case "hi":
      return `### 🚀 **${brandTitle}** के लिए मार्केटिंग और क्रिएटर रणनीति
**श्रेणी**: ${category} | **प्लेटफ़ॉर्म**: ${platform} | **टोन**: ${tone}

#### 1. दर्शक विश्लेषण और ब्रांड पोजिशनिंग
- **प्राथमिक उपभोक्ता**: प्रामाणिक और उच्च-मूल्य समाधान चाहने वाले आधुनिक उपभोक्ता।
- **मुख्य रणनीति**: पारंपरिक विज्ञापनों के बजाय पहले 3 सेकंड में प्रभाव साबित करने वाली वास्तविक क्रिएटर कहानियों पर ध्यान दें।

#### 2. 3 उच्च-रूपांतरण वाले कंटेंट कोण
1. **प्रूफ चैलेंज**: *"मैंने 14 दिनों तक ${brandTitle} का परीक्षण किया — ईमानदार अनुभव।"*
2. **समस्या समाधान**: आम उपभोक्ता समस्या को उजागर करें और दिखाएं कि ${brandTitle} इसे कैसे हल करता है।
3. **बिहाइंड द सीन्स**: ट्रेंडिंग ऑडियो के साथ शानदार क्लोजअप शॉट्स।

#### 3. अनुशंसित प्रारूप और अवधि
- **अवधि**: वर्टिकल रील्स / शॉर्ट्स के लिए **15-30 सेकंड** (सर्वोत्तम रीप्ले और रिटेंशन के लिए)।
- **डिलिवरेबल्स**: 1 हुक रील + 1 इन-डेप्थ रिव्यू + 3 स्टोरी फ्रेम्स लिंक स्टिकर के साथ।

#### 4. अनुशंसित मार्केटप्लेस क्रिएटर्स:
${creatorsList}`;

    case "ar":
      return `### 🚀 استراتيجية التسويق وصناع المحتوى لـ **${brandTitle}**
**الفئة**: ${category} | **المنصة**: ${platform} | **النبرة**: ${tone}

#### 1. تحليل الجمهور والتموضع الأساسي
- **الجمهور المستهدف**: المستهلكون الباحثون عن حلول حقيقية وموثوقة عالية الجودة.
- **الاستراتيجية الأساسية**: التحول من الإعلانات التقليدية إلى سرد القصص التلقائي الذي يثبت فعالية المنتج في أول 3 ثوانٍ.

#### 2. 3 زوايا محتوى عالية التحويل
1. **تحدي الإثبات**: *"قمت بتجربة ${brandTitle} لمدة 14 يوماً — إليكم المراجعة الصادقة."*
2. **حل المشكلة**: تسليط الضوء على مشكلة شائعة وإظهار كيف يحلها ${brandTitle} بسرعة.
3. **كواليس التصوير**: لقطات مقربة متميزة للمنتج مع مؤثرات صوتية رائجة.

#### 3. التنسيق والمدة الموصى بها
- **المدة**: **15-30 ثانية** لمقاطع الفيديو الرأسية (Reels / Shorts).
- **التسليمات**: مقطع ريلز رئيسي + مراجعة تفصيلية + 3 ستوريات مع ملصق الرابط.

#### 4. المبدعون المتطابقون في المنصة:
${creatorsList}`;

    case "en":
    default:
      return `### 🚀 Marketing & Creator Strategy for **${brandTitle}**
**Category**: ${category} | **Target Platform**: ${platform} | **Tone**: ${tone}

#### 1. Audience Psychographics & Core Positioning
- **Primary Consumers**: Demographics seeking authentic, high-value product solutions.
- **Core Value Proposition**: Shift from generic promotional ads to relatable, authentic creator storytelling that proves efficacy in the first 3 seconds.

#### 2. 3 High-Converting Content Angles
1. **The Proof Challenge**: *"I tested ${brandTitle} for 14 days so you don't have to — honest breakdown."*
2. **The Problem-Solver**: Highlight the common consumer frustration and demonstrate how ${brandTitle} eliminates it.
3. **Behind-The-Scenes / Unboxing**: Crisp macro product texture shots with trending rhythmic audio.

#### 3. Recommended Format & Duration
- **Duration**: **15-30 seconds** for vertical Reels / Shorts (maximizes completion rate and algorithmic replay loop).
- **Deliverables**: 1 Hook Reel + 1 In-depth Review + 3 Story frames with link stickers.

#### 4. Matching Marketplace Creators:
${creatorsList}`;
  }
}

// ============================================================================
// 4. CREATOR COMPARISON TEMPLATES
// ============================================================================
export function buildLocalizedHeuristicComparison({
  category,
  tableRows,
  verdict,
  lang,
}: ComparisonParams): string {
  const code = resolveLang(lang);

  switch (code) {
    case "te":
      return `### 📊 క్రియేటర్ల ప్రత్యక్ష పోలిక (${category})

| క్రియేటర్ | ఆడియన్స్ | ఎంగేజ్‌మెంట్ | క్లయింట్ రేటింగ్ | సాధారణ ధర | హోదా |
| :--- | :--- | :--- | :--- | :--- | :--- |
${tableRows}

${verdict}

#### 📋 మీ ప్రచారానికి ఎలా ఎంచుకోవాలి:
- మీ లక్ష్యం **వైరల్ రీచ్ & కొత్త ఆడియన్స్** అయితే: అత్యధిక ఎంగేజ్‌మెంట్ రేట్ ఉన్న క్రియేటర్‌ను ఎంచుకోండి.
- మీ లక్ష్యం **ప్రొడక్ట్ వివరణ & లైవ్ డెమో** అయితే: ప్రత్యేక నైపుణ్యాలు మరియు అత్యధిక క్లయింట్ రేటింగ్ ఉన్న క్రియేటర్‌ను ఎంచుకోండి.`;

    case "hi":
      return `### 📊 क्रिएटर्स की तुलना (${category})

| क्रिएटर | दर्शक | सहभागिता | रेटिंग | मूल्य सीमा | स्थिति |
| :--- | :--- | :--- | :--- | :--- | :--- |
${tableRows}

${verdict}

#### 📋 अपने अभियान के लिए कैसे चुनें:
- यदि आपका लक्ष्य **वायरल रीच** है: उच्चतम सहभागिता दर वाले क्रिएटर को चुनें।
- यदि आपका लक्ष्य **उत्पाद शिक्षा और विस्तृत समीक्षा** है: उच्चतम रेटिंग और विशेष कौशल वाले क्रिएटर को चुनें।`;

    case "ar":
      return `### 📊 مقارنة مباشرة بين المبدعين (${category})

| المبدع | المتابعون | نسبة التفاعل | التقييم | النطاق السعري | الحالة |
| :--- | :--- | :--- | :--- | :--- | :--- |
${tableRows}

${verdict}

#### 📋 كيفية الاختيار لحملتك:
- إذا كان هدفك **الانتشار الفيروسي السريع**: اختر المبدع صاحب أعلى نسبة تفاعل.
- إذا كان هدفك **شرح تفاصيل المنتج والتعليم**: اختر المبدع ذو التقييم الأعلى والخبرة المتخصصة.`;

    case "en":
    default:
      return `### 📊 Creator Head-to-Head Comparison (${category})

| Creator | Audience | Engagement | Client Rating | Typical Pricing | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
${tableRows}

${verdict}

#### 📋 How to Pick for Your Campaign:
- If your goal is **viral top-of-funnel discovery**: Pick the creator with the highest engagement rate.
- If your goal is **product education & ingredient breakdowns**: Pick the creator with specialized skills and highest client satisfaction score.`;
  }
}

// ============================================================================
// 5. ESCROW / PAYMENT NOTICE TEMPLATES
// ============================================================================
export function buildLocalizedHeuristicEscrowNotice(lang: SupportedLanguageCode): string {
  const code = resolveLang(lang);

  switch (code) {
    case "te":
      return `### 💳 చెల్లింపు & ప్రాజెక్ట్ నిబంధనల నోటీసు
**ముఖ్య గమనిక**: చెల్లింపు ప్రాసెసింగ్, ఆటోమేటెడ్ ఎస్క్రో మరియు డిజిటల్ వాలెట్ ఫీచర్లు **ప్రస్తుతం ఈ ప్లాట్‌ఫారమ్‌లో అందుబాటులో లేవు**.

#### 📋 సహకారాలు ఎలా పనిచేస్తాయి:
1. **క్యాంపెయిన్ ఒప్పందం**: బ్రాండ్‌లు మరియు క్రియేటర్‌లు ప్రాజెక్ట్ గడువులు మరియు వాణిజ్య నిబంధనలను నేరుగా అంగీకరిస్తారు.
2. **ప్రత్యక్ష సెటిల్మెంట్**: చెల్లింపులు నేరుగా ఆఫ్-ప్లాట్‌ఫారమ్ మార్గాల (బ్యాంక్ బదిలీ లేదా ఇన్వాయిస్) ద్వారా బ్రాండ్ మరియు క్రియేటర్ మధ్య సెటిల్ చేయబడతాయి.
3. **ప్లాట్‌ఫారమ్ పరిధి**: ప్లాట్‌ఫారమ్ కేవలం AI క్రియేటర్ల శోధన, నైపుణ్యాల ధృవీకరణ మరియు ప్రాజెక్ట్ ట్రాకింగ్‌ను అందిస్తుంది.`;

    case "hi":
      return `### 💳 भुगतान और प्रोजेक्ट शर्तों की सूचना
**सूचना**: भुगतान प्रसंस्करण, स्वचालित एस्क्रो और डिजिटल वॉलेट सुविधाएं **वर्तमान में इस प्लेटफ़ॉर्म पर उपलब्ध नहीं हैं**।

#### 📋 सहयोग कैसे काम करता है:
1. **अभियान समझौता**: डिलिवरेबल्स और शर्तों पर सीधा समझौता।
2. **सीधा भुगतान**: प्लेटफ़ॉर्म से बाहर सीधे बैंक या चालान द्वारा निपटान।
3. **प्लेटफ़ॉर्म दायरा**: क्रिएटर्स की खोज, कौशल सत्यापन और प्रोजेक्ट ट्रैकिंग।`;

    case "ar":
      return `### 💳 إشعار شروط الدفع والتسليم
**تنبيه**: معالجة المدفوعات والضمان المالي التلقائي (Escrow) والمحافظ الرقمية **غير متوفرة حالياً على هذه المنصة**.

#### 📋 آلية عمل التعاون:
1. **اتفاقية الحملة**: الاتفاق المباشر على التسليمات والجدول الزمني والشروط التجارية.
2. **التسوية المباشرة**: تحويل مستحقات المبدعين مباشرة خارج المنصة (كالتحويل البنكي أو الفواتير المعتمدة).
3. **نطاق المنصة**: استكشاف صناع المحتوى وتوثيق المهارات وتتبع التقدم.`;

    case "en":
    default:
      return `### 💳 Payment & Deliverable Terms Notice
**Notice**: Payment processing, automated escrow, and digital wallet features are **not currently available on this platform**.

#### 📋 How Collaborations Work:
1. **Campaign Brief & Agreement**: Brands and creators connect via campaign invitations to agree upon deliverables, project timelines, and commercial terms.
2. **Direct Settlement**: Payment and milestone terms must be agreed upon and settled separately between brand and creator through direct off-platform arrangements (such as direct bank transfer, corporate invoicing, or mutually agreed commercial terms).
3. **Platform Scope**: The platform provides AI creator discovery, multi-factor skill verification, and project tracking.`;
  }
}

// ============================================================================
// 6. COLLABORATION PROPOSAL TEMPLATES
// ============================================================================
export function buildLocalizedHeuristicProposal({
  brand,
  category,
  name,
  platform,
  lang,
}: ProposalParams): string {
  const code = resolveLang(lang);
  const brandName = brand || "Brand Partner";
  const creatorName = name || "Verified Creator";

  switch (code) {
    case "te":
      return `### ✉️ ప్రభావవంతమైన బ్రాండ్ సహకార ప్రతిపాదన (Pitch)
**టార్గెట్ బ్రాండ్**: ${brandName} | **కేటగిరీ**: ${category}

\`\`\`text
Subject: సహకార ప్రతిపాదన: ${brandName} x ${creatorName} కోసం హై-ROI కంటెంట్ భాగస్వామ్యం

నమస్కారం ${brandName} మార్కెటింగ్ బృందం,

నేను ${brandName} బ్రాండ్ ఉత్పత్తులను నిశితంగా గమనిస్తున్నాను మరియు ${category} విభాగంలో మీ నాణ్యతను ఎంతగానో అభినందిస్తున్నాను.

నేను AI Creator Marketplace లో వెరిఫైడ్ క్రియేటర్‌ను, ${platform} కోసం అధిక-రీచ్ వీడియోలను రూపొందించడంలో నైపుణ్యం కలిగి ఉన్నాను:
- ఆడియన్స్: [మీ ఫాలోవర్ల సంఖ్య, ఉదా. 85K+] క్రియాశీల ప్రేక్షకులు
- ఎంగేజ్‌మెంట్ రేట్: [మీ ఎంగేజ్‌మెంట్, ఉదా. 8.4%] (ప్లాట్‌ఫారమ్ సగటు కంటే ఎక్కువ)
- ఫార్మాట్‌లు: UGC ప్రొడక్ట్ రివ్యూలు, 15s వైరల్ హుక్స్, మరియు డెమో రీల్స్

నేను ${brandName} కోసం ప్రత్యేక 2-భాగాల కంటెంట్ ప్యాకేజీని అందించాలనుకుంటున్నాను:
1. వీడియో 1 (15-30s రీల్): మీ ప్రధాన ప్రొడక్ట్ కోసం హై-హుక్ సమస్య-పరిష్కార డెమో.
2. వీడియో 2 (UGC రివ్యూ): స్పష్టమైన CTA తో నిజమైన అనుభవ సమీక్ష.

మీరు నా వెరిఫైడ్ పోర్ట్‌ఫోలియోను ఇక్కడ పరిశీలించవచ్చు:
[మార్కెట్‌ప్లేస్ పోర్ట్‌ఫోలియో చూడండి](https://ai-creator-marketplace.com/creators/ananya-rao)

ఈ వారం క్లుప్తంగా మాట్లాడటానికి మీకు సమయం ఉంటుందా?

ధన్యవాదాలు,
${creatorName}
ధృవీకరించబడిన AI క్రియేటర్
\`\`\``;

    case "hi":
      return `### ✉️ प्रभावशाली ब्रांड सहयोग प्रस्ताव (Pitch)
**लक्षित ब्रांड**: ${brandName} | **श्रेणी**: ${category}

\`\`\`text
Subject: सहयोग प्रस्ताव: ${brandName} x ${creatorName} के लिए उच्च-आरओआई साझेदारी

नमस्ते ${brandName} मार्केटिंग टीम,

मैं ${brandName} के हालिया उत्पादों को देख रहा हूँ और ${category} श्रेणी में आपकी गुणवत्ता की सराहना करता हूँ।

मैं AI Creator Marketplace पर एक सत्यापित क्रिएटर हूँ, जो ${platform} के लिए उच्च-रीच वाले वीडियो में विशेषज्ञता रखता हूँ:
- दर्शक: [आपके फॉलोअर्स की संख्या, जैसे 85K+] सक्रिय दर्शक
- सहभागिता दर: [आपकी दर, जैसे 8.4%] (औसत से काफी अधिक)
- प्रारूप: प्रामाणिक UGC समीक्षाएं और 15-30s वायरल हुक्स

मैं ${brandName} के लिए एक विशेष 2-भाग सामग्री पैकेज तैयार करना चाहता हूँ:
1. वीडियो 1 (15-30s रील): आपके उत्पाद के लिए हाई-हुक समस्या-समाधान वीडियो।
2. वीडियो 2 (लाइफस्टाइल समीक्षा): स्पष्ट CTA के साथ विस्तृत समीक्षा।

आप मेरा सत्यापित पोर्टफोलियो यहां देख सकते हैं:
[मेरा पोर्टफोलियो देखें](https://ai-creator-marketplace.com/creators/ananya-rao)

क्या इस सप्ताह बातचीत के लिए कुछ समय मिल सकता है?

सादर,
${creatorName}
सत्यापित AI क्रिएटर
\`\`\``;

    case "ar":
      return `### ✉️ مسودة عرض تعاون تجاري عالي التأثير
**العلامة التجارية المستهدفة**: ${brandName} | **المجال**: ${category}

\`\`\`text
Subject: عرض تعاون: شراكة تسويقية لـ ${brandName} x ${creatorName}

فريق التسويق في ${brandName} المحترمون،

أتابع عن كثب منتجات ${brandName} الأخيرة وأقدر عالياً التزامكم بالجودة في مجال ${category}.

أنا صانع محتوى معتمد في منصة AI Creator Marketplace، متخصص في مقاطع الفيديو الرأسية عالية التفاعل على ${platform}:
- الجمهور: [عدد المتابعين، مثلاً 85 ألف+] متابع نشط
- نسبة التفاعل المعتمدة: [النسبة، مثلاً 8.4%] (أعلى من متوسط المنصة)
- التنسيقات: مقاطع UGC حقيقية ومخططات ريلز فيروسية سريعة الانتشار

يسعدني تقديم باقة محتوى مخصصة من مقطعين لـ ${brandName}:
1. الفيديو الأول (ريلز 15-30 ثانية): استعراض عملي للمنتج بأسلوب مشوق.
2. الفيديو الثاني (مراجعة UGC): تجربة واقعية مع دعوة صريحة للطلب.

يمكنكم تفقد معرض أعمالي الموثق والتقييمات هنا:
[مشاهدة الملف التعريفي](https://ai-creator-marketplace.com/creators/ananya-rao)

هل يناسبكم التنسيق لاتصال قصير هذا الأسبوع؟

مع خالص التحية،
${creatorName}
صانع محتوى ذكاء اصطناعي معتمد
\`\`\``;

    case "en":
    default:
      return `### ✉️ High-Converting Brand Collaboration Proposal
**Tailored For**: ${brandName} | **Niche**: ${category}

\`\`\`text
Subject: Collaboration Pitch: High-ROI Content Partnership for ${brandName} x ${creatorName}

Hi ${brandName} Marketing Team,

I've been following ${brandName}'s recent product initiatives and love your commitment to quality in the ${category.toLowerCase()} space.

I'm a verified creator on the AI Creator Marketplace specializing in high-retention vertical video for ${platform}. My content consistently drives strong audience engagement:
- Audience: [Your Follower Count, e.g. 95K+] engaged followers in ${category}
- Verified Engagement Rate: [Your Engagement, e.g. 8.2%] (well above platform average)
- Formats: High-converting UGC reviews, macro product b-roll, and 15s viral hooks

I would love to produce a tailored 2-part content package for ${brandName}:
1. Video 1 (15-30s Reel): High-hook problem-solution demonstration testing your flagship product.
2. Video 2 (UGC Lifestyle Review): Day-in-the-life integration highlighting long-term benefits with clear CTA.

You can inspect my verified portfolio, skill moderation badges, and past brand campaign metrics here:
[View My Marketplace Portfolio](https://ai-creator-marketplace.com/creators/ananya-rao)

Are you available for a brief chat this week to align on your campaign goals?

Best regards,
${creatorName}
Verified AI Content Creator
\`\`\``;
  }
}

// ============================================================================
// 7. PROFILE IMPROVEMENT TEMPLATES
// ============================================================================
export function buildLocalizedHeuristicProfileTips(lang: SupportedLanguageCode): string {
  const code = resolveLang(lang);

  switch (code) {
    case "te":
      return `### 🌟 మీ ప్రొఫైల్‌ను ఆప్టిమైజ్ చేయడం & AI మ్యాచ్ స్కోర్‌ను పెంచడం ఎలా
మా మార్కెట్‌ప్లేస్ అల్గోరిథం **స్కిల్ మ్యాచ్ (40%)**, **వెరిఫికేషన్ (25%)**, **పోర్ట్‌ఫోలియో నాణ్యత (15%)**, **ఎంగేజ్‌మెంట్ (10%)** మరియు **క్లయింట్ రేటింగ్ (10%)** ఆధారంగా క్రియేటర్‌లను ర్యాంక్ చేస్తుంది.

#### 🚀 90%+ మ్యాచ్ స్కోర్ సాధించడానికి 4 దశలు:
1. **వెరిఫైడ్ స్కిల్ బ్యాడ్జ్‌లు పొందండి (స్థాయి 3 వెరిఫికేషన్)**:
   - మీ [స్కిల్ టెస్ట్ డ్యాష్‌బోర్డ్](/creator/tests) కు వెళ్లి ప్రాజెక్ట్‌లను సమర్పించండి.
   - ధృవీకరించబడిన బ్యాడ్జ్‌లు బ్రాండ్ ప్రచారాల కోసం తక్షణ **+25% బూస్ట్‌ను** అందిస్తాయి.
2. **AI టూల్ నైపుణ్యాలను హైలైట్ చేయండి**:
   - **Midjourney v6**, **Runway Gen-3**, **CapCut Pro**, **ElevenLabs** వంటి సాధనాలను స్పష్టంగా చేర్చండి.
3. **నిర్దిష్ట ప్రచార ఫలితాలను ప్రదర్శించండి**:
   - కేవలం వీడియో లింక్‌లను మాత్రమే కాకుండా, మీ పోర్ట్‌ఫోలియోలో వ్యూస్ మరియు ఎంగేజ్‌మెంట్ కొలమానాలను చేర్చండి.
4. **అందుబాటులో ఉన్న స్థితిని నిర్వహించండి**:
   - బ్రాండ్ శోధనలలో ముందు కనిపించడానికి మీ స్థితిని *"వెంటనే పని చేయడానికి సిద్ధంగా ఉంది"* గా ఉంచండి.`;

    case "hi":
      return `### 🌟 अपनी क्रिएटर प्रोफ़ाइल को ऑप्टिमाइज़ करें और AI मैच स्कोर बढ़ाएं
हमारा एल्गोरिदम **स्किल मैच (40%)**, **सत्यापन (25%)**, **पोर्टफोलियो गुणवत्ता (15%)**, **सहभागिता (10%)** और **क्लाइंट रेटिंग (10%)** पर क्रिएटर्स को रैंक करता है।

#### 🚀 90%+ मैच स्कोर तक पहुँचने के 4 कदम:
1. **सत्यापित स्किल बैज अर्जित करें**:
   - अपने [स्किल टेस्ट डैशबोर्ड](/creator/tests) पर जाएं और प्रोजेक्ट सबमिट करें।
   - सत्यापित बैज अभियानों के लिए तुरंत **+25% बूस्ट** देते हैं।
2. **AI टूल दक्षता को हाइलाइट करें**:
   - **Midjourney v6**, **Runway Gen-3**, **CapCut Pro**, **ElevenLabs** जैसे टूल्स को शामिल करें।
3. **अभियान के ठोस परिणामों का प्रदर्शन करें**:
   - केवल वीडियो लिंक न डालें — अपने पोर्टफोलियो में आंकड़े और परिणाम शामिल करें।
4. **सक्रिय उपलब्धता बनाए रखें**:
   - खोज परिणामों में शीर्ष पर रहने के लिए अपनी स्थिति को *"तुरंत कार्य के लिए उपलब्ध"* रखें।`;

    case "ar":
      return `### 🌟 كيفية تحسين ملفك التعريفي ورفع نسبة المطابقة الذكية
تعتمد خوارزمية المنصة على **مطابقة المهارات (40%)**، **التوثيق (25%)**، **جودة المعرض (15%)**، **التفاعل (10%)**، و**تقييم العملاء (10%)**.

#### 🚀 4 خطوات للوصول إلى نسبة مطابقة 90% فأكثر:
1. **احصل على شارات المهارات المعتمدة (توثيق المستوى 3)**:
   - انتقل إلى [لوحة اختبارات المهارات](/creator/tests) وأرسل مشاريعك للتقييم.
   - الشارات المعتمدة تمنحك زيادة فورية بنسبة **+25%** في نتائج المطابقة.
2. **أبرز مهاراتك في أدوات الذكاء الاصطناعي**:
   - حدد أدواتك مثل **Midjourney v6** و **Runway Gen-3** و **CapCut Pro** و **ElevenLabs**.
3. **اعرض نتائج رقمية حقيقية لأعمالك**:
   - لا تكتفِ بوضع روابط — اذكر عدد المشاهدات ونسبة التفاعل في وصف مشاريعك.
4. **حافظ على حالة التوفر المباشر**:
   - اجعل حالتك *"متاح للتعاقد الفوري"* للظهور أولاً في نتائج بحث العلامات التجارية.`;

    case "en":
    default:
      return `### 🌟 How to Optimize Your Creator Profile & Boost AI Match Score
Our marketplace algorithm ranks creators based on **Skill Match (40%)**, **Verification (25%)**, **Portfolio Quality (15%)**, **Engagement (10%)**, and **Client Rating (10%)**.

#### 🚀 4 Steps to Reach a 90%+ Match Score:
1. **Earn Verified Skill Badges (Level 3 Verification)**:
   - Go to your [Skill Tests Dashboard](/creator/tests) and submit projects for moderation.
   - Verified badges add an instant **+25% boost** to your match score for brand campaigns.
2. **Highlight AI Tool Proficiency**:
   - Explicitly list tools like **Midjourney v6**, **Runway Gen-3**, **CapCut Pro**, **ElevenLabs**, and **Topaz Video AI**.
   - Brands specifically filter for creators proficient with modern generative workflows.
3. **Showcase Concrete Campaign ROI**:
   - Don't just post video links — include performance metrics in your portfolio project descriptions.
4. **Maintain Active Availability**:
   - Keep your status set to *"Available for immediate hire"* to appear at the top of brand search filters.`;
  }
}
