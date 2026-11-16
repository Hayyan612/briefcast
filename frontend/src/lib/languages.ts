/** Episode languages (mirrors the API's /languages; the API validates every value). */
export const LANGUAGES = [
  { code: "en-IN", label: "English", native: "English" },
  { code: "hi-IN", label: "Hindi", native: "हिन्दी" },
  { code: "hi-en", label: "Hinglish", native: "Hinglish" },
  { code: "ta-IN", label: "Tamil", native: "தமிழ்" },
  { code: "te-IN", label: "Telugu", native: "తెలుగు" },
  { code: "kn-IN", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml-IN", label: "Malayalam", native: "മലയാളം" },
  { code: "mr-IN", label: "Marathi", native: "मराठी" },
  { code: "bn-IN", label: "Bengali", native: "বাংলা" },
  { code: "gu-IN", label: "Gujarati", native: "ગુજરાતી" },
  { code: "pa-IN", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
] as const;

export function languageLabel(code: string): string {
  const lang = LANGUAGES.find((l) => l.code === code);
  if (!lang) return code;
  return lang.native === lang.label
    ? lang.label
    : `${lang.label} · ${lang.native}`;
}
