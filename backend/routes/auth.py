"""
Auth Routes — JWT-based authentication.
POST /api/auth/login   → returns JWT token
POST /api/auth/register → creates user + returns JWT
"""

import re
import uuid
import jwt
import requests
from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from models.database import get_user_by_email, get_user_by_name, create_user, update_user_password
from middleware.auth import create_token
from config import Config

auth_bp = Blueprint("auth", __name__)


def verify_firebase_google_token(id_token):
    """Verify a Firebase ID token through Firebase Auth's account lookup API.

    This avoids requiring a downloadable service-account key on Render. Firebase
    validates the token and returns trusted account metadata; the decoded claims
    are then bound to that account and checked for issuer, project, and revocation.
    """
    if not Config.FIREBASE_PROJECT_ID or not Config.FIREBASE_WEB_API_KEY:
        raise RuntimeError("Firebase Authentication is not configured on the server")

    response = requests.post(
        "https://identitytoolkit.googleapis.com/v1/accounts:lookup",
        params={"key": Config.FIREBASE_WEB_API_KEY},
        json={"idToken": id_token},
        timeout=10,
    )
    if response.status_code != 200:
        raise ValueError("Firebase rejected the ID token")

    users = response.json().get("users", [])
    if not users:
        raise ValueError("Firebase account was not found")
    identity = users[0]
    claims = jwt.decode(
        id_token,
        options={"verify_signature": False, "verify_exp": False, "verify_aud": False},
    )
    project_id = Config.FIREBASE_PROJECT_ID
    if claims.get("aud") != project_id:
        raise ValueError("Firebase token belongs to another project")
    if claims.get("iss") != f"https://securetoken.google.com/{project_id}":
        raise ValueError("Firebase token has an invalid issuer")
    if claims.get("sub") != identity.get("localId"):
        raise ValueError("Firebase token does not match the verified account")
    if identity.get("disabled"):
        raise ValueError("Firebase account is disabled")

    valid_since = int(identity.get("validSince", "0") or 0)
    if int(claims.get("auth_time", 0)) < valid_since:
        raise ValueError("Firebase token has been revoked")
    if not any(provider.get("providerId") == "google.com" for provider in identity.get("providerUserInfo", [])):
        raise ValueError("A Google account is required")
    return {
        "email": identity.get("email", ""),
        "email_verified": identity.get("emailVerified", False),
        "name": identity.get("displayName", ""),
        "uid": identity.get("localId", ""),
    }


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
        identity = verify_firebase_google_token(id_token)
    except RuntimeError:
        return jsonify({"error": "Google sign-in is not configured on the server"}), 503
    except (ValueError, jwt.InvalidTokenError, requests.RequestException):
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
