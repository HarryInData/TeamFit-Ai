"""
═══════════════════════════════════════════
TeamFit AI — Configuration
Environment-based settings for dev & production.
═══════════════════════════════════════════
"""

import os
import secrets
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── Security ──
    ENV = os.environ.get("APP_ENV", "development").lower()
    IS_PRODUCTION = ENV == "production"
    SECRET_KEY = os.environ.get("SECRET_KEY") or ("" if IS_PRODUCTION else secrets.token_urlsafe(48))
    TOKEN_TTL_SECONDS = int(os.environ.get("TOKEN_TTL_SECONDS", "3600"))

    # ── Database ──
    # Use DATABASE_URL for PostgreSQL (Render/Railway), fallback to SQLite
    DATABASE_URL = os.environ.get("DATABASE_URL", "")

    # ── AI ──
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
    # Keep this configurable because hosted model IDs can be retired by providers.
    GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

    # ── Firebase Authentication ──
    FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "")
    FIREBASE_WEB_API_KEY = os.environ.get("FIREBASE_WEB_API_KEY", "")

    # ── Isolated code execution (self-hosted Piston) ──
    PISTON_URL = os.environ.get("PISTON_URL", "http://127.0.0.1:2000")
    PISTON_AUTH_HEADER = os.environ.get("PISTON_AUTH_HEADER", "")
    PISTON_AUTH_TOKEN = os.environ.get("PISTON_AUTH_TOKEN", "")

    # ── Server ──
    FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    PORT = int(os.environ.get("FLASK_PORT", os.environ.get("PORT", 5001)))

    # ── CORS ──
    CORS_ORIGINS = [origin.strip() for origin in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000"
    ).split(",") if origin.strip()]

    @classmethod
    def validate(cls):
        if cls.IS_PRODUCTION:
            if len(cls.SECRET_KEY) < 32:
                raise RuntimeError("SECRET_KEY must be configured with at least 32 characters in production")
            if not cls.DATABASE_URL.startswith(("postgres://", "postgresql://")):
                raise RuntimeError("DATABASE_URL must point to PostgreSQL in production")
            if not cls.CORS_ORIGINS or any("localhost" in origin for origin in cls.CORS_ORIGINS):
                raise RuntimeError("Configure explicit production CORS_ORIGINS")
            if any(not origin.startswith("https://") for origin in cls.CORS_ORIGINS):
                raise RuntimeError("Production CORS_ORIGINS must use HTTPS")
            if cls.FLASK_DEBUG:
                raise RuntimeError("FLASK_DEBUG must be false in production")
            if not cls.PISTON_URL.startswith("https://"):
                raise RuntimeError("PISTON_URL must use HTTPS in production")
            if not cls.PISTON_AUTH_HEADER or len(cls.PISTON_AUTH_TOKEN) < 32:
                raise RuntimeError("Configure a strong PISTON_AUTH_TOKEN and PISTON_AUTH_HEADER in production")
            if not cls.FIREBASE_PROJECT_ID or not cls.FIREBASE_WEB_API_KEY:
                raise RuntimeError("FIREBASE_PROJECT_ID and FIREBASE_WEB_API_KEY must be configured in production")
