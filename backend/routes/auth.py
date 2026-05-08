"""
Auth Routes — JWT-based authentication.
POST /api/auth/login   → returns JWT token
POST /api/auth/register → creates user + returns JWT
"""

from flask import Blueprint, request, jsonify
from models.database import get_user_by_email, create_user
from middleware.auth import create_token

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    """Authenticate user and return JWT token."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body required"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "student")

    user = get_user_by_email(email)

    if not user or user["password"] != password:
        return jsonify({"error": "Invalid email or password"}), 401

    if user["role"] != role:
        return jsonify({"error": f"Account is not registered as {role}"}), 403

    token = create_token(user)

    return jsonify({
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "avatar": user.get("avatar", ""),
        },
    })


@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    """Register a new user and return JWT token."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body required"}), 400

    email = data.get("email", "").strip().lower()
    name = data.get("name", "").strip()
    password = data.get("password", "")
    role = data.get("role", "student")

    if not email or not name or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    existing = get_user_by_email(email)
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    user_id = f"u{hash(email) % 10000}"
    user = create_user(user_id, name, email, password, role)

    token = create_token(user)

    return jsonify({
        "token": token,
        "user": user,
    }), 201


@auth_bp.route("/auth/google", methods=["POST"])
def google_auth():
    """Mock Google auth — auto-creates/logs in user."""
    data = request.get_json()
    role = data.get("role", "student") if data else "student"

    mock_email = "google.user@gmail.com"
    user = get_user_by_email(mock_email)

    if not user:
        user_id = f"g{hash(mock_email) % 10000}"
        user = create_user(user_id, "Google User", mock_email, "", role)

    token = create_token(user)

    return jsonify({
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "avatar": user.get("avatar", ""),
        },
    })
