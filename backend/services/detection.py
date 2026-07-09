"""
=============================================================
Brute Force Detection Engine
=============================================================
Hybrid approach:
  1. Rule-based thresholds  (primary)
  2. Isolation Forest anomaly score (secondary)

Features used:
  - failed_count_window  : # of failures in last 60 seconds
  - attempt_count_window : total attempts in last 60 seconds
  - avg_gap_seconds      : average time between attempts
  - failed_ratio         : failures / total attempts (recent)
  - is_locked            : whether account is currently locked

Thresholds (tuned for demo clarity while being practically meaningful):
  - CAPTCHA threshold : 3 failures in 60 s
  - Suspicious        : 5 failures in 60 s
  - Attack/Lockout    : 8 failures in 60 s  OR  avg_gap < 1 s with 5+ attempts
  - Block             : 15+ failures in 60 s

These values are explained during demo/viva.
=============================================================
"""

import numpy as np
from datetime import datetime, timezone
from typing import Optional
from sklearn.ensemble import IsolationForest
import pickle, os

# ── Thresholds ────────────────────────────────────────────
WINDOW_SECONDS      = 60     # sliding time window for analysis
CAPTCHA_THRESHOLD   = 3      # failures before CAPTCHA is required
SUSPICIOUS_THRESHOLD = 5     # failures before marking suspicious
ATTACK_THRESHOLD    = 8      # failures before declaring attack + lockout
BLOCK_THRESHOLD     = 15     # failures before hard-block
RAPID_ATTEMPT_GAP   = 1.5    # seconds; below this = automated/rapid attempts
RAPID_ATTEMPT_COUNT = 5      # min attempts needed to check gap
LOCKOUT_DURATION    = 60     # seconds to lock an account after attack detected

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "iso_forest.pkl")

# ── Isolation Forest (trained lazily on first call) ───────
_model: Optional[IsolationForest] = None

def _get_model() -> IsolationForest:
    """Load or train the Isolation Forest model."""
    global _model
    if _model is not None:
        return _model

    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
        return _model

    return _train_model()

def _train_model() -> IsolationForest:
    """
    Train Isolation Forest on simulated normal login behavior.

    Features: [failed_count_window, attempt_count_window, avg_gap_seconds, failed_ratio]

    Normal behavior samples:
      - occasional single failures (forgot password) then success
      - low attempt frequency, large gaps

    The model learns the 'normal' space; anything far from it
    gets a high anomaly score.
    """
    global _model
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

    rng = np.random.default_rng(42)

    # Normal samples: low failure count, large gaps, low ratio
    n_normal = 400
    normal = np.column_stack([
        rng.integers(0, 3, n_normal),             # failed_count_window: 0-2
        rng.integers(1, 4, n_normal),             # attempt_count_window: 1-3
        rng.uniform(15, 120, n_normal),           # avg_gap_seconds: 15-120 s
        rng.uniform(0, 0.4, n_normal),            # failed_ratio: 0-0.4
    ])

    # A small number of boundary/slightly-unusual samples
    # to avoid the model being too tight
    n_edge = 50
    edge = np.column_stack([
        rng.integers(3, 5, n_edge),
        rng.integers(4, 6, n_edge),
        rng.uniform(5, 15, n_edge),
        rng.uniform(0.4, 0.6, n_edge),
    ])

    X_train = np.vstack([normal, edge])

    # contamination: ~10% of training set is 'borderline'
    _model = IsolationForest(
        n_estimators=100,
        contamination=0.10,
        random_state=42,
        max_features=4
    )
    _model.fit(X_train)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(_model, f)

    print("✅ Isolation Forest trained and saved")
    return _model


def _compute_anomaly_score(features: list[float]) -> float:
    """
    Returns anomaly score 0-100 (higher = more anomalous).
    IsolationForest.decision_function returns negative anomaly scores;
    we map them to 0-100.
    """
    model = _get_model()
    X = np.array(features).reshape(1, -1)
    raw_score = model.decision_function(X)[0]
    # raw_score: positive = normal, negative = anomalous
    # map to 0-100: higher means more suspicious
    # typical range is roughly [-0.5, 0.5]
    mapped = (0.5 - raw_score) * 100
    return float(np.clip(mapped, 0, 100))


def analyze_attempts(recent_attempts: list[dict]) -> dict:
    """
    Main detection function.

    Parameters
    ----------
    recent_attempts : list of dicts from the DB, already filtered to
                      the sliding window for this (username, ip).
                      Each dict has: timestamp (ISO str), success (bool)

    Returns
    -------
    dict with keys: status, risk_score, reasons, action, lockout_seconds, captcha_required
    """
    now = datetime.now(timezone.utc)
    reasons = []

    # ── Feature extraction ────────────────────────────────
    if not recent_attempts:
        return {
            "status": "normal",
            "risk_score": 0.0,
            "reasons": [],
            "action": "none",
            "lockout_seconds": None,
            "captcha_required": False,
        }

    failed   = [a for a in recent_attempts if not a["success"]]
    total    = len(recent_attempts)
    n_failed = len(failed)

    # Average gap (seconds) between consecutive attempts
    timestamps = sorted([
        _parse_ts(a["timestamp"]) for a in recent_attempts
    ])
    if len(timestamps) > 1:
        gaps = [(timestamps[i+1] - timestamps[i]).total_seconds()
                for i in range(len(timestamps)-1)]
        avg_gap = float(np.mean(gaps))
    else:
        avg_gap = 999.0

    failed_ratio = n_failed / total if total > 0 else 0.0

    # ── Rule-based checks ─────────────────────────────────
    rule_score = 0.0

    if n_failed >= BLOCK_THRESHOLD:
        rule_score = 100
        reasons.append(f"Extreme failure count: {n_failed} failures in {WINDOW_SECONDS}s")

    elif n_failed >= ATTACK_THRESHOLD:
        rule_score = max(rule_score, 85)
        reasons.append(f"High failure count: {n_failed} failures in {WINDOW_SECONDS}s")

    elif n_failed >= SUSPICIOUS_THRESHOLD:
        rule_score = max(rule_score, 60)
        reasons.append(f"Elevated failure count: {n_failed} failures in {WINDOW_SECONDS}s")

    elif n_failed >= CAPTCHA_THRESHOLD:
        rule_score = max(rule_score, 35)
        reasons.append(f"Multiple failures: {n_failed} failed attempts")

    if avg_gap < RAPID_ATTEMPT_GAP and total >= RAPID_ATTEMPT_COUNT:
        rule_score = max(rule_score, 80)
        reasons.append(f"Rapid-fire attempts: avg {avg_gap:.2f}s between attempts (automated behaviour)")

    if failed_ratio > 0.85 and total >= 5:
        rule_score = max(rule_score, 55)
        reasons.append(f"Suspicious fail ratio: {failed_ratio*100:.0f}% of attempts failed")

    # ── ML anomaly score ─────────────────────────────────
    features = [float(n_failed), float(total), avg_gap, failed_ratio]
    ml_score = _compute_anomaly_score(features)

    # Blend: 70% rule-based, 30% ML
    # The rule-based is authoritative; ML adds nuance
    risk_score = round(0.70 * rule_score + 0.30 * ml_score, 1)
    risk_score = min(risk_score, 100.0)

    if ml_score > 65 and rule_score < 35:
        reasons.append(f"Anomaly detection flagged unusual login pattern (ML score: {ml_score:.0f})")

    # ── Decision ─────────────────────────────────────────
    if risk_score >= 90 or n_failed >= BLOCK_THRESHOLD:
        status   = "attack"
        action   = "blocked"
        lock_sec = LOCKOUT_DURATION

    elif risk_score >= 70 or n_failed >= ATTACK_THRESHOLD:
        status   = "attack"
        action   = "lockout"
        lock_sec = LOCKOUT_DURATION

    elif risk_score >= 45 or n_failed >= SUSPICIOUS_THRESHOLD:
        status   = "suspicious"
        action   = "captcha"
        lock_sec = None

    elif n_failed >= CAPTCHA_THRESHOLD:
        status   = "suspicious"
        action   = "captcha"
        lock_sec = None

    else:
        status   = "normal"
        action   = "none"
        lock_sec = None

    captcha_required = action == "captcha"

    return {
        "status":           status,
        "risk_score":       risk_score,
        "reasons":          reasons,
        "action":           action,
        "lockout_seconds":  lock_sec,
        "captcha_required": captcha_required,
    }


def _parse_ts(ts_str: str) -> datetime:
    """Parse ISO timestamp string to datetime."""
    try:
        return datetime.fromisoformat(ts_str)
    except Exception:
        return datetime.now(timezone.utc)
