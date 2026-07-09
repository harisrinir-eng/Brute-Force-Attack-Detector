"""
Pydantic data models for request validation and response schemas
"""

from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str
    captcha_answer: Optional[str] = None  # for captcha challenge

class LoginAttemptRecord(BaseModel):
    id: int
    username: str
    ip_address: str
    timestamp: str
    success: bool
    status: str
    risk_score: float
    reason: str
    action: str

class DetectionResult(BaseModel):
    allowed: bool
    status: str           # normal | suspicious | attack | blocked
    risk_score: float     # 0–100
    reasons: list[str]
    action: str           # none | captcha | lockout | blocked
    message: str
    lockout_seconds: Optional[int] = None
    captcha_required: bool = False
