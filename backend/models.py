
models_code = '''"""
models.py — Pydantic data models for PyTutor AI

Every piece of data that crosses the API boundary gets validated here.
This prevents garbage data from entering the database or reaching the frontend.
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime


# ───────────────────────────────────────────────
# REQUEST MODELS (what the frontend sends us)
# ───────────────────────────────────────────────

class ChatRequest(BaseModel):
    """User sends a message to the AI."""
    user_id: int
    session_id: int
    message: str


class CodeRunRequest(BaseModel):
    """User wants to execute Python code."""
    code: str


class SettingsSaveRequest(BaseModel):
    """User saves their AI provider settings."""
    provider: Literal["claude", "openai", "gemini", "nvidia", "local"]
    api_key: str = Field(default="", description="API key for the provider")
    model: str = Field(default="", description="Model name/tier")
    local_url: str = Field(default="", description="Ollama server URL if local")


class StartSessionRequest(BaseModel):
    """Start or resume a session."""
    user_id: int


# ───────────────────────────────────────────────
# RESPONSE MODELS (what we send back)
# ───────────────────────────────────────────────

class Quiz(BaseModel):
    """A multiple-choice or fill-in-the-blank question."""
    question: str
    options: list[str]
    correct: str
    explanation: str


class Resource(BaseModel):
    """External learning resource link."""
    label: str
    url: str
    type: Literal["article", "video", "doc", "interactive"]


class CurriculumUpdate(BaseModel):
    """AI wants to modify the user's curriculum."""
    add_topic: Optional[str] = None
    remove_topic: Optional[str] = None
    reorder: Optional[list[str]] = None
    reason: Optional[str] = None


class ProgressUpdate(BaseModel):
    """AI wants to update the user's skill score."""
    topic: str
    score: int = Field(ge=0, le=100, description="Score between 0 and 100")


class AIResponse(BaseModel):
    """
    The AI's structured response. Every field is optional except message.
    The frontend reads each field and decides what UI action to take.
    """
    message: str = Field(description="Explanation shown in teaching panel")
    action: Optional[Literal["write_code", "create_quiz", "explain", "review_code", "ask_question"]] = None
    code: Optional[str] = Field(default=None, description="Python code to inject into editor")
    run_code: bool = False
    highlight_lines: Optional[list[int]] = None
    quiz: Optional[Quiz] = None
    curriculum_update: Optional[CurriculumUpdate] = None
    progress_update: Optional[ProgressUpdate] = None
    resources: Optional[list[Resource]] = None


class SessionResponse(BaseModel):
    """Response when starting or resuming a session."""
    session_id: int
    topic: str
    messages: list[dict]
    progress: list[dict]


class ProgressResponse(BaseModel):
    """User's learning progress."""
    user_id: int
    topics: list[dict]


class CodeRunResponse(BaseModel):
    """Result of executing Python code."""
    stdout: str
    stderr: str
    returncode: int
'''

with open("pytutor/backend/models.py", "w") as f:
    f.write(models_code)

print("✅ models.py written")
print(f"Size: {len(models_code)} characters")
