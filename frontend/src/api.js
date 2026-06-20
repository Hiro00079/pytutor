const BASE_URL = "http://127.0.0.1:8000";

async function handle(resp) {
  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = await resp.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      // ignore — keep statusText
    }
    const err = new Error(detail);
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

export async function startSession({ userId, name }) {
  const resp = await fetch(`${BASE_URL}/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId ?? null, name: name ?? "Learner" }),
  });
  return handle(resp);
}

export async function sendChat({ userId, sessionId, message, mode, codeContext }) {
  const resp = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      session_id: sessionId,
      message,
      mode,
      code_context: codeContext ?? null,
    }),
  });
  return handle(resp);
}

export async function getProgress(userId) {
  const resp = await fetch(`${BASE_URL}/progress/${userId}`);
  return handle(resp);
}

export async function getCurriculum(userId) {
  const resp = await fetch(`${BASE_URL}/curriculum/${userId}`);
  return handle(resp);
}

export async function runCode(code) {
  const resp = await fetch(`${BASE_URL}/code/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, timeout_seconds: 8 }),
  });
  return handle(resp);
}

export async function loadSettings() {
  const resp = await fetch(`${BASE_URL}/settings/load`);
  return handle(resp);
}

export async function saveSettings(payload) {
  const resp = await fetch(`${BASE_URL}/settings/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle(resp);
}

export async function testSettings(provider) {
  const resp = await fetch(`${BASE_URL}/settings/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
  return handle(resp);
}
