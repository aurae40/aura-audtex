/**
 * AuRA Multi-Language Sovereign Greetings Service
 *
 * Provides authentic, culturally respectful "Greetings from AuRA to you all"
 * translated into the national and regional languages for all 197 sovereign nations.
 */

export interface NativeGreetingInfo {
  greeting: string;
  translation: string;
  language: string;
  bcp47: string;
}

const SPECIFIC_COUNTRY_GREETINGS: Record<string, NativeGreetingInfo> = {
  // Amharic (Ethiopia)
  ET: {
    greeting: 'ከ AuRA ለሁላችሁም ሞቅ ያለ ሰላምታ!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Amharic (አማርኛ)',
    bcp47: 'am-ET',
  },

  // Japanese
  JP: {
    greeting: 'AuRAより皆様へ心よりのご挨拶を申し上げます。',
    translation: 'Greetings from AuRA to you all!',
    language: 'Japanese (日本語)',
    bcp47: 'ja-JP',
  },

  // Chinese
  CN: {
    greeting: 'AuRA向大家致以最诚挚的问候！',
    translation: 'Greetings from AuRA to you all!',
    language: 'Chinese (简体中文)',
    bcp47: 'zh-CN',
  },
  TW: {
    greeting: 'AuRA向大家致以最誠摯的問候！',
    translation: 'Greetings from AuRA to you all!',
    language: 'Chinese (繁體中文)',
    bcp47: 'zh-TW',
  },
  HK: {
    greeting: 'AuRA向各位致以最誠摯的問候！',
    translation: 'Greetings from AuRA to you all!',
    language: 'Cantonese / Chinese',
    bcp47: 'zh-HK',
  },

  // Korean
  KR: {
    greeting: 'AuRA에서 여러분 모두에게 전하는 따뜻한 인사!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Korean (한국어)',
    bcp47: 'ko-KR',
  },

  // Hindi (India)
  IN: {
    greeting: 'AuRA की ओर से आप सभी को हार्दिक नमस्कार!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Hindi (हिन्दी)',
    bcp47: 'hi-IN',
  },

  // Canada (Bilingual English & French)
  CA: {
    greeting: "Greetings from AuRA to you all! · Salutations chaleureuses d'AuRA à vous tous !",
    translation: 'Greetings from AuRA to you all (English & French)',
    language: 'English & French (Français)',
    bcp47: 'en-CA',
  },

  // German
  DE: {
    greeting: 'Herzliche Grüße von AuRA an euch alle!',
    translation: 'Greetings from AuRA to you all!',
    language: 'German (Deutsch)',
    bcp47: 'de-DE',
  },
  AT: {
    greeting: 'Herzliche Grüße von AuRA an euch alle!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Austrian German (Deutsch)',
    bcp47: 'de-AT',
  },
  LI: {
    greeting: 'Herzliche Grüße von AuRA an euch alle!',
    translation: 'Greetings from AuRA to you all!',
    language: 'German (Deutsch)',
    bcp47: 'de-LI',
  },
  CH: {
    greeting: "Herzliche Grüße von AuRA! · Salutations chaleureuses d'AuRA !",
    translation: 'Greetings from AuRA to you all!',
    language: 'German, French & Italian',
    bcp47: 'de-CH',
  },

  // Italian
  IT: {
    greeting: 'Un caloroso saluto da AuRA a tutti voi!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Italian (Italiano)',
    bcp47: 'it-IT',
  },
  SM: {
    greeting: 'Un caloroso saluto da AuRA a tutti voi!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Italian (Italiano)',
    bcp47: 'it-IT',
  },
  VA: {
    greeting: 'Un caloroso saluto da AuRA a tutti voi! · Salve a tutti da AuRA',
    translation: 'Greetings from AuRA to you all!',
    language: 'Italian & Latin',
    bcp47: 'it-IT',
  },

  // Greek
  GR: {
    greeting: 'Θερμούς χαιρετισμούς από το AuRA σε όλους σας!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Greek (Ελληνικά)',
    bcp47: 'el-GR',
  },
  CY: {
    greeting: 'Θερμούς χαιρετισμούς από το AuRA σε όλους σας!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Greek & Turkish',
    bcp47: 'el-CY',
  },

  // Turkish
  TR: {
    greeting: "AuRA'dan hepinize en içten selamlar!",
    translation: 'Greetings from AuRA to you all!',
    language: 'Turkish (Türkçe)',
    bcp47: 'tr-TR',
  },

  // Polish
  PL: {
    greeting: 'Serdeczne pozdrowienia od AuRA dla was wszystkich!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Polish (Polski)',
    bcp47: 'pl-PL',
  },

  // Dutch
  NL: {
    greeting: 'Hartelijke groeten van AuRA aan jullie allemaal!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Dutch (Nederlands)',
    bcp47: 'nl-NL',
  },
  BE: {
    greeting: "Hartelijke groeten van AuRA! · Salutations chaleureuses d'AuRA !",
    translation: 'Greetings from AuRA to you all!',
    language: 'Dutch & French',
    bcp47: 'nl-BE',
  },

  // Nordic
  SE: {
    greeting: 'Varma hälsningar från AuRA till er alla!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Swedish (Svenska)',
    bcp47: 'sv-SE',
  },
  NO: {
    greeting: 'Varme hilsener fra AuRA til dere alle!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Norwegian (Norsk)',
    bcp47: 'no-NO',
  },
  DK: {
    greeting: 'Varme hilsner fra AuRA til jer alle!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Danish (Dansk)',
    bcp47: 'da-DK',
  },
  FI: {
    greeting: 'Lämpimät terveiset AuRA:lta teille kaikille!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Finnish (Suomi)',
    bcp47: 'fi-FI',
  },
  IS: {
    greeting: 'Kærar kveðjur frá AuRA til ykkar allra!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Icelandic (Íslenska)',
    bcp47: 'is-IS',
  },

  // Hebrew
  IL: {
    greeting: '!ברכות חמות מ-AuRA לכולכם',
    translation: 'Greetings from AuRA to you all!',
    language: 'Hebrew (עברית)',
    bcp47: 'he-IL',
  },

  // Persian / Farsi
  IR: {
    greeting: '!درودهای گرم از طرف AuRA به همه شما',
    translation: 'Greetings from AuRA to you all!',
    language: 'Persian (فارسی)',
    bcp47: 'fa-IR',
  },

  // Urdu
  PK: {
    greeting: '!AuRA کی طرف سے آپ سب کو پرخلوص سلام',
    translation: 'Greetings from AuRA to you all!',
    language: 'Urdu (اردو)',
    bcp47: 'ur-PK',
  },

  // Bengali
  BD: {
    greeting: 'AuRA-র পক্ষ থেকে আপনাদের সবাইকে আন্তরিক শুভেচ্ছা!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Bengali (বাংলা)',
    bcp47: 'bn-BD',
  },

  // Ukrainian
  UA: {
    greeting: 'Щирі вітання від AuRA всім вам!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Ukrainian (Українська)',
    bcp47: 'uk-UA',
  },

  // Czech
  CZ: {
    greeting: 'Srdečné pozdravy od AuRA vám všem!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Czech (Čeština)',
    bcp47: 'cs-CZ',
  },

  // Hungarian
  HU: {
    greeting: 'Szívélyes üdvözlet az AuRA-tól mindannyiótoknak!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Hungarian (Magyar)',
    bcp47: 'hu-HU',
  },

  // Romanian
  RO: {
    greeting: 'Calde salutări de la AuRA pentru voi toți!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Romanian (Română)',
    bcp47: 'ro-RO',
  },
  MD: {
    greeting: 'Calde salutări de la AuRA pentru voi toți!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Romanian (Română)',
    bcp47: 'ro-MD',
  },

  // Vietnamese
  VN: {
    greeting: 'Lời chào nồng nhiệt từ AuRA gửi đến tất cả các bạn!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Vietnamese (Tiếng Việt)',
    bcp47: 'vi-VN',
  },

  // Thai
  TH: {
    greeting: 'ความปรารถนาดีและคำทักทายจาก AuRA ถึงทุกท่าน!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Thai (ไทย)',
    bcp47: 'th-TH',
  },

  // Indonesian & Malay
  ID: {
    greeting: 'Salam hangat dari AuRA untuk Anda semua!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Indonesian (Bahasa Indonesia)',
    bcp47: 'id-ID',
  },
  MY: {
    greeting: 'Salam mesra daripada AuRA kepada anda semua!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Malay (Bahasa Melayu)',
    bcp47: 'ms-MY',
  },

  // Tagalog / Filipino
  PH: {
    greeting: 'Mainit na pagbati mula sa AuRA para sa inyong lahat!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Filipino (Tagalog)',
    bcp47: 'fil-PH',
  },

  // Swahili (East Africa)
  KE: {
    greeting: 'Salamu za upendo kutoka AuRA kwa nyote!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Swahili (Kiswahili) & English',
    bcp47: 'sw-KE',
  },
  TZ: {
    greeting: 'Salamu za upendo kutoka AuRA kwa nyote!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Swahili (Kiswahili)',
    bcp47: 'sw-TZ',
  },
  UG: {
    greeting: 'Salamu za upendo kutoka AuRA kwa nyote! · Warm greetings to you all!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Swahili & English',
    bcp47: 'sw-UG',
  },

  // Irish
  IE: {
    greeting: 'Beannachtaí ó chroí ó AuRA dhaoibh go léir!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Irish (Gaeilge)',
    bcp47: 'ga-IE',
  },

  // Armenian
  AM: {
    greeting: 'Ջերմ ողջույններ AuRA-ից ձեզ բոլորին:',
    translation: 'Greetings from AuRA to you all!',
    language: 'Armenian (Հայերեն)',
    bcp47: 'hy-AM',
  },

  // Georgian
  GE: {
    greeting: 'გულთბილი მოკითხვა AuRA-სგან ყველას!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Georgian (ქართული)',
    bcp47: 'ka-GE',
  },

  // Mongolian
  MN: {
    greeting: 'AuRA-аас та бүхэндээ чин сэтгэлийн мэндчилгээ дэвшүүлье!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Mongolian (Монгол)',
    bcp47: 'mn-MN',
  },

  // Nepali
  NP: {
    greeting: 'AuRA बाट तपाईंहरू सबैलाई हार्दिक अभिवादन!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Nepali (नेपाली)',
    bcp47: 'ne-NP',
  },

  // Sinhala (Sri Lanka)
  LK: {
    greeting: 'AuRA වෙතින් ඔබ සැමට උණුසුම් සුභ පැතුම්!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Sinhala (සිංහල)',
    bcp47: 'si-LK',
  },

  // Khmer (Cambodia)
  KH: {
    greeting: 'សូមស្វាគមន៍ និងសួស្តីយ៉ាងកក់ក្តៅពី AuRA ជូនចំពោះអ្នកទាំងអស់គ្នា!',
    translation: 'Greetings from AuRA to you all!',
    language: 'Khmer (ភាសាខ្មែរ)',
    bcp47: 'km-KH',
  },

  // Global Universal
  GLOBAL: {
    greeting: 'Warm greetings from AuRA to all global readers, thinkers, and explorers!',
    translation: 'Greetings from AuRA to you all across the Earth!',
    language: 'Universal Human Codex',
    bcp47: 'en-US',
  },
};

// Language Groups by ISO Country Codes
const SPANISH_COUNTRIES = new Set([
  'ES', 'MX', 'CO', 'AR', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU',
  'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ'
]);

const ARABIC_COUNTRIES = new Set([
  'SA', 'EG', 'DZ', 'MA', 'IQ', 'SD', 'YE', 'SY', 'TN', 'JO',
  'AE', 'LB', 'LY', 'PS', 'OM', 'KW', 'MR', 'QA', 'BH', 'DJ', 'KM', 'SO'
]);

const FRENCH_COUNTRIES = new Set([
  'FR', 'SN', 'CI', 'MG', 'CM', 'ML', 'GN', 'RW', 'TD', 'BI',
  'BJ', 'TG', 'CF', 'CG', 'GA', 'MC', 'HT', 'VU', 'LU', 'SC', 'CD'
]);

const PORTUGUESE_COUNTRIES = new Set([
  'BR', 'PT', 'AO', 'MZ', 'GW', 'TL', 'CV', 'ST'
]);

const RUSSIAN_COUNTRIES = new Set([
  'RU', 'BY', 'KZ', 'KG', 'TJ', 'UZ', 'TM'
]);

/**
 * Returns the authentic native language greeting from AuRA for any country code.
 */
export function getCountryNativeGreeting(countryCode: string): NativeGreetingInfo {
  const code = (countryCode || '').toUpperCase();

  // 1. Direct specific match
  if (SPECIFIC_COUNTRY_GREETINGS[code]) {
    return SPECIFIC_COUNTRY_GREETINGS[code];
  }

  // 2. Spanish-speaking countries
  if (SPANISH_COUNTRIES.has(code)) {
    return {
      greeting: '¡Un cordial saludo de AuRA para todos ustedes!',
      translation: 'Greetings from AuRA to you all!',
      language: 'Spanish (Español)',
      bcp47: 'es-ES',
    };
  }

  // 3. Arabic-speaking countries
  if (ARABIC_COUNTRIES.has(code)) {
    return {
      greeting: 'تحية طيبة ومباركة من AuRA لكم جميعاً!',
      translation: 'Greetings from AuRA to you all!',
      language: 'Arabic (العربية)',
      bcp47: 'ar-SA',
    };
  }

  // 4. French-speaking countries
  if (FRENCH_COUNTRIES.has(code)) {
    return {
      greeting: "Salutations chaleureuses d'AuRA à vous tous !",
      translation: 'Greetings from AuRA to you all!',
      language: 'French (Français)',
      bcp47: 'fr-FR',
    };
  }

  // 5. Portuguese-speaking countries
  if (PORTUGUESE_COUNTRIES.has(code)) {
    return {
      greeting: 'Uma calorosa saudação da AuRA para todos vocês!',
      translation: 'Greetings from AuRA to you all!',
      language: 'Portuguese (Português)',
      bcp47: 'pt-PT',
    };
  }

  // 6. Russian-speaking / post-Soviet nations
  if (RUSSIAN_COUNTRIES.has(code)) {
    return {
      greeting: 'Сердечный привет от AuRA всем вам!',
      translation: 'Greetings from AuRA to you all!',
      language: 'Russian (Русский)',
      bcp47: 'ru-RU',
    };
  }

  // 7. Default English for Commonwealth & international users
  return {
    greeting: 'Warm greetings from AuRA to you all!',
    translation: 'Greetings from AuRA to you all!',
    language: 'English',
    bcp47: 'en-US',
  };
}

/**
 * Speaks the native greeting out loud using Web Speech Synthesis in the target language.
 */
export function speakNativeGreeting(greetingInfo: NativeGreetingInfo): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(greetingInfo.greeting);
    utterance.lang = greetingInfo.bcp47;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick best matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const targetLangPrefix = greetingInfo.bcp47.split('-')[0].toLowerCase();
    const matchingVoice = voices.find(
      (v) => v.lang.toLowerCase().startsWith(targetLangPrefix)
    );
    if (matchingVoice) utterance.voice = matchingVoice;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis unavailable for greeting:', err);
  }
}
