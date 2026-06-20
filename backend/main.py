
main_code = '''"""
main.py — FastAPI server for PyTutor AI

This is the entry point. It defines all API routes and wires together
database, AI provider, and models.

To run: uvicorn main:app --reload --port 8000
"""

import json
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

import database as db
from ai_provider import chat
from prompts import SYSTEM_PROMPT
from models import (
    ChatRequest, CodeRunRequest, SettingsSaveRequest,
    StartSessionRequest, AIResponse, SessionResponse,
    ProgressResponse, CodeRunResponse
)
from settings import load_settings, save_settings, mask_settings


# ───────────────────────────────────────────────
# LIFESPAN: Initialize database on startup
# ───────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run once when server starts and once when it stops."""
    db.init_db()
    print("🚀 PyTutor backend ready!")
    yield
    print("👋 Shutting down...")


app = FastAPI(
    title="PyTutor AI",
    description="AI-powered Python learning platform",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow frontend (running on different port) to call our API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ───────────────────────────────────────────────
# SESSION ROUTES
# ───────────────────────────────────────────────

@app.post("/session/start", response_model=SessionResponse)
async def start_session(req: StartSessionRequest):
    """
    Start a new session or resume the last one for this user.
    If the user has no sessions, create one automatically.
    """
    user = db.get_user(req.user_id)
    if not user:
        # Auto-create user on first visit
        req.user_id = db.create_user("Learner")
    
    last = db.get_last_session(req.user_id)
    if last:
        # Resume existing session
        return SessionResponse(
            session_id=last["id"],
            topic=last["topic"],
            messages=last["messages"],
            progress=db.get_progress(req.user_id),
        )
    else:
        # Create new session
        sid = db.create_session(req.user_id, "Introduction to Python")
        return SessionResponse(
            session_id=sid,
            topic="Introduction to Python",
            messages=[],
            progress=db.get_progress(req.user_id),
        )


# ───────────────────────────────────────────────
# CHAT ROUTE (The Core)
# ───────────────────────────────────────────────

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    """
    The heart of PyTutor. User sends a message → we:
    1. Load full conversation history from DB
    2. Append the new user message
    3. Send everything to the AI provider
    4. Parse the AI's JSON response
    5. Save everything back to DB
    6. Return the structured response to frontend
    """
    try:
        # 1. Load session history
        session = db.get_session(req.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # 2. Append user message to history
        db.append_message(req.session_id, "user", req.message)
        messages = session["messages"] + [{"role": "user", "content": req.message}]
        
        # 3. Send to AI (with full conversation history for memory)
        ai_raw = chat(messages, SYSTEM_PROMPT)
        
        # 4. Parse AI response as JSON
        try:
            ai_data = json.loads(ai_raw)
        except json.JSONDecodeError:
            # AI didn't return valid JSON — wrap it in our format
            ai_data = {
                "message": ai_raw,
                "action": "explain",
            }
        
        # Validate against our model (catches missing required fields)
        ai_response = AIResponse(**ai_data)
        
        # 5. Save AI response to session history
        db.append_message(req.session_id, "assistant", ai_raw)
        
        # 6. Handle side effects: progress updates, curriculum updates
        if ai_response.progress_update:
            db.update_progress(
                req.user_id,
                ai_response.progress_update.topic,
                "in_progress" if ai_response.progress_update.score < 100 else "completed",
                ai_response.progress_update.score,
            )
        
        return ai_response.model_dump()
    
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ───────────────────────────────────────────────
# CODE EXECUTION
# ───────────────────────────────────────────────

import subprocess
import tempfile

@app.post("/code/run", response_model=CodeRunResponse)
async def run_code(req: CodeRunRequest):
    """
    Execute Python code safely in a sandboxed subprocess.
    Returns stdout, stderr, and return code.
    """
    try:
        # Write code to a temp file and execute with timeout
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write(req.code)
            temp_path = f.name
        
        result = subprocess.run(
            ["python3", temp_path],
            capture_output=True,
            text=True,
            timeout=5,  # Kill after 5 seconds to prevent infinite loops
        )
        
        return CodeRunResponse(
            stdout=result.stdout,
            stderr=result.stderr,
            returncode=result.returncode,
        )
    except subprocess.TimeoutExpired:
        return CodeRunResponse(
            stdout="",
            stderr="⏱️ Code execution timed out (5 seconds). Check for infinite loops!",
            returncode=-1,
        )
    except Exception as e:
        return CodeRunResponse(
            stdout="",
            stderr=f"Execution error: {str(e)}",
            returncode=-1,
        )


# ───────────────────────────────────────────────
# PROGRESS & CURRICULUM
# ───────────────────────────────────────────────

@app.get("/progress/{user_id}", response_model=ProgressResponse)
async def get_progress(user_id: int):
    """Get all skill scores and topic completion for a user."""
    return ProgressResponse(
        user_id=user_id,
        topics=db.get_progress(user_id),
    )


@app.get("/curriculum/{user_id}")
async def get_curriculum(user_id: int):
    """
    Get current curriculum. For now, returns a default curriculum.
    In the future, this could be AI-generated per user.
    """
    # Default Python curriculum for intermediate learners
    default_curriculum = [
        {"name": "Variables & Data Types", "status": "not_started"},
        {"name": "Control Flow (if/else)", "status": "not_started"},
        {"name": "Loops (for/while)", "status": "not_started"},
        {"name": "Functions & Scope", "status": "not_started"},
        {"name": "Lists & Dictionaries", "status": "not_started"},
        {"name": "File I/O", "status": "not_started"},
        {"name": "Error Handling", "status": "not_started"},
        {"name": "Object-Oriented Programming", "status": "not_started"},
        {"name": "Modules & Packages", "status": "not_started"},
        {"name": "Decorators & Generators", "status": "not_started"},
    ]
    
    # Merge with user's actual progress
    progress = db.get_progress(user_id)
    progress_map = {p["topic_name"]: p["status"] for p in progress}
    
    for topic in default_curriculum:
        if topic["name"] in progress_map:
            topic["status"] = progress_map[topic["name"]]
    
    return {"user_id": user_id, "topics": default_curriculum}


# ───────────────────────────────────────────────
# SETTINGS ROUTES
# ───────────────────────────────────────────────

@app.post("/settings/save")
async def save_settings_endpoint(req: SettingsSaveRequest):
    """Save provider + API key to local settings.json."""
    settings = {
        "provider": req.provider,
        "api_key": req.api_key,
        "model": req.model,
        "local_url": req.local_url,
    }
    save_settings(settings)
    return {"status": "saved"}


@app.get("/settings/load")
async def load_settings_endpoint():
    """Load current settings with API key masked."""
    return mask_settings()


@app.post("/settings/test")
async def test_settings():
    """
    Test if the current API key works by sending a small request.
    Returns success/fail message.
    """
    try:
        # Send a minimal test message
        test_response = chat(
            [{"role": "user", "content": "Say 'OK' and nothing else."}],
            "You are a test assistant."
        )
        if "OK" in test_response or "ok" in test_response.lower():
            return {"status": "success", "message": "Connection successful!"}
        return {"status": "success", "message": f"Response: {test_response[:50]}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ───────────────────────────────────────────────
# HEALTH CHECK
# ───────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "pytutor-backend"}
'''

with open("pytutor/backend/main.py", "w") as f:
    f.write(main_code)

print("✅ main.py written")
print(f"Size: {len(main_code)} characters")
