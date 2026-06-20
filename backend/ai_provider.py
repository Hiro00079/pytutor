
ai_provider_code = '''"""
ai_provider.py — Adapter for multiple AI providers

Pattern: Adapter Pattern
- One common interface: chat(messages, system_prompt)
- Multiple implementations hidden behind it
- Swap providers by changing one setting
"""

import os
import json
import requests
from typing import List, Dict

# Load settings from our settings module (we'll build this next)
from settings import load_settings


def chat(messages: List[Dict[str, str]], system_prompt: str) -> str:
    """
    Send a conversation to the configured AI provider and return the response text.
    
    Args:
        messages: List of {"role": "user"|"assistant", "content": "..."}
        system_prompt: The system instructions for the AI
    
    Returns:
        Raw text response from the AI (expected to be JSON)
    """
    settings = load_settings()
    provider = settings.get("provider", "claude")
    
    # Route to the correct adapter
    if provider == "claude":
        return _chat_claude(messages, system_prompt, settings)
    elif provider == "openai":
        return _chat_openai(messages, system_prompt, settings)
    elif provider == "gemini":
        return _chat_gemini(messages, system_prompt, settings)
    elif provider == "nvidia":
        return _chat_nvidia(messages, system_prompt, settings)
    elif provider == "local":
        return _chat_ollama(messages, system_prompt, settings)
    else:
        raise ValueError(f"Unknown provider: {provider}")


# ───────────────────────────────────────────────
# CLAUDE (Anthropic Messages API)
# ───────────────────────────────────────────────

def _chat_claude(messages, system_prompt, settings):
    """
    Anthropic Messages API — 2026 format
    Endpoint: POST https://api.anthropic.com/v1/messages
    Auth: x-api-key header
    Model: claude-sonnet-4-6 (current best balance of speed + intelligence)
    """
    api_key = settings.get("api_key", "")
    model = settings.get("model", "claude-sonnet-4-6")
    
    if not api_key:
        raise ValueError("Claude API key not configured. Go to Settings.")
    
    # Anthropic uses "system" as a top-level param, not in messages array
    payload = {
        "model": model,
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": messages,
    }
    
    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    
    # Claude returns content as a list of blocks; text is in .content[0].text
    return data["content"][0]["text"]


# ───────────────────────────────────────────────
# OPENAI (Chat Completions API)
# ───────────────────────────────────────────────

def _chat_openai(messages, system_prompt, settings):
    """
    OpenAI Chat Completions API — 2026 format
    Endpoint: POST https://api.openai.com/v1/chat/completions
    Auth: Authorization: Bearer {key}
    Model: gpt-5.5 (current as of 2026)
    """
    api_key = settings.get("api_key", "")
    model = settings.get("model", "gpt-5.5")
    
    if not api_key:
        raise ValueError("OpenAI API key not configured. Go to Settings.")
    
    # OpenAI puts system prompt in the messages array
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    
    payload = {
        "model": model,
        "messages": full_messages,
        "max_tokens": 4096,
    }
    
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    
    # OpenAI returns choices[0].message.content
    return data["choices"][0]["message"]["content"]


# ───────────────────────────────────────────────
# GEMINI (Google Generative Language API)
# ───────────────────────────────────────────────

def _chat_gemini(messages, system_prompt, settings):
    """
    Google Gemini API
    Endpoint: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
    Auth: key={api_key} as query param
    """
    api_key = settings.get("api_key", "")
    model = settings.get("model", "gemini-2.5-pro")
    
    if not api_key:
        raise ValueError("Gemini API key not configured. Go to Settings.")
    
    # Gemini format: contents array with role "user" or "model"
    contents = []
    for msg in messages:
        role = "model" if msg["role"] == "assistant" else msg["role"]
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}]
        })
    
    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": system_prompt}]},
    }
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    response = requests.post(
        url,
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    
    # Gemini returns candidates[0].content.parts[0].text
    return data["candidates"][0]["content"]["parts"][0]["text"]


# ───────────────────────────────────────────────
# NVIDIA NIM (OpenAI-compatible)
# ───────────────────────────────────────────────

def _chat_nvidia(messages, system_prompt, settings):
    """
    NVIDIA NIM API — OpenAI-compatible format
    Endpoint: POST https://integrate.api.nvidia.com/v1/chat/completions
    Auth: Authorization: Bearer {key}
    """
    api_key = settings.get("api_key", "")
    model = settings.get("model", "nvidia/llama-3.1-nemotron-70b")
    
    if not api_key:
        raise ValueError("NVIDIA API key not configured. Go to Settings.")
    
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    
    payload = {
        "model": model,
        "messages": full_messages,
        "max_tokens": 4096,
    }
    
    response = requests.post(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    
    return data["choices"][0]["message"]["content"]


# ───────────────────────────────────────────────
# LOCAL / OLLAMA
# ───────────────────────────────────────────────

def _chat_ollama(messages, system_prompt, settings):
    """
    Ollama local API — no API key needed
    Endpoint: POST http://localhost:11434/api/chat
    """
    local_url = settings.get("local_url", "http://localhost:11434")
    model = settings.get("model", "llama3.1")
    
    # Ollama uses "system" message in the messages array
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    
    payload = {
        "model": model,
        "messages": full_messages,
        "stream": False,
    }
    
    response = requests.post(
        f"{local_url}/api/chat",
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=120,  # Local models can be slower
    )
    response.raise_for_status()
    data = response.json()
    
    # Ollama returns message.content
    return data["message"]["content"]
'''

with open("pytutor/backend/ai_provider.py", "w") as f:
    f.write(ai_provider_code)

print("✅ ai_provider.py written")
print(f"Size: {len(ai_provider_code)} characters")
