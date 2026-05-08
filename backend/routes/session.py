"""
Session Routes — Create, Join, Stats
"""

from flask import Blueprint, jsonify, request
from models.database import (
    create_session, join_session, get_session_members,
    get_session_by_code, get_all_sessions, get_all_students,
    auto_idle_stale_students
)
from services.ai_summary import generate_ai_summary
from middleware.auth import jwt_required, jwt_optional

session_bp = Blueprint("session", __name__)


@session_bp.route("/session/create", methods=["POST"])
@jwt_required
def create():
    """Create a new coding session."""
    from flask import g
    data = request.get_json() or {}
    user_name = g.current_user.get("name", "Unknown")
    title = data.get("title", "Coding Session")

    session = create_session(created_by=user_name, title=title)

    return jsonify({
        "session_id": session["session_id"],
        "join_code": session["join_code"],
        "join_link": f"/join/{session['join_code']}",
        "title": session["title"],
        "created_by": session["created_by"],
    }), 201


@session_bp.route("/session/join", methods=["POST"])
@jwt_required
def join():
    """Join an existing session by code or ID."""
    from flask import g
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    user_name = g.current_user.get("name", "Unknown")
    session_id = data.get("session_id")
    join_code = data.get("join_code", "").strip().upper()

    if not session_id and not join_code:
        return jsonify({"error": "session_id or join_code required"}), 400

    session = join_session(
        user_name=user_name,
        session_id=session_id,
        join_code=join_code or None,
    )

    if not session:
        return jsonify({"error": "Session not found. Check your code and try again."}), 404

    members = get_session_members(session["id"])

    return jsonify({
        "session_id": session["id"],
        "join_code": session["join_code"],
        "title": session["title"],
        "created_by": session["created_by"],
        "members": [m["user_name"] for m in members],
    })


@session_bp.route("/session/<session_id>/stats", methods=["GET"])
@jwt_optional
def session_stats(session_id):
    """Get real-time stats for a session."""
    # Auto-idle stale users
    auto_idle_stale_students(timeout_seconds=10)

    members = get_session_members(session_id)

    if not members:
        return jsonify({"error": "Session not found or empty"}), 404

    # Calculate contribution within this session
    total_ks = sum(m.get("keystrokes", 0) or 0 for m in members)
    users = []
    for m in members:
        ks = m.get("keystrokes", 0) or 0
        contrib = round((ks / total_ks * 100), 1) if total_ks > 0 else 0
        users.append({
            "user": m["user_name"],
            "keystrokes": ks,
            "activity": m.get("activity", "idle") or "idle",
            "contribution": contrib,
            "role": m.get("role", "member"),
        })

    # AI summary from real data
    ai_summary = generate_ai_summary([
        {"student": u["user"], "keystrokes": u["keystrokes"],
         "contribution": u["contribution"], "activity": u["activity"]}
        for u in users
    ])

    return jsonify({
        "session_id": session_id,
        "users": users,
        "total_keystrokes": total_ks,
        "active_count": sum(1 for u in users if u["activity"] != "idle"),
        "ai_summary": ai_summary,
    })


@session_bp.route("/session/<session_id>/members", methods=["GET"])
@jwt_optional
def session_members(session_id):
    """List members in a session."""
    members = get_session_members(session_id)
    return jsonify({
        "session_id": session_id,
        "members": [
            {"user": m["user_name"], "role": m.get("role", "member"),
             "keystrokes": m.get("keystrokes", 0) or 0,
             "activity": m.get("activity", "idle") or "idle"}
            for m in members
        ],
    })


@session_bp.route("/sessions", methods=["GET"])
@jwt_optional
def list_sessions():
    """List all sessions (for professor dashboard)."""
    sessions = get_all_sessions()
    return jsonify({"sessions": sessions})
