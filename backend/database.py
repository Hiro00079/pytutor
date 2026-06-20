
# Let's write the database layer

db_code = '''"""
database.py — All SQLite operations for PyTutor AI

Pattern: Repository Pattern
- Every database operation is a function here
- No other file writes raw SQL
- This makes testing easy: swap this file for a mock
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path

# Path to the database file — one level up from backend/, then into data/
DB_PATH = Path(__file__).parent.parent / "data" / "pytutor.db"


def get_connection():
    """Create a connection with row factory for dict-like access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Lets you access columns by name: row["name"]
    return conn


def init_db():
    """
    Create all tables. Safe to call multiple times — CREATE TABLE IF NOT EXISTS
    handles duplicates gracefully.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        -- Who is learning
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Every conversation, stored for memory
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            topic TEXT,
            messages TEXT,           -- Full conversation as JSON string
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- Skill tracking per topic
        CREATE TABLE IF NOT EXISTS progress (
            user_id INTEGER NOT NULL,
            topic_name TEXT NOT NULL,
            status TEXT DEFAULT 'not_started',  -- 'not_started' | 'in_progress' | 'completed'
            score INTEGER DEFAULT 0,             -- 0-100
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, topic_name)
        );
    """)

    conn.commit()
    conn.close()
    print("✅ Database initialized at", DB_PATH)


# ───────────────────────────────────────────────
# USERS
# ───────────────────────────────────────────────

def create_user(name: str) -> int:
    """Create a new user. Returns the user_id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO users (name) VALUES (?)", (name,))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return user_id


def get_user(user_id: int) -> dict | None:
    """Get user by ID. Returns None if not found."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


# ───────────────────────────────────────────────
# SESSIONS (AI Memory)
# ───────────────────────────────────────────────

def create_session(user_id: int, topic: str = "Introduction to Python") -> int:
    """Start a new session. Messages start as empty list []."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sessions (user_id, topic, messages) VALUES (?, ?, ?)",
        (user_id, topic, json.dumps([]))
    )
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return session_id


def get_session(session_id: int) -> dict | None:
    """Load a session by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    session = dict(row)
    session["messages"] = json.loads(session["messages"])  # Deserialize JSON
    return session


def get_last_session(user_id: int) -> dict | None:
    """Get the most recent session for a user (for resume on startup)."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM sessions WHERE user_id = ? ORDER BY last_active DESC LIMIT 1",
        (user_id,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    session = dict(row)
    session["messages"] = json.loads(session["messages"])
    return session


def append_message(session_id: int, role: str, content: str):
    """
    Add a message to the session history.
    Role is 'user' or 'assistant'.
    Also updates last_active timestamp.
    """
    session = get_session(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    messages = session["messages"]
    messages.append({"role": role, "content": content})

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE sessions SET messages = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?",
        (json.dumps(messages), session_id)
    )
    conn.commit()
    conn.close()


# ───────────────────────────────────────────────
# PROGRESS
# ───────────────────────────────────────────────

def update_progress(user_id: int, topic_name: str, status: str, score: int = 0):
    """Upsert progress: insert if new, update if exists."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO progress (user_id, topic_name, status, score, last_updated)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, topic_name) DO UPDATE SET
            status = excluded.status,
            score = excluded.score,
            last_updated = CURRENT_TIMESTAMP
    """, (user_id, topic_name, status, score))
    conn.commit()
    conn.close()


def get_progress(user_id: int) -> list[dict]:
    """Get all progress records for a user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM progress WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# ───────────────────────────────────────────────
# BOOTSTRAP
# ───────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    # Quick test
    uid = create_user("Alice")
    print(f"Created user: {uid}")
    sid = create_session(uid, "Variables and Data Types")
    print(f"Created session: {sid}")
    append_message(sid, "user", "What is a variable?")
    append_message(sid, "assistant", "A variable is a named container for data.")
    session = get_session(sid)
    print(f"Session has {len(session['messages'])} messages")
    print(f"Last session topic: {get_last_session(uid)['topic']}")
'''

with open("pytutor/backend/database.py", "w") as f:
    f.write(db_code)

print("✅ database.py written")
print(f"Size: {len(db_code)} characters")
