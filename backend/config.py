"""
═══════════════════════════════════════════
TeamFit AI — Configuration
Environment-based settings for dev & production.
═══════════════════════════════════════════
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── Security ──
    SECRET_KEY = os.environ.get("SECRET_KEY", "teamfit-hackathon-secret-key-2026-secure")

    # ── Database ──
    # Use DATABASE_URL for PostgreSQL (Render/Railway), fallback to SQLite
    DATABASE_URL = os.environ.get("DATABASE_URL", "")

    # ── AI ──
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

    # ── Code Execution ──
    JUDGE0_API_KEY = os.environ.get("JUDGE0_API_KEY", "")
    JUDGE0_URL = os.environ.get("JUDGE0_URL", "https://judge0-ce.p.rapidapi.com")
    JUDGE0_HOST = os.environ.get("JUDGE0_HOST", "judge0-ce.p.rapidapi.com")

    # ── Server ──
    FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    PORT = int(os.environ.get("FLASK_PORT", os.environ.get("PORT", 5000)))

    # ── CORS ──
    CORS_ORIGINS = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000"
    ).split(",")
