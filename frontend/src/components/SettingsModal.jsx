import React, { useEffect, useState } from "react";
import * as api from "../api.js";

const PROVIDERS = [
  { id: "claude", label: "Claude", modelHint: "claude-sonnet-4-6 / claude-opus-4-7" },
  { id: "openai", label: "ChatGPT", modelHint: "gpt-4o" },
  { id: "gemini", label: "Gemini", modelHint: "gemini-1.5-pro" },
  { id: "nvidia", label: "NVIDIA NIM", modelHint: "meta/llama-3.1-70b-instruct" },
  { id: "local", label: "Local (Ollama)", modelHint: "llama3.1 / codellama / mistral" },
];

export default function SettingsModal({ open, onClose, onSaved }) {
  const [settings, setSettings] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (open) {
      setTestResult(null);
      api
        .loadSettings()
        .then(setSettings)
        .catch((e) => setLoadError(e.message || "Couldn't load settings."));
    }
  }, [open]);

  if (!open) return null;
  if (loadError) {
    return (
      <Backdrop onClose={onClose}>
        <p className="text-sm text-danger">{loadError}</p>
      </Backdrop>
    );
  }
  if (!settings) {
    return (
      <Backdrop onClose={onClose}>
        <p className="text-sm text-mute">Loading…</p>
      </Backdrop>
    );
  }

  const provider = settings.provider;
  const isLocal = provider === "local";

  const updateField = (section, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testSettings(provider);
      setTestResult(result);
    } catch (e) {
      setTestResult({ ok: false, detail: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await api.saveSettings(settings);
      setSettings(saved);
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setTestResult({ ok: false, detail: e.message || "Couldn't save settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Backdrop onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-ink">Settings</h2>
        <button onClick={onClose} className="text-mute hover:text-ink">
          ✕
        </button>
      </div>

      <div className="mt-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-mute">AI Provider</p>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSettings((prev) => ({ ...prev, provider: p.id }))}
              className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                provider === p.id
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-hairline bg-raised text-ink hover:border-amber/30"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!isLocal && (
        <div className="mt-4 space-y-2">
          <label className="font-mono text-[11px] uppercase tracking-wider text-mute">API Key</label>
          <input
            type="password"
            value={settings[provider]?.api_key || ""}
            onChange={(e) => updateField(provider, "api_key", e.target.value)}
            placeholder={`Paste your ${PROVIDERS.find((p) => p.id === provider)?.label} key`}
            className="w-full rounded-md border border-hairline bg-raised px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-amber/50"
          />
          <label className="font-mono text-[11px] uppercase tracking-wider text-mute">Model</label>
          <input
            value={settings[provider]?.model || ""}
            onChange={(e) => updateField(provider, "model", e.target.value)}
            placeholder={PROVIDERS.find((p) => p.id === provider)?.modelHint}
            className="w-full rounded-md border border-hairline bg-raised px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-amber/50"
          />
        </div>
      )}

      {isLocal && (
        <div className="mt-4 space-y-2">
          <label className="font-mono text-[11px] uppercase tracking-wider text-mute">Ollama Server URL</label>
          <input
            value={settings.local?.base_url || ""}
            onChange={(e) => updateField("local", "base_url", e.target.value)}
            placeholder="http://localhost:11434"
            className="w-full rounded-md border border-hairline bg-raised px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-amber/50"
          />
          <label className="font-mono text-[11px] uppercase tracking-wider text-mute">Model</label>
          <input
            value={settings.local?.model || ""}
            onChange={(e) => updateField("local", "model", e.target.value)}
            placeholder="llama3.1"
            className="w-full rounded-md border border-hairline bg-raised px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-amber/50"
          />
        </div>
      )}

      {testResult && (
        <p className={`mt-3 text-xs ${testResult.ok ? "text-teal" : "text-danger"}`}>
          {testResult.ok ? "✓ " : "✕ "}
          {testResult.detail}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={handleTest}
          disabled={testing}
          className="rounded-md border border-hairline bg-raised px-4 py-2 text-sm text-ink transition hover:border-violet/40 disabled:opacity-40"
        >
          {testing ? "Testing…" : "Test connection"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-amber px-4 py-2 text-sm font-medium text-void transition hover:brightness-110 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <p className="mt-3 font-mono text-[10px] text-mute">
        Keys are written to data/settings.json on this machine only, and are sent only to the provider you select.
      </p>
    </Backdrop>
  );
}

function Backdrop({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-hairline bg-panel p-5 shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}
