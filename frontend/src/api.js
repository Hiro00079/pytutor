
// api.js — All HTTP calls to the FastAPI backend
// Pattern: Centralized API client — one file, all endpoints

const API_BASE = "http://localhost:8000";

async function fetchJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Sessions ───
export const startSession = (userId) =>
  fetchJson("/session/start", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });

// ─── Chat ───
export const sendChat = (userId, sessionId, message) =>
  fetchJson("/chat", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, session_id: sessionId, message }),
  });

// ─── Code Execution ───
export const runCode = (code) =>
  fetchJson("/code/run", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

// ─── Progress & Curriculum ───
export const getProgress = (userId) => fetchJson(`/progress/${userId}`);
export const getCurriculum = (userId) => fetchJson(`/curriculum/${userId}`);

// ─── Settings ───
export const loadSettings = () => fetchJson("/settings/load");
export const saveSettings = (settings) =>
  fetchJson("/settings/save", {
    method: "POST",
    body: JSON.stringify(settings),
  });
export const testSettings = () =>
  fetchJson("/settings/test", { method: "POST" });



api_js = """// api.js — All HTTP calls to the FastAPI backend
// Pattern: Centralized API client — one file, all endpoints

const API_BASE = "http://localhost:8000";

async function fetchJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// Sessions
export const startSession = (userId) =>
  fetchJson("/session/start", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });

// Chat
export const sendChat = (userId, sessionId, message) =>
  fetchJson("/chat", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, session_id: sessionId, message }),
  });

// Code Execution
export const runCode = (code) =>
  fetchJson("/code/run", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

// Progress & Curriculum
export const getProgress = (userId) => fetchJson(`/progress/${userId}`);
export const getCurriculum = (userId) => fetchJson(`/curriculum/${userId}`);

// Settings
export const loadSettings = () => fetchJson("/settings/load");
export const saveSettings = (settings) =>
  fetchJson("/settings/save", {
    method: "POST",
    body: JSON.stringify(settings),
  });
export const testSettings = () =>
  fetchJson("/settings/test", { method: "POST" });
"""

with open("pytutor/frontend/src/api.js", "w") as f:
    f.write(api_js)

print("✅ api.js written")
