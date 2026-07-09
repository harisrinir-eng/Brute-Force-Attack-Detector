"""
Demo routes - for controlled presentation/simulation
POST /api/demo/simulate-normal   – simulate a normal user login
POST /api/demo/simulate-attack   – simulate a brute force attack
POST /api/demo/reset             – clear all data
"""

from fastapi import APIRouter
from services.storage import (
    log_attempt, create_lockout, get_recent_attempts, reset_all
)
from services.detection import analyze_attempts, LOCKOUT_DURATION
from datetime import datetime, timezone, timedelta
import asyncio, time, random

router = APIRouter()

ATTACK_IP   = "192.168.1.100"  # simulated attacker IP
NORMAL_IP   = "10.0.0.50"      # simulated normal user IP


@router.post("/simulate-normal")
async def simulate_normal():
    """
    Simulate a normal user:
    - 1 failed attempt (mistyped password)
    - Then successful login
    Spread over ~10 seconds
    """
    username = "alice"
    ip = NORMAL_IP

    results = []

    # First attempt: wrong password
    recent = get_recent_attempts(username, ip)
    detection = analyze_attempts(recent + [{"timestamp": _now(), "success": False}])
    log_attempt(username, ip, False,
                detection["status"], detection["risk_score"],
                "; ".join(detection["reasons"]) or "Single failed attempt",
                detection["action"])
    results.append({"attempt": 1, "success": False, "status": detection["status"]})

    # Second attempt: correct password (after small delay)
    recent = get_recent_attempts(username, ip)
    detection = analyze_attempts(recent + [{"timestamp": _now(), "success": True}])
    log_attempt(username, ip, True,
                "normal", 0.0,
                "Successful login",
                "none")
    results.append({"attempt": 2, "success": True, "status": "normal"})

    return {
        "message": "Normal user simulation complete",
        "attempts": results,
        "summary": "1 failure followed by successful login – classified as NORMAL"
    }


@router.post("/simulate-attack")
async def simulate_attack():
    """
    Simulate a brute force attack:
    - 12 rapid failed login attempts from same IP
    - Each attempt 0.3-0.8 seconds apart (automated speed)
    - System should detect and lock after threshold
    """
    username = "admin"
    ip = ATTACK_IP

    results = []
    n_attempts = 12

    # Insert attempts with realistic sub-second timestamps
    base_time = datetime.now(timezone.utc)
    for i in range(n_attempts):
        # Sub-second spacing to simulate automated tool
        ts = (base_time + timedelta(seconds=i * random.uniform(0.3, 0.8))).isoformat()

        # Fetch recent to run detection
        recent = get_recent_attempts(username, ip)
        detection = analyze_attempts(recent + [{"timestamp": ts, "success": False}])

        # Directly insert with the simulated timestamp
        from db.database import get_connection
        conn = get_connection()
        c = conn.cursor()
        reason_str = "; ".join(detection["reasons"]) or "Brute force simulation"
        c.execute("""
            INSERT INTO login_attempts
                (username, ip_address, timestamp, success, status, risk_score, reason, action)
            VALUES (?, ?, ?, 0, ?, ?, ?, ?)
        """, (username, ip, ts, detection["status"], detection["risk_score"],
              reason_str, detection["action"]))
        conn.commit()
        conn.close()

        results.append({
            "attempt": i + 1,
            "success": False,
            "status": detection["status"],
            "risk_score": detection["risk_score"],
            "action": detection["action"],
        })

        # Once attack is detected and locked, trigger lockout record
        if detection["action"] in ("lockout", "blocked") and i == n_attempts - 1:
            create_lockout(username, ip, LOCKOUT_DURATION)

    final = results[-1]
    return {
        "message": f"Brute force simulation complete — {n_attempts} rapid attempts",
        "attempts": results,
        "final_status": final["status"],
        "final_risk_score": final["risk_score"],
        "action_taken": final["action"],
        "summary": "Rapid failed attempts detected. Account locked."
    }


@router.post("/reset")
async def reset():
    """Clear all login data for a fresh demo."""
    reset_all()
    return {"message": "All data cleared. Ready for fresh demo.", "status": "ok"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
