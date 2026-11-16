"""Gnani languages and voices. Voice key format: "<model>:<voice>".

Timbre v3.0 voices speak every supported language (verified against the API,
including Hinglish); Timbre v2.5 voices are tied to one language.
"""

LANGUAGES: dict[str, dict[str, str]] = {
    "en-IN": {"label": "English", "native": "English", "script": "Latin"},
    "hi-IN": {"label": "Hindi", "native": "हिन्दी", "script": "Devanagari"},
    "hi-en": {
        "label": "Hinglish",
        "native": "Hinglish",
        "script": "Devanagari for Hindi words, Latin for English words",
    },
    "ta-IN": {"label": "Tamil", "native": "தமிழ்", "script": "Tamil"},
    "te-IN": {"label": "Telugu", "native": "తెలుగు", "script": "Telugu"},
    "kn-IN": {"label": "Kannada", "native": "ಕನ್ನಡ", "script": "Kannada"},
    "ml-IN": {"label": "Malayalam", "native": "മലയാളം", "script": "Malayalam"},
    "mr-IN": {"label": "Marathi", "native": "मराठी", "script": "Devanagari"},
    "bn-IN": {"label": "Bengali", "native": "বাংলা", "script": "Bengali"},
    "gu-IN": {"label": "Gujarati", "native": "ગુજરાતી", "script": "Gujarati"},
    "pa-IN": {"label": "Punjabi", "native": "ਪੰਜਾਬੀ", "script": "Gurmukhi"},
}
DEFAULT_LANGUAGE = "en-IN"
ALL = tuple(LANGUAGES)

VOICES: dict[str, dict] = {
    "timbre-v3.0:Vasudha": {"label": "Vasudha · composed narrator", "languages": ALL},
    "timbre-v3.0:Yashraj": {"label": "Yashraj · warm narrator", "languages": ALL},
    "timbre-v3.0:Lakshmi": {"label": "Lakshmi · expressive storyteller", "languages": ALL},
    "timbre-v3.0:Shivani": {"label": "Shivani · warm, patient", "languages": ALL},
    "timbre-v3.0:Avinash": {"label": "Avinash · steady, deliberate", "languages": ALL},
    "timbre-v2.5:Girish": {"label": "Girish · energetic storyteller", "languages": ("en-IN",)},
    "timbre-v2.5:Trupti": {"label": "Trupti · upbeat, articulate", "languages": ("en-IN",)},
    "timbre-v2.5:Shlok": {"label": "Shlok · warm, conversational", "languages": ("en-IN",)},
    "timbre-v2.5:Nalini": {"label": "Nalini · clear Hindi narrator", "languages": ("hi-IN",)},
    "timbre-v2.5:Deepak": {"label": "Deepak · friendly Hindi voice", "languages": ("hi-IN",)},
    "timbre-v2.5:Poorvi": {"label": "Poorvi · natural Hinglish", "languages": ("hi-en",)},
}
DEFAULT_VOICE = "timbre-v3.0:Vasudha"

# Short line for voice previews, one per language.
PREVIEW_TEXT: dict[str, str] = {
    "en-IN": "Good morning. Here is your daily briefing, researched and read just for you.",
    "hi-IN": "सुप्रभात। यह है आपकी आज की ब्रीफ़िंग, ख़ास आपके लिए तैयार की गई।",
    "hi-en": "Good morning! यह है आपकी daily briefing, आज की सबसे ज़रूरी updates के साथ।",
    "ta-IN": "காலை வணக்கம். இது உங்களுக்கான இன்றைய செய்தி சுருக்கம்.",
    "te-IN": "శుభోదయం. ఇది మీ కోసం సిద్ధం చేసిన ఈరోజు వార్తా సంక్షిప్తం.",
    "kn-IN": "ಶುಭೋದಯ. ಇದು ನಿಮಗಾಗಿ ಸಿದ್ಧಪಡಿಸಿದ ಇಂದಿನ ಸುದ್ದಿ ಸಾರಾಂಶ.",
    "ml-IN": "സുപ്രഭാതം. ഇത് നിങ്ങൾക്കായി തയ്യാറാക്കിയ ഇന്നത്തെ വാർത്താ സംഗ്രഹമാണ്.",
    "mr-IN": "सुप्रभात. ही आहे तुमच्यासाठी तयार केलेली आजची बातमीपत्रिका.",
    "bn-IN": "সুপ্রভাত। এটি আপনার জন্য তৈরি আজকের সংবাদ সংক্ষেপ।",
    "gu-IN": "સુપ્રભાત. આ છે તમારા માટે તૈયાર કરેલો આજનો સમાચાર સારાંશ.",
    "pa-IN": "ਸ਼ੁਭ ਸਵੇਰ। ਇਹ ਤੁਹਾਡੇ ਲਈ ਤਿਆਰ ਕੀਤੀ ਅੱਜ ਦੀ ਖ਼ਬਰਾਂ ਦੀ ਸਾਰ।",
}


def voice_supports(voice_key: str, language: str) -> bool:
    return language in VOICES.get(voice_key, {}).get("languages", ())


def split_voice(key: str) -> tuple[str, str]:
    model, _, voice = key.partition(":")
    return model, voice
