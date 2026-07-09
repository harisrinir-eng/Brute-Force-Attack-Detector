"""
Storage service: wraps SQLite operations for login attempts and lockouts.
"""

from datetime import datetime, timezone, timedelta
from db.database import get_connection
from services.detection import WINDOW_SECONDS, LOCKOUT_DURATION


# ── Demo users (username -> password) ─────────────────────
VALID_USERS = {
    "admin":   "admin123",
    "alice":   "alice@pass",
    "bob":     "bob@secure",
    "student": "pass1234",
}


def validate_credentials(username: str, password: str) -> bool:
    """Check if username/password is valid."""
    return VALID_USERS.get(username) == password


def get_recent_attempts(username: str, ip_address: str) -> list[dict]:
    """
    Return all attempts within the sliding window for this (username, ip).
    """
    conn = get_connection()
    c = conn.cursor()
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=WINDOW_SECONDS)).isoformat()
    c.execute("""
        SELECT username, ip_address, timestamp, success
        FROM login_attempts
        WHERE username = ? AND ip_address = ? AND timestamp >= ?
        ORDER BY timestamp ASC
    """, (username, ip_address, cutoff))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def log_attempt(username: str, ip_address: str, success: bool,
                status: str, risk_score: float, reason: str, action: str) -> int:
    """Insert a login attempt record and return its id."""
    conn = get_connection()
    c = conn.cursor()
    ts = datetime.now(timezone.utc).isoformat()
    c.execute("""
        INSERT INTO login_attempts
            (username, ip_address, timestamp, success, status, risk_score, reason, action)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (username, ip_address, ts, int(success), status, risk_score, reason, action))
    conn.commit()
    rid = c.lastrowid
    conn.close()
    return rid


def check_lockout(username: str, ip_address: str) -> dict | None:
    """
    Return active lockout dict if one exists (and has not expired), else None.
    Also marks expired lockouts as inactive.
    """
    conn = get_connection()
    c = conn.cursor()
    now_ts = datetime.now(timezone.utc).isoformat()

    # Expire stale lockouts
    c.execute("""
        UPDATE lockouts SET active = 0
        WHERE active = 1 AND unlock_at <= ?
    """, (now_ts,))
    conn.commit()

    # Check for active lockout
    c.execute("""
        SELECT * FROM lockouts
        WHERE username = ? AND ip_address = ? AND active = 1
        ORDER BY locked_at DESC LIMIT 1
    """, (username, ip_address))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def create_lockout(username: str, ip_address: str, duration: int = LOCKOUT_DURATION):
    """Create a new lockout record."""
    conn = get_connection()
    c = conn.cursor()
    now = datetime.now(timezone.utc)
    locked_at = now.isoformat()
    unlock_at = (now + timedelta(seconds=duration)).isoformat()
    c.execute("""
        INSERT INTO lockouts (username, ip_address, locked_at, unlock_at, active)
        VALUES (?, ?, ?, ?, 1)
    """, (username, ip_address, locked_at, unlock_at))
    conn.commit()
    conn.close()


def get_all_attempts(limit: int = 200) -> list[dict]:
    """Fetch recent login attempts for dashboard."""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT * FROM login_attempts
        ORDER BY timestamp DESC
        LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


def get_stats() -> dict:
    """Aggregate statistics for dashboard summary cards."""
    conn = get_connection()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM login_attempts")
    total = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM login_attempts WHERE success = 0")
    failed = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM login_attempts WHERE status IN ('suspicious', 'attack')")
    suspicious = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM login_attempts WHERE action IN ('lockout','blocked')")
    blocked = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM login_attempts WHERE success = 1")
    success = c.fetchone()[0]

    conn.close()
    return {
        "total":      total,
        "failed":     failed,
        "suspicious": suspicious,
        "blocked":    blocked,
        "success":    success,
        "normal":     max(0, total - suspicious),
    }


def reset_all():
    """Clear all data (for demo reset)."""
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM login_attempts")
    c.execute("DELETE FROM lockouts")
    conn.commit()
    conn.close()
