"""Adapter that routes a chat turn to whichever provider is active in
settings.json, and normalizes every provider's reply down to plain text
so the rest of the app never has to know which one answered.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

import httpx

from settings import load_settings

TIMEOUT = httpx.Timeout(60.0, connect=10.0)


class ProviderError(Exception):
    """Raised when a provider call fails (bad key, network, bad response)."""


async def chat(messages: List[Dict[str, str]], system_prompt: str,
                provider_override: Optional[str] = None) -> str:
    """messages: [{"role": "user"|"assistant", "content": "..."}]
    Returns the raw text reply from the model (expected to be JSON, but
    that's parsed by the caller via parse_ai_json)."""
    cfg = load_settings()
    provider = provider_override or cfg["provider"]

    if provider == "claude":
        return await _chat_claude(messages, system_prompt, cfg["claude"])
    if provider == "openai":
        return await _chat_openai(messages, system_prompt, cfg["openai"])
    if provider == "gemini":
        return await _chat_gemini(messages, system_prompt, cfg["gemini"])
    if provider == "nvidia":
        return await _chat_nvidia(messages, system_prompt, cfg["nvidia"])
    if provider == "local":
        return await _chat_ollama(messages, system_prompt, cfg["local"])
    raise ProviderError(f"Unknown provider: {provider}")


# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------

async def _chat_claude(messages, system_prompt, cfg) -> str:
    if not cfg.get("api_key"):
        raise ProviderError("No Claude API key set. Add one in Settings.")
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": cfg["api_key"],
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": cfg.get("model") or "claude-sonnet-4-6",
                "max_tokens": 2000,
                "system": system_prompt,
                "messages": messages,
            },
        )
    _raise_for_status(resp, "Claude")
    data = resp.json()
    parts = [b["text"] for b in data.get("content", []) if b.get("type") == "text"]
    return "\n".join(parts)


async def _chat_openai(messages, system_prompt, cfg) -> str:
    if not cfg.get("api_key"):
        raise ProviderError("No OpenAI API key set. Add one in Settings.")
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {cfg['api_key']}"},
            json={
                "model": cfg.get("model") or "gpt-4o",
                "messages": [{"role": "system", "content": system_prompt}, *messages],
                "response_format": {"type": "json_object"},
            },
        )
    _raise_for_status(resp, "OpenAI")
    data = resp.json()
    return data["choices"][0]["message"]["content"]


async def _chat_gemini(messages, system_prompt, cfg) -> str:
    if not cfg.get("api_key"):
        raise ProviderError("No Gemini API key set. Add one in Settings.")
    model = cfg.get("model") or "gemini-1.5-pro"
    contents = [
        {"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]}
        for m in messages
    ]
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": cfg["api_key"]},
            json={
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": contents,
                "generationConfig": {"response_mime_type": "application/json"},
            },
        )
    _raise_for_status(resp, "Gemini")
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


async def _chat_nvidia(messages, system_prompt, cfg) -> str:
    if not cfg.get("api_key"):
        raise ProviderError("No NVIDIA NIM API key set. Add one in Settings.")
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {cfg['api_key']}"},
            json={
                "model": cfg.get("model") or "meta/llama-3.1-70b-instruct",
                "messages": [{"role": "system", "content": system_prompt}, *messages],
            },
        )
    _raise_for_status(resp, "NVIDIA NIM")
    data = resp.json()
    return data["choices"][0]["message"]["content"]


async def _chat_ollama(messages, system_prompt, cfg) -> str:
    base_url = (cfg.get("base_url") or "http://localhost:11434").rstrip("/")
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.post(
                f"{base_url}/api/chat",
                json={
                    "model": cfg.get("model") or "llama3.1",
                    "messages": [{"role": "system", "content": system_prompt}, *messages],
                    "stream": False,
                    "format": "json",
                },
            )
        except httpx.ConnectError as e:
            raise ProviderError(
                f"Couldn't reach Ollama at {base_url}. Is it running? ({e})"
            ) from e
    _raise_for_status(resp, "Ollama")
    data = resp.json()
    return data["message"]["content"]


def _raise_for_status(resp: httpx.Response, provider_name: str) -> None:
    if resp.status_code >= 400:
        detail = resp.text[:500]
        raise ProviderError(f"{provider_name} returned {resp.status_code}: {detail}")


# ---------------------------------------------------------------------------
# JSON parsing safety net
# ---------------------------------------------------------------------------

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def parse_ai_json(raw: str) -> Dict[str, Any]:
    """Models occasionally wrap JSON in markdown fences or add stray text
    despite instructions. Strip the common cases before giving up."""
    text = raw.strip()
    text = _FENCE_RE.sub("", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Last resort: grab the largest {...} span in the text.
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    raise ProviderError("AI did not return valid JSON.")


async def test_provider(provider: str) -> Dict[str, Any]:
    """Fire a tiny test request against the given provider. Used by
    POST /settings/test."""
    try:
        reply = await chat(
            messages=[{"role": "user", "content": 'Reply with exactly: {"message": "ok", "action": "explain"}'}],
            system_prompt="You are a connectivity test. Reply with strictly valid JSON, nothing else.",
            provider_override=provider,
        )
        parse_ai_json(reply)
        return {"ok": True, "detail": "Connected successfully."}
    except ProviderError as e:
        return {"ok": False, "detail": str(e)}
    except Exception as e:  # noqa: BLE001 - surface any unexpected failure to the UI
        return {"ok": False, "detail": f"Unexpected error: {e}"}
