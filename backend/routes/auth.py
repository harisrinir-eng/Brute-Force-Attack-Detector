"""
Authentication routes
POST /api/auth/login
GET  /api/auth/captcha
"""

from fastapi import APIRouter, Request
from models.schemas import LoginRequest, DetectionResult
from services.storage import (
    validate_credentials, get_recent_attempts, log_attempt,
    check_lockout, create_lockout
)
from services.detection import analyze_attempts, LOCKOUT_DURATION
from datetime import datetime, timezone

router = APIRouter()

# Simple in-memory CAPTCHA store (username -> answer)
# In a real system this would be a proper challenge/response system
CAPTCHA_STORE: dict[str, str] = {}
CAPTCHA_ANSWER = "7"  # Fixed simple math CAPTCHA: "What is 3 + 4?"


@router.post("/login", response_model=DetectionResult)
async def login(req: LoginRequest, request: Request):
    """
    Main login endpoint.
    1. Check for active lockout
    2. Validate credentials
    3. Fetch recent attempts
    4. Run detection engine
    5. Apply prevention actions
    6. Log the attempt
    7. Return result
    """
    # Determine client IP (use X-Forwarded-For if behind proxy, else direct)
    ip = request.headers.get("X-Forwarded-For", request.client.host or "127.0.0.1")
    ip = ip.split(",")[0].strip()

    username = req.username.lower().strip()

    # ── Step 1: Check existing lockout ───────────────────
    lockout = check_lockout(username, ip)
    if lockout:
        unlock_at = datetime.fromisoformat(lockout["unlock_at"])
        remaining = max(0, int((unlock_at - datetime.now(timezone.utc)).total_seconds()))
        log_attempt(
            username, ip, False,
            "blocked", 100.0,
            "Account is currently locked out",
            "blocked"
        )
        return DetectionResult(
            allowed=False,
            status="blocked",
            risk_score=100.0,
            reasons=["Account temporarily locked due to too many failed attempts"],
            action="blocked",
            message=f"Account locked. Try again in {remaining} seconds.",
            lockout_seconds=remaining,
            captcha_required=False,
        )

    # ── Step 2: Get recent attempt history ───────────────
    recent = get_recent_attempts(username, ip)

    # ── Step 3: Run detection on history (before this attempt) ──
    detection = analyze_attempts(recent)

    # ── Step 4: Handle CAPTCHA requirement ───────────────
    captcha_required = detection["captcha_required"]
    captcha_ok = True

    if captcha_required:
        if req.captcha_answer is None:
            # No captcha submitted – block and ask for it
            log_attempt(
                username, ip, False,
                detection["status"], detection["risk_score"],
                "; ".join(detection["reasons"]) or "Suspicious activity detected",
                "captcha"
            )
            return DetectionResult(
                allowed=False,
                status=detection["status"],
                risk_score=detection["risk_score"],
                reasons=detection["reasons"],
                action="captcha",
                message="Please complete the CAPTCHA to continue.",
                captcha_required=True,
            )
        else:
            # Validate CAPTCHA answer
            if req.captcha_answer.strip() != CAPTCHA_ANSWER:
                captcha_ok = False
                detection["reasons"].append("Incorrect CAPTCHA answer")

    # ── Step 5: Validate credentials ─────────────────────
    success = validate_credentials(username, req.password) and captcha_ok

    # ── Step 6: Re-analyze including current attempt ─────
    # Add the current attempt to the list and re-run detection
    current_attempt = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "success": success,
    }
    all_recent = recent + [current_attempt]
    detection = analyze_attempts(all_recent)

    # ── Step 7: Enforce lockout if attack detected ────────
    if detection["action"] in ("lockout", "blocked"):
        create_lockout(username, ip, LOCKOUT_DURATION)

    # ── Step 8: Log this attempt ─────────────────────────
    reason_str = "; ".join(detection["reasons"]) if detection["reasons"] else "Normal login activity"
    log_attempt(
        username, ip, success,
        detection["status"], detection["risk_score"],
        reason_str,
        detection["action"]
    )

    # ── Step 9: Build response ────────────────────────────
    if success:
        return DetectionResult(
            allowed=True,
            status="normal" if detection["status"] == "normal" else detection["status"],
            risk_score=detection["risk_score"],
            reasons=detection["reasons"],
            action=detection["action"],
            message=f"Welcome back, {username}! Login successful.",
            captcha_required=False,
        )
    else:
        if detection["action"] in ("lockout", "blocked"):
            msg = f"Too many failed attempts. Account locked for {LOCKOUT_DURATION} seconds."
        elif detection["captcha_required"]:
            msg = "Suspicious activity detected. Please complete CAPTCHA."
        else:
            msg = "Invalid credentials. Please try again."

        return DetectionResult(
            allowed=False,
            status=detection["status"],
            risk_score=detection["risk_score"],
            reasons=detection["reasons"],
            action=detection["action"],
            message=msg,
            lockout_seconds=detection.get("lockout_seconds"),
            captcha_required=detection["captcha_required"],
        )


@router.get("/captcha")
async def get_captcha():
    """Return the CAPTCHA challenge."""
    return {"question": "What is 3 + 4?", "hint": "Enter the number"}
