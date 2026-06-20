"""SQLite setup and queries for PyTutor AI.

Three tables, as specified in the project brief:
  users      — who is learning
  sessions   — full conversation history per session, replayed for memory
  progress   — per-topic skill score / completion

Plus a fourth, `curriculum`, which the brief's API surface implies
(GET /curriculum/{user_id}) but doesn't fully spell out — modeled here
as an ordered, per-user topic list with a locked/active/done state.
"""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "pytutor.db"

DEFAULT_CURRICULUM = [
    "Variables & Data Types",
    "Control Flow",
    "Functions",
    "Lists & Dictionaries",
    "Comprehensions",
    "OOP Basics",
    "Error Handling",
    "Modules & Packages",
    "File I/O",
    "Iterators & Generators",
    "Decorators",
    "Testing Basics",
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                topic TEXT,
                messages TEXT NOT NULL DEFAULT '[]',
                started_at TEXT NOT NULL,
                last_active TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS progress (
                user_id INTEGER NOT NULL,
                topic_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'not_started',
                score INTEGER NOT NULL DEFAULT 0,
                last_updated TEXT NOT NULL,
                PRIMARY KEY (user_id, topic_name)
            );

            CREATE TABLE IF NOT EXISTS curriculum (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                topic_name TEXT NOT NULL,
                position INTEGER NOT NULL,
                state TEXT NOT NULL DEFAULT 'locked'
            );
            """
        )


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def get_or_create_user(user_id: Optional[int], name: str = "Learner") -> sqlite3.Row:
    with get_conn() as conn:
        if user_id is not None:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if row:
                return row
        cur = conn.execute(
            "INSERT INTO users (name, created_at) VALUES (?, ?)", (name, _now())
        )
        new_id = cur.lastrowid
        seed_curriculum(conn, new_id)
        seed_progress(conn, new_id)
        return conn.execute("SELECT * FROM users WHERE id = ?", (new_id,)).fetchone()


def seed_curriculum(conn: sqlite3.Connection, user_id: int) -> None:
    for i, topic in enumerate(DEFAULT_CURRICULUM):
        state = "active" if i == 0 else "locked"
        conn.execute(
            "INSERT INTO curriculum (user_id, topic_name, position, state) VALUES (?, ?, ?, ?)",
            (user_id, topic, i, state),
        )


def seed_progress(conn: sqlite3.Connection, user_id: int) -> None:
    for topic in DEFAULT_CURRICULUM:
        conn.execute(
            "INSERT INTO progress (user_id, topic_name, status, score, last_updated) "
            "VALUES (?, ?, 'not_started', 0, ?)",
            (user_id, topic, _now()),
        )


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

def get_latest_session(user_id: int) -> Optional[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM sessions WHERE user_id = ? ORDER BY last_active DESC LIMIT 1",
            (user_id,),
        ).fetchone()


def create_session(user_id: int, topic: Optional[str] = None) -> sqlite3.Row:
    with get_conn() as conn:
        now = _now()
        cur = conn.execute(
            "INSERT INTO sessions (user_id, topic, messages, started_at, last_active) "
            "VALUES (?, ?, '[]', ?, ?)",
            (user_id, topic, now, now),
        )
        return conn.execute(
            "SELECT * FROM sessions WHERE id = ?", (cur.lastrowid,)
        ).fetchone()


def get_session(session_id: int) -> Optional[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()


def load_messages(session_id: int) -> List[Dict[str, Any]]:
    row = get_session(session_id)
    if not row:
        return []
    try:
        return json.loads(row["messages"])
    except (json.JSONDecodeError, TypeError):
        return []


def save_messages(session_id: int, messages: List[Dict[str, Any]], topic: Optional[str] = None) -> None:
    with get_conn() as conn:
        if topic is not None:
            conn.execute(
                "UPDATE sessions SET messages = ?, last_active = ?, topic = ? WHERE id = ?",
                (json.dumps(messages), _now(), topic, session_id),
            )
        else:
            conn.execute(
                "UPDATE sessions SET messages = ?, last_active = ? WHERE id = ?",
                (json.dumps(messages), _now(), session_id),
            )


# ---------------------------------------------------------------------------
# Progress
# ---------------------------------------------------------------------------

def get_progress(user_id: int) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT topic_name, status, score, last_updated FROM progress WHERE user_id = ?",
            (user_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def upsert_progress(user_id: int, topic: str, score: int) -> None:
    status = "completed" if score >= 80 else ("in_progress" if score > 0 else "not_started")
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO progress (user_id, topic_name, status, score, last_updated)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, topic_name) DO UPDATE SET
                status = excluded.status,
                score = excluded.score,
                last_updated = excluded.last_updated
            """,
            (user_id, topic, status, score, _now()),
        )
        # Unlock the next curriculum topic once this one is completed.
        if status == "completed":
            conn.execute(
                "UPDATE curriculum SET state = 'done' WHERE user_id = ? AND topic_name = ?",
                (user_id, topic),
            )
            next_locked = conn.execute(
                "SELECT id FROM curriculum WHERE user_id = ? AND state = 'locked' "
                "ORDER BY position LIMIT 1",
                (user_id,),
            ).fetchone()
            if next_locked:
                conn.execute(
                    "UPDATE curriculum SET state = 'active' WHERE id = ?",
                    (next_locked["id"],),
                )


# ---------------------------------------------------------------------------
# Curriculum
# ---------------------------------------------------------------------------

def get_curriculum(user_id: int) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT topic_name, position, state FROM curriculum WHERE user_id = ? ORDER BY position",
            (user_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def apply_curriculum_update(user_id: int, add_topic: Optional[str], remove_topic: Optional[str],
                             reorder: Optional[List[str]]) -> None:
    with get_conn() as conn:
        if remove_topic:
            conn.execute(
                "DELETE FROM curriculum WHERE user_id = ? AND topic_name = ?",
                (user_id, remove_topic),
            )
        if add_topic:
            existing = conn.execute(
                "SELECT 1 FROM curriculum WHERE user_id = ? AND topic_name = ?",
                (user_id, add_topic),
            ).fetchone()
            if not existing:
                max_pos = conn.execute(
                    "SELECT COALESCE(MAX(position), -1) AS m FROM curriculum WHERE user_id = ?",
                    (user_id,),
                ).fetchone()["m"]
                conn.execute(
                    "INSERT INTO curriculum (user_id, topic_name, position, state) VALUES (?, ?, ?, 'locked')",
                    (user_id, add_topic, max_pos + 1),
                )
        if reorder:
            for i, topic in enumerate(reorder):
                conn.execute(
                    "UPDATE curriculum SET position = ? WHERE user_id = ? AND topic_name = ?",
                    (i, user_id, topic),
                )
