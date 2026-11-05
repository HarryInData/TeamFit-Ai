"""
Auth Routes — JWT-based authentication.
POST /api/auth/login   → returns JWT token
POST /api/auth/register → creates user + returns JWT
"""

import re
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from models.database import get_user_by_email, get_user_by_name, create_user, update_user_password
from middleware.auth import create_token
from config import Config

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/auth/login", methods=["POST", "OPTIONS"])
def login():
    """Authenticate user and return JWT token."""
    # Handle preflight explicitly as a safety net
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Request body required"}), 400

    email = data.get("email", "")
    email = email.strip().lower() if isinstance(email, str) else ""
    password = data.get("password", "")
    if not isinstance(password, str):
        return jsonify({"error": "Invalid email or password"}), 401
    role = data.get("role", "student")

    user = get_user_by_email(email)

    stored_password = user["password"] if user else ""
    valid_password = False
    if user:
        demo_accounts = {
            "daksh@teamfit.ai", "harry@teamfit.ai", "student@teamfit.ai",
            "sarah@teamfit.ai", "professor@teamfit.ai",
        }
        if Config.IS_PRODUCTION and email in demo_accounts:
            return jsonify({"error": "Demo accounts are disabled in production"}), 401
        if stored_password == "!firebase":
            valid_password = False
        elif stored_password.startswith(("pbkdf2:", "scrypt:")):
            valid_password = check_password_hash(stored_password, password)
        elif stored_password == password and (not Config.IS_PRODUCTION or email not in demo_accounts):
            # Migrate legacy plaintext records on successful login.
            valid_password = True
            update_user_password(email, generate_password_hash(password))
    if not valid_password:
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


@auth_bp.route("/auth/register", methods=["POST", "OPTIONS"])
def register():
    """Register a new user and return JWT token."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Request body required"}), 400

    email_value = data.get("email", "")
    name_value = data.get("name", "")
    email = email_value.strip().lower() if isinstance(email_value, str) else ""
    name = name_value.strip() if isinstance(name_value, str) else ""
    password = data.get("password", "")
    role = data.get("role", "student")

    if not email or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) or not name or not isinstance(password, str):
        return jsonify({"error": "Name, email, and password are required"}), 400
    if len(name) > 100 or len(email) > 254 or len(password) < 10 or len(password) > 256:
        return jsonify({"error": "Name, email, or password does not meet length requirements"}), 400
    role = data.get("role", "student")
    if role != "student":
        return jsonify({"error": "Self-registration is available for students only"}), 403

    existing = get_user_by_email(email)
    if existing:
        return jsonify({"error": "Email already registered"}), 409
    if get_user_by_name(name):
        return jsonify({"error": "Name already in use"}), 409

    user_id = str(uuid.uuid4())
    user = create_user(user_id, name, email, generate_password_hash(password), role)

    token = create_token(user)

    return jsonify({
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"], "avatar": ""},
    }), 201


@auth_bp.route("/auth/google", methods=["POST", "OPTIONS"])
def google_auth():
    """Verify a Firebase ID token before creating or logging in its account."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Request body required"}), 400
    role = data.get("role", "student")
    if role not in {"student", "professor"}:
        return jsonify({"error": "Role must be student or professor"}), 400
    id_token = data.get("idToken")
    if not isinstance(id_token, str) or not id_token:
        return jsonify({"error": "Firebase ID token is required"}), 400
    try:
        import firebase_admin
        from firebase_admin import auth as firebase_auth
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        identity = firebase_auth.verify_id_token(id_token, check_revoked=True)
    except Exception:
        return jsonify({"error": "Google sign-in could not be verified"}), 401

    email = str(identity.get("email", "")).strip().lower()
    if not email or not identity.get("email_verified"):
        return jsonify({"error": "A verified Google email is required"}), 401
    user = get_user_by_email(email)
    if user and user["role"] != role:
        return jsonify({"error": f"Account is not registered as {role}"}), 403
    if not user:
        if role == "professor":
            return jsonify({"error": "Professor accounts must be provided by your institution"}), 403
        name = str(identity.get("name") or email.split("@", 1)[0])[:100]
        if get_user_by_name(name):
            name = f"{name[:70]} ({email.split('@', 1)[0][:24]})"
        user = create_user(str(uuid.uuid4()), name, email, "!firebase", "student")

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
