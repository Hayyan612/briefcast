"""Gnani voices offered in the UI. Key format: "<model>:<voice>"."""

VOICES: dict[str, dict[str, str]] = {
    "timbre-v3.0:Vasudha": {"label": "Vasudha · composed narrator", "language": "en-IN"},
    "timbre-v3.0:Yashraj": {"label": "Yashraj · warm narrator", "language": "en-IN"},
    "timbre-v3.0:Lakshmi": {"label": "Lakshmi · expressive storyteller", "language": "en-IN"},
    "timbre-v2.5:Girish": {"label": "Girish · energetic storyteller", "language": "en-IN"},
    "timbre-v2.5:Trupti": {"label": "Trupti · upbeat, articulate", "language": "en-IN"},
    "timbre-v2.5:Shlok": {"label": "Shlok · warm, conversational", "language": "en-IN"},
}
DEFAULT_VOICE = "timbre-v3.0:Vasudha"


def split_voice(key: str) -> tuple[str, str, str]:
    model, _, voice = key.partition(":")
    return model, voice, VOICES.get(key, {}).get("language", "en-IN")
