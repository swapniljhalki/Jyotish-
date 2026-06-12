// Localized Vedic names — planets (grahas), rashis, nakshatras, planet states.
// Keys are the English names emitted by the backend; values per language.
// Falls back to the English name when no mapping exists (e.g. lang === "en").

const PLANETS = {
  hi: { Sun: "सूर्य", Moon: "चंद्र", Mars: "मंगल", Mercury: "बुध", Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु", Uranus: "यूरेनस", Neptune: "नेपच्यून" },
  te: { Sun: "సూర్యుడు", Moon: "చంద్రుడు", Mars: "కుజుడు", Mercury: "బుధుడు", Jupiter: "గురువు", Venus: "శుక్రుడు", Saturn: "శని", Rahu: "రాహువు", Ketu: "కేతువు", Uranus: "యురేనస్", Neptune: "నెప్ట్యూన్" },
  ta: { Sun: "சூரியன்", Moon: "சந்திரன்", Mars: "செவ்வாய்", Mercury: "புதன்", Jupiter: "குரு", Venus: "சுக்கிரன்", Saturn: "சனி", Rahu: "ராகு", Ketu: "கேது", Uranus: "யுரேனஸ்", Neptune: "நெப்டியூன்" },
};

const RASHIS = {
  hi: { Aries: "मेष", Taurus: "वृषभ", Gemini: "मिथुन", Cancer: "कर्क", Leo: "सिंह", Virgo: "कन्या", Libra: "तुला", Scorpio: "वृश्चिक", Sagittarius: "धनु", Capricorn: "मकर", Aquarius: "कुंभ", Pisces: "मीन" },
  te: { Aries: "మేషం", Taurus: "వృషభం", Gemini: "మిథునం", Cancer: "కర్కాటకం", Leo: "సింహం", Virgo: "కన్య", Libra: "తుల", Scorpio: "వృశ్చికం", Sagittarius: "ధనుస్సు", Capricorn: "మకరం", Aquarius: "కుంభం", Pisces: "మీనం" },
  ta: { Aries: "மேஷம்", Taurus: "ரிஷபம்", Gemini: "மிதுனம்", Cancer: "கடகம்", Leo: "சிம்மம்", Virgo: "கன்னி", Libra: "துலாம்", Scorpio: "விருச்சிகம்", Sagittarius: "தனுசு", Capricorn: "மகரம்", Aquarius: "கும்பம்", Pisces: "மீனம்" },
};

const NAKSHATRAS = {
  hi: {
    Ashwini: "अश्विनी", Bharani: "भरणी", Krittika: "कृत्तिका", Rohini: "रोहिणी", Mrigashira: "मृगशिरा",
    Ardra: "आर्द्रा", Punarvasu: "पुनर्वसु", Pushya: "पुष्य", Ashlesha: "आश्लेषा", Magha: "मघा",
    "Purva Phalguni": "पूर्व फाल्गुनी", "Uttara Phalguni": "उत्तर फाल्गुनी", Hasta: "हस्त", Chitra: "चित्रा",
    Swati: "स्वाति", Vishakha: "विशाखा", Anuradha: "अनुराधा", Jyeshtha: "ज्येष्ठा", Mula: "मूल",
    "Purva Ashadha": "पूर्वाषाढ़ा", "Uttara Ashadha": "उत्तराषाढ़ा", Shravana: "श्रवण", Dhanishta: "धनिष्ठा",
    Shatabhisha: "शतभिषा", "Purva Bhadrapada": "पूर्व भाद्रपद", "Uttara Bhadrapada": "उत्तर भाद्रपद", Revati: "रेवती",
  },
  te: {
    Ashwini: "అశ్విని", Bharani: "భరణి", Krittika: "కృత్తిక", Rohini: "రోహిణి", Mrigashira: "మృగశిర",
    Ardra: "ఆరుద్ర", Punarvasu: "పునర్వసు", Pushya: "పుష్యమి", Ashlesha: "ఆశ్లేష", Magha: "మఖ",
    "Purva Phalguni": "పుబ్బ", "Uttara Phalguni": "ఉత్తర", Hasta: "హస్త", Chitra: "చిత్త",
    Swati: "స్వాతి", Vishakha: "విశాఖ", Anuradha: "అనూరాధ", Jyeshtha: "జ్యేష్ఠ", Mula: "మూల",
    "Purva Ashadha": "పూర్వాషాఢ", "Uttara Ashadha": "ఉత్తరాషాఢ", Shravana: "శ్రవణం", Dhanishta: "ధనిష్ఠ",
    Shatabhisha: "శతభిషం", "Purva Bhadrapada": "పూర్వాభాద్ర", "Uttara Bhadrapada": "ఉత్తరాభాద్ర", Revati: "రేవతి",
  },
  ta: {
    Ashwini: "அஸ்வினி", Bharani: "பரணி", Krittika: "கார்த்திகை", Rohini: "ரோகிணி", Mrigashira: "மிருகசீரிஷம்",
    Ardra: "திருவாதிரை", Punarvasu: "புனர்பூசம்", Pushya: "பூசம்", Ashlesha: "ஆயில்யம்", Magha: "மகம்",
    "Purva Phalguni": "பூரம்", "Uttara Phalguni": "உத்திரம்", Hasta: "அஸ்தம்", Chitra: "சித்திரை",
    Swati: "சுவாதி", Vishakha: "விசாகம்", Anuradha: "அனுஷம்", Jyeshtha: "கேட்டை", Mula: "மூலம்",
    "Purva Ashadha": "பூராடம்", "Uttara Ashadha": "உத்திராடம்", Shravana: "திருவோணம்", Dhanishta: "அவிட்டம்",
    Shatabhisha: "சதயம்", "Purva Bhadrapada": "பூரட்டாதி", "Uttara Bhadrapada": "உத்திரட்டாதி", Revati: "ரேவதி",
  },
};

const STATES = {
  hi: { Retrograde: "वक्री", Combust: "अस्त", Exalted: "उच्च", Debilitated: "नीच", Vargottam: "वर्गोत्तम" },
  te: { Retrograde: "వక్రం", Combust: "అస్తంగతం", Exalted: "ఉచ్ఛ", Debilitated: "నీచ", Vargottam: "వర్గోత్తమ" },
  ta: { Retrograde: "வக்கிரம்", Combust: "அஸ்தங்கம்", Exalted: "உச்சம்", Debilitated: "நீசம்", Vargottam: "வர்கோத்தமம்" },
};

const pick = (table, name, lang) => table[lang]?.[name] || name;

export const localizePlanet = (name, lang) => pick(PLANETS, name, lang);
export const localizeRashi = (name, lang) => pick(RASHIS, name, lang);
export const localizeNakshatra = (name, lang) => pick(NAKSHATRAS, name, lang);
export const localizeState = (name, lang) => pick(STATES, name, lang);
