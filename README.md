# PyTutor AI

A locally-run, AI-controlled Python learning IDE. The AI doesn't just chat —
it writes code into the editor, generates quizzes, edits the curriculum, and
tracks your progress, by always replying in a structured JSON contract that
the frontend renders directly. Swap between Claude, ChatGPT, Gemini, NVIDIA
NIM, or a local Ollama model from the settings panel.

```
┌─────────────────────┬─────────────────────┐
│   Teaching           │     Codespace        │
│   theory + quizzes   │     Monaco editor    │
├─────────────────────┼─────────────────────┤
│   Curriculum         │   Progress           │
│   topic states       │   scores + ring      │
└─────────────────────┴─────────────────────┘
```
## NOTE: HELP OF AI MODELS IS TAKEN FOR CREATION, (still in development, bugs exists)
## Quick start

**1. Backend**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt --break-system-packages  # drop the flag if not using break-system-packages distros
uvicorn main:app --reload --port 8000
```

**2. Frontend** (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Click the gear icon, pick a provider, paste
an API key, hit **Test connection**, then **Save**. Type "go" in the
Teaching panel to start your first lesson.

No backend code change is needed to add a key — everything lives in
`data/settings.json`, written by the Settings panel and read by
`backend/ai_provider.py` on every request.

## How it's wired

- **`backend/main.py`** — all routes from the brief: session start, chat,
  progress, curriculum, code run, settings load/save/test.
- **`backend/ai_provider.py`** — one `chat()` function that dispatches to
  whichever provider is active, normalizes every response down to plain
  text, and `parse_ai_json()` strips markdown fences / stray prose if a
  model doesn't follow the JSON-only instruction perfectly.
- **`backend/prompts.py`** — the system prompt and the five teaching modes
  (TEACH / QUIZ / REVIEW / INTERVIEW / EXPLAIN) from the brief.
- **`backend/database.py`** — SQLite, three tables from the brief
  (`users`, `sessions`, `progress`) plus a fourth, `curriculum`, to back
  `GET /curriculum/{user_id}` with locked/active/done state per topic.
  A session's full message history is stored as JSON and replayed on every
  `/chat` call — this is the "memory" mechanism described in the brief.
- **`frontend/src/hooks/useSession.js`** — owns session/message/curriculum/
  progress state, calls `/session/start` on load and `/chat` on every turn.
- **`frontend/src/panels/*`** — the four panels. `TeachingPanel` fires a new
  `TEACH` turn when you scroll near the bottom of the message stream (the
  brief's "scroll = next concept" behavior). `Codespace` is a Monaco editor
  that highlights the lines the AI flags in `highlight_lines` and runs code
  through `/code/run`.

## Assumptions worth knowing about

- **Code execution runs as a backend subprocess**, not in-browser Pyodide.
  The brief listed both as options; subprocess was simpler to make robust
  and doesn't depend on a multi-MB WASM download on first run. This is the
  same trust model as a local Jupyter kernel — fine for a single-user local
  app, **not** something to expose on the open internet as-is. If you'd
  rather run Python fully client-side, swap `Codespace.jsx`'s Run button to
  load `https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js` and drop
  `/code/run` — the rest of the app doesn't depend on which one you use.
- **Default user/session**: the frontend keeps a `user_id` in
  `localStorage` and calls `/session/start` with it on load, which resumes
  your latest session (or creates one + seeds a default 12-topic curriculum
  on first run). There's no login screen — this matches the brief's
  single-learner, local-first framing.
- **Curriculum seed list** (`database.py::DEFAULT_CURRICULUM`) is a
  reasonable intermediate-Python topic order; the AI can reorder/add/remove
  via `curriculum_update` same as any topic it introduces mid-session.

## Project layout

```
pytutor/
├── backend/
│   ├── main.py / ai_provider.py / database.py / prompts.py / models.py / settings.py
│   └── requirements.txt
├── frontend/
│   └── src/{App.jsx, api.js, hooks/, panels/, components/}
└── data/
    ├── pytutor.db        # created on first run
    └── settings.json     # created on first run, holds your API keys locally
```

## Build order this matches

Backend routes → system prompt/JSON contract → SQLite memory → 4-panel
layout → Monaco wiring → code runner → curriculum/progress logic →
multi-provider settings panel — same order as the brief's recommended
build sequence, all implemented end-to-end rather than stubbed.
