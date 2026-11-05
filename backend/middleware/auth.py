"""
═══════════════════════════════════════════
JWT Middleware — TeamFit AI
Protects routes with Bearer token authentication.
═══════════════════════════════════════════
"""

import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g
from config import Config


def create_token(user: dict) -> str:
    """Create a JWT token for a user."""
    payload = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(seconds=Config.TOKEN_TTL_SECONDS),
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token."""
    try:
        return jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def jwt_required(f):
    """Decorator: require valid JWT on a route. Sets g.current_user."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid authorization header"}), 401

        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)

        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401

        g.current_user = payload
        return f(*args, **kwargs)

    return decorated


def jwt_optional(f):
    """Decorator: attach user if token present, but don't block if missing."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        g.current_user = None

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            payload = decode_token(token)
            if payload:
                g.current_user = payload

        return f(*args, **kwargs)

    return decorated


def roles_required(*roles):
    """Require a valid JWT and one of the listed roles."""
    def decorate(f):
        @wraps(f)
        @jwt_required
        def wrapped(*args, **kwargs):
            if g.current_user.get("role") not in roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorate
