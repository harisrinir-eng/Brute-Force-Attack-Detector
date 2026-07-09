"""
Dashboard routes
GET /api/dashboard/attempts   – recent attempts
GET /api/dashboard/stats      – summary statistics
GET /api/dashboard/timeline   – attempts per minute for chart
"""

from fastapi import APIRouter
from services.storage import get_all_attempts, get_stats
from collections import defaultdict

router = APIRouter()


@router.get("/attempts")
async def attempts():
    """Return last 200 login attempts for the dashboard table."""
    rows = get_all_attempts(200)
    # Convert sqlite3.Row int booleans back to bool for JSON
    for r in rows:
        r["success"] = bool(r["success"])
    return {"attempts": rows}


@router.get("/stats")
async def stats():
    """Return summary statistics."""
    return get_stats()


@router.get("/timeline")
async def timeline():
    """
    Return attempt counts bucketed by minute for the last 10 minutes.
    Used for the line/bar chart on dashboard.
    """
    rows = get_all_attempts(500)
    buckets: dict[str, dict] = defaultdict(lambda: {"total": 0, "failed": 0, "attack": 0})

    for r in rows:
        ts = r["timestamp"][:16]  # "YYYY-MM-DDTHH:MM"
        label = ts[11:]           # "HH:MM"
        buckets[label]["total"] += 1
        if not r["success"]:
            buckets[label]["failed"] += 1
        if r["status"] in ("attack", "suspicious"):
            buckets[label]["attack"] += 1

    # Sort and return last 15 buckets
    sorted_buckets = sorted(buckets.items())[-15:]
    return {
        "labels": [b[0] for b in sorted_buckets],
        "total":  [b[1]["total"] for b in sorted_buckets],
        "failed": [b[1]["failed"] for b in sorted_buckets],
        "attack": [b[1]["attack"] for b in sorted_buckets],
    }
