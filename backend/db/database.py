"""
Database module: SQLite via sqlite3
Stores login attempts and session/lockout state
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "bf_detection.db")

def get_connection():
    """Return a SQLite connection. Creates the DB file if missing."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row  # allows dict-like access
    return conn

def init_db():
    """Create tables if they don't exist."""
    conn = get_connection()
    c = conn.cursor()

    # login_attempts: every attempt is logged here
    c.execute("""
        CREATE TABLE IF NOT EXISTS login_attempts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT NOT NULL,
            ip_address  TEXT NOT NULL,
            timestamp   TEXT NOT NULL,          -- ISO8601
            success     INTEGER NOT NULL,       -- 1 = success, 0 = failure
            status      TEXT DEFAULT 'normal',  -- normal | suspicious | attack | blocked
            risk_score  REAL DEFAULT 0.0,       -- 0-100
            reason      TEXT DEFAULT '',        -- explanation string
            action      TEXT DEFAULT 'none'     -- none | captcha | lockout | blocked
        )
    """)

    # lockouts: tracks active lockouts per (username, ip)
    c.execute("""
        CREATE TABLE IF NOT EXISTS lockouts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT NOT NULL,
            ip_address  TEXT NOT NULL,
            locked_at   TEXT NOT NULL,
            unlock_at   TEXT NOT NULL,
            active      INTEGER DEFAULT 1       -- 1=active, 0=expired
        )
    """)

    conn.commit()
    conn.close()
