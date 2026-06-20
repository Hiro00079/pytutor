"""Pydantic data models for PyTutor AI.

These mirror the JSON contract the AI is instructed to respond with
(see prompts.py) plus the request/response shapes for the API routes.
"""
from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# AI response contract (what the model must return, parsed from its JSON)
# ---------------------------------------------------------------------------

class Quiz(BaseModel):
    question: str
    options: List[str] = Field(default_factory=list)
    correct: str = ""
    explanation: str = ""


class CurriculumUpdate(BaseModel):
    add_topic: Optional[str] = None
    remove_topic: Optional[str] = None
    reorder: Optional[List[str]] = None
    reason: Optional[str] = None


class ProgressUpdate(BaseModel):
    topic: str
    score: int = Field(ge=0, le=100)


class Resource(BaseModel):
    label: str
    url: str
    type: Literal["article", "video", "docs", "other"] = "other"


class AIResponse(BaseModel):
    """The structured contract every AI turn must satisfy."""
    message: str = ""
    action: Literal[
        "write_code", "create_quiz", "explain", "review_code", "ask_question"
    ] = "explain"
    code: Optional[str] = None
    run_code: bool = False
    highlight_lines: List[int] = Field(default_factory=list)
    quiz: Optional[Quiz] = None
    curriculum_update: Optional[CurriculumUpdate] = None
    progress_update: Optional[ProgressUpdate] = None
    resources: List[Resource] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# API request/response shapes
# ---------------------------------------------------------------------------

class SessionStartRequest(BaseModel):
    user_id: Optional[int] = None
    name: Optional[str] = "Learner"


class SessionStartResponse(BaseModel):
    user_id: int
    session_id: int
    topic: Optional[str]
    messages: list
    curriculum: list
    progress: list


class ChatRequest(BaseModel):
    user_id: int
    session_id: int
    message: str
    mode: Literal["TEACH", "QUIZ", "REVIEW", "INTERVIEW", "EXPLAIN"] = "TEACH"
    code_context: Optional[str] = None  # current editor contents, for REVIEW mode


class ChatResponse(BaseModel):
    ai: AIResponse
    raw: Optional[str] = None  # raw text, only populated if JSON parsing failed


class CodeRunRequest(BaseModel):
    code: str
    timeout_seconds: int = 8


class CodeRunResponse(BaseModel):
    stdout: str
    stderr: str
    timed_out: bool = False
    exit_code: Optional[int] = None


class ProviderSettings(BaseModel):
    api_key: Optional[str] = ""
    model: Optional[str] = ""


class OllamaSettings(BaseModel):
    base_url: str = "http://localhost:11434"
    model: str = "llama3.1"


class SettingsPayload(BaseModel):
    provider: Literal["claude", "openai", "gemini", "nvidia", "local"] = "claude"
    claude: ProviderSettings = Field(default_factory=ProviderSettings)
    openai: ProviderSettings = Field(default_factory=ProviderSettings)
    gemini: ProviderSettings = Field(default_factory=ProviderSettings)
    nvidia: ProviderSettings = Field(default_factory=ProviderSettings)
    local: OllamaSettings = Field(default_factory=OllamaSettings)


class SettingsTestRequest(BaseModel):
    provider: Literal["claude", "openai", "gemini", "nvidia", "local"]
