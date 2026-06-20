"""FastAPI server for PyTutor AI. Run with:
    uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import ai_provider
import database as db
import settings as settings_store
from models import (
    AIResponse,
    ChatRequest,
    ChatResponse,
    CodeRunRequest,
    CodeRunResponse,
    SessionStartRequest,
    SessionStartResponse,
    SettingsPayload,
    SettingsTestRequest,
)
from prompts import SYSTEM_PROMPT, build_context_preamble, build_turn_instruction

app = FastAPI(title="PyTutor AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    db.init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------

@app.post("/session/start", response_model=SessionStartResponse)
def session_start(payload: SessionStartRequest):
    user = db.get_or_create_user(payload.user_id, payload.name or "Learner")
    session = db.get_latest_session(user["id"])
    if session is None:
        session = db.create_session(user["id"])
    return SessionStartResponse(
        user_id=user["id"],
        session_id=session["id"],
        topic=session["topic"],
        messages=db.load_messages(session["id"]),
        curriculum=db.get_curriculum(user["id"]),
        progress=db.get_progress(user["id"]),
    )


# ---------------------------------------------------------------------------
# Chat — the core loop
# ---------------------------------------------------------------------------

@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    session = db.get_session(payload.session_id)
    if session is None or session["user_id"] != payload.user_id:
        raise HTTPException(404, "Session not found for this user.")

    history = db.load_messages(payload.session_id)
    curriculum = db.get_curriculum(payload.user_id)
    progress = db.get_progress(payload.user_id)

    turn_instruction = build_turn_instruction(payload.mode, payload.code_context)
    state_preamble = build_context_preamble(curriculum, progress, session["topic"])
    user_content = f"{state_preamble}\n{turn_instruction}\n\nUSER_MESSAGE: {payload.message}"

    messages = history + [{"role": "user", "content": user_content}]

    try:
        raw = await ai_provider.chat(messages=messages, system_prompt=SYSTEM_PROMPT)
    except ai_provider.ProviderError as e:
        raise HTTPException(502, str(e)) from e

    try:
        parsed = ai_provider.parse_ai_json(raw)
        ai_resp = AIResponse(**parsed)
    except Exception:
        # Don't lose the user's turn even if the model misbehaved — store
        # what we sent, surface the raw text so the UI can still show it.
        history.append({"role": "user", "content": payload.message})
        history.append({"role": "assistant", "content": raw})
        db.save_messages(payload.session_id, history)
        return ChatResponse(ai=AIResponse(message=raw, action="explain"), raw=raw)

    # Persist conversation (store the clean user message, not the
    # instruction-wrapped one, so history stays human-readable on resume).
    history.append({"role": "user", "content": payload.message})
    history.append({"role": "assistant", "content": ai_resp.model_dump_json()})
    new_topic = ai_resp.progress_update.topic if ai_resp.progress_update else session["topic"]
    db.save_messages(payload.session_id, history, topic=new_topic)

    if ai_resp.curriculum_update:
        cu = ai_resp.curriculum_update
        db.apply_curriculum_update(payload.user_id, cu.add_topic, cu.remove_topic, cu.reorder)

    if ai_resp.progress_update:
        db.upsert_progress(payload.user_id, ai_resp.progress_update.topic, ai_resp.progress_update.score)

    return ChatResponse(ai=ai_resp)


# ---------------------------------------------------------------------------
# Progress / curriculum
# ---------------------------------------------------------------------------

@app.get("/progress/{user_id}")
def get_progress(user_id: int):
    return {"progress": db.get_progress(user_id)}


@app.get("/curriculum/{user_id}")
def get_curriculum(user_id: int):
    return {"curriculum": db.get_curriculum(user_id)}


# ---------------------------------------------------------------------------
# Code execution
# ---------------------------------------------------------------------------
# NOTE: this runs the user's Python locally on the machine hosting the
# backend, the same trust model as a local Jupyter kernel. It's fine for
# a single-user local app; it is NOT safe to expose this server to the
# open internet as-is. The frontend can alternatively run code fully
# client-side via Pyodide (see frontend/README note) and skip this route.

@app.post("/code/run", response_model=CodeRunResponse)
def code_run(payload: CodeRunRequest):
    with tempfile.TemporaryDirectory() as tmp:
        script_path = Path(tmp) / "snippet.py"
        script_path.write_text(payload.code)
        try:
            result = subprocess.run(
                [sys.executable, str(script_path)],
                capture_output=True,
                text=True,
                timeout=payload.timeout_seconds,
                cwd=tmp,
            )
            return CodeRunResponse(
                stdout=result.stdout,
                stderr=result.stderr,
                exit_code=result.returncode,
            )
        except subprocess.TimeoutExpired as e:
            return CodeRunResponse(
                stdout=e.stdout or "",
                stderr=(e.stderr or "") + f"\n[Timed out after {payload.timeout_seconds}s]",
                timed_out=True,
            )


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

@app.get("/settings/load")
def settings_load():
    return settings_store.load_settings_masked()


@app.post("/settings/save")
def settings_save(payload: SettingsPayload):
    saved = settings_store.save_settings(payload.model_dump())
    masked = settings_store.load_settings_masked()
    return masked


@app.post("/settings/test")
async def settings_test(payload: SettingsTestRequest):
    return await ai_provider.test_provider(payload.provider)
