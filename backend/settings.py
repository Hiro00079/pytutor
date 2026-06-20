
settings_code = '''"""
settings.py — Read/write local settings.json

Security principle: Keys are stored locally in a JSON file.
They are NEVER sent to any server except the chosen AI provider.
"""

import json
from pathlib import Path

SETTINGS_PATH = Path(__file__).parent.parent / "data" / "settings.json"

DEFAULT_SETTINGS = {
    "provider": "claude",
    "api_key": "",
    "model": "claude-sonnet-4-6",
    "local_url": "http://localhost:11434",
}


def load_settings() -> dict:
    """Load settings from settings.json. Create with defaults if missing."""
    if not SETTINGS_PATH.exists():
        save_settings(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS.copy()
    
    with open(SETTINGS_PATH, "r") as f:
        settings = json.load(f)
    
    # Merge with defaults in case new fields were added since last save
    merged = DEFAULT_SETTINGS.copy()
    merged.update(settings)
    return merged


def save_settings(settings: dict):
    """Save settings to settings.json."""
    SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_PATH, "w") as f:
        json.dump(settings, f, indent=2)


def mask_settings() -> dict:
    """
    Return settings with API key masked (for display in frontend).
    Shows only first 4 and last 4 chars, e.g., "sk-a...bcde"
    """
    settings = load_settings()
    masked = settings.copy()
    key = masked.get("api_key", "")
    if len(key) > 8:
        masked["api_key"] = key[:4] + "..." + key[-4:]
    elif key:
        masked["api_key"] = "****"
    return masked
'''

with open("pytutor/backend/settings.py", "w") as f:
    f.write(settings_code)

print("✅ settings.py written")
