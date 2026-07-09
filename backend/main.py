"""
AI-Based Brute Force Attack Detection and Prevention System
Backend: FastAPI + SQLite + Isolation Forest (anomaly detection)
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from routes.auth import router as auth_router
from routes.dashboard import router as dashboard_router
from routes.demo import router as demo_router
from db.database import init_db

app = FastAPI(
    title="Brute Force Detection System",
    description="AI-powered brute force attack detection and prevention",
    version="1.0.0"
)

# Allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()
    print("✅ Database initialized")

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(demo_router, prefix="/api/demo", tags=["Demo"])

@app.get("/")
async def root():
    return {"message": "Brute Force Detection API running", "status": "ok"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
