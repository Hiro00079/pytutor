
settings_jsx = """import { useState, useEffect } from "react";
import { loadSettings, saveSettings, testSettings } from "../api";

export default function SettingsPanel({ onClose }) {
  const [settings, setSettings] = useState({
    provider: "claude",
    api_key: "",
    model: "",
    local_url: "http://localhost:11434",
  });
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => setSettings(s));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await saveSettings(settings);
    setSaving(false);
    onClose();
  };

  const handleTest = async () => {
    setTestResult("Testing...");
    try {
      const res = await testSettings();
      setTestResult(res.status === "success" ? "✅ " + res.message : "❌ " + res.message);
    } catch (e) {
      setTestResult("❌ " + e.message);
    }
  };

  const providers = [
    { key: "claude", label: "Claude (Anthropic)", defaultModel: "claude-sonnet-4-6" },
    { key: "openai", label: "OpenAI (ChatGPT)", defaultModel: "gpt-5.5" },
    { key: "gemini", label: "Google Gemini", defaultModel: "gemini-2.5-pro" },
    { key: "nvidia", label: "NVIDIA NIM", defaultModel: "nvidia/llama-3.1-nemotron-70b" },
    { key: "local", label: "Local (Ollama)", defaultModel: "llama3.1" },
  ];

  const currentProvider = providers.find((p) => p.key === settings.provider);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>

        {/* Provider Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">AI Provider</label>
          <div className="grid grid-cols-2 gap-2">
            {providers.map((p) => (
              <button
                key={p.key}
                onClick={() =>
                  setSettings({
                    ...settings,
                    provider: p.key,
                    model: p.defaultModel,
                  })
                }
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  settings.provider === p.key
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* API Key (not needed for local) */}
        {settings.provider !== "local" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">API Key</label>
            <input
              type="password"
              value={settings.api_key}
              onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
              placeholder={`Paste your ${currentProvider?.label} API key`}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500">
              Stored locally in settings.json. Never sent anywhere except {currentProvider?.label}.
            </p>
          </div>
        )}

        {/* Model */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Model</label>
          <input
            type="text"
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Local URL (only for Ollama) */}
        {settings.provider === "local" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Ollama Server URL</label>
            <input
              type="text"
              value={settings.local_url}
              onChange={(e) => setSettings({ ...settings, local_url: e.target.value })}
              placeholder="http://localhost:11434"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div className={`text-sm p-3 rounded-lg ${testResult.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {testResult}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleTest}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Test Connection
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
"""

with open("pytutor/frontend/src/panels/SettingsPanel.jsx", "w") as f:
    f.write(settings_jsx)

print("✅ SettingsPanel.jsx written")
