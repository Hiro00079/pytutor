"""Read/write data/settings.json — the only place API keys live.

Keys never touch the database and are never logged. /settings/load
returns a masked copy so the frontend can show "sk-ant-...wxyz" style
placeholders without re-exposing the real secret.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any, Dict

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SETTINGS_PATH = DATA_DIR / "settings.json"

DEFAULT_SETTINGS: Dict[str, Any] = {
    "provider": "claude",
    "claude": {"api_key": "", "model": "claude-sonnet-4-6"},
    "openai": {"api_key": "", "model": "gpt-4o"},
    "gemini": {"api_key": "", "model": "gemini-1.5-pro"},
    "nvidia": {"api_key": "", "model": "meta/llama-3.1-70b-instruct"},
    "local": {"base_url": "http://localhost:11434", "model": "llama3.1"},
}

_KEY_FIELDS = {"claude", "openai", "gemini", "nvidia"}  # providers that hold api_key


def _mask(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "*" * len(key)
    return f"{key[:4]}{'*' * (len(key) - 8)}{key[-4:]}"


def load_settings() -> Dict[str, Any]:
    """Load raw settings (including real keys) for internal use by ai_provider."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not SETTINGS_PATH.exists():
        with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_SETTINGS, f, indent=2)
        return copy.deepcopy(DEFAULT_SETTINGS)
    try:
        with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        data = copy.deepcopy(DEFAULT_SETTINGS)
    # Backfill any missing keys from defaults (e.g. after a schema change)
    merged = copy.deepcopy(DEFAULT_SETTINGS)
    for k, v in data.items():
        if isinstance(v, dict) and k in merged:
            merged[k].update(v)
        else:
            merged[k] = v
    return merged


def load_settings_masked() -> Dict[str, Any]:
    """Load settings safe to send to the frontend (keys masked, not removed)."""
    data = copy.deepcopy(load_settings())
    for provider in _KEY_FIELDS:
        if data.get(provider, {}).get("api_key"):
            data[provider]["api_key"] = _mask(data[provider]["api_key"])
    return data


def save_settings(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Persist settings to disk. Preserves existing keys for providers that
    weren't part of this save (so switching providers in the UI doesn't
    wipe out keys you'd already saved for the others)."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    current = load_settings()
    merged = copy.deepcopy(current)
    for k, v in payload.items():
        if isinstance(v, dict) and k in merged and isinstance(merged[k], dict):
            for sub_k, sub_v in v.items():
                # Don't overwrite a real key with a masked placeholder coming
                # back from the frontend (e.g. "sk-a****wxyz").
                if sub_k == "api_key" and isinstance(sub_v, str) and "*" in sub_v:
                    continue
                # Don't blank out an existing value with an empty string -
                # the frontend may submit a partial form that left a field
                # untouched, which arrives here as "".
                if sub_v == "" and merged[k].get(sub_k):
                    continue
                merged[k][sub_k] = sub_v
        else:
            merged[k] = v
    with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2)
    return merged
