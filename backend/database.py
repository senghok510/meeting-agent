import sqlite3
import json
import os
from datetime import datetime
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "meetings.db")


def get_connection() -> sqlite3.Connection:
    """Get a SQLite connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create the meetings table if it doesn't exist."""
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL DEFAULT 'Untitled Meeting',
            transcript TEXT NOT NULL,
            results_json TEXT NOT NULL DEFAULT '[]',
            summary TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()


def save_meeting(
    transcript: str,
    results: list[dict],
    summary: str = "",
    title: str = "Untitled Meeting",
) -> int:
    """Save a meeting and return its ID."""
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO meetings (title, transcript, results_json, summary) VALUES (?, ?, ?, ?)",
        (title, transcript, json.dumps(results), summary),
    )
    meeting_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return meeting_id  # type: ignore


def get_meetings(limit: int = 50, offset: int = 0, search: Optional[str] = None) -> list[dict]:
    """Get a list of meetings, optionally filtered by search term."""
    conn = get_connection()
    if search:
        rows = conn.execute(
            "SELECT id, title, summary, created_at FROM meetings "
            "WHERE title LIKE ? OR transcript LIKE ? OR summary LIKE ? "
            "ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (f"%{search}%", f"%{search}%", f"%{search}%", limit, offset),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT id, title, summary, created_at FROM meetings "
            "ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_meeting(meeting_id: int) -> Optional[dict]:
    """Get a single meeting by ID with full results."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM meetings WHERE id = ?", (meeting_id,)
    ).fetchone()
    conn.close()
    if row is None:
        return None
    meeting = dict(row)
    meeting["results"] = json.loads(meeting.pop("results_json"))
    return meeting


def delete_meeting(meeting_id: int) -> bool:
    """Delete a meeting by ID. Returns True if deleted."""
    conn = get_connection()
    cursor = conn.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0
