"""
Student Routes — SQLite-backed CRUD.
All data persisted in real-time to teamfit.db.
"""

import logging
from flask import Blueprint, request, jsonify, g
from models.database import (
    upsert_student,
    get_all_students,
    get_student_by_name,
    delete_student as db_delete_student,
    record_session_activity,
)
from middleware.auth import jwt_required, roles_required

logger = logging.getLogger("teamfit")

students_bp = Blueprint("students", __name__)


@students_bp.route("/students", methods=["GET"])
@roles_required("professor")
def get_students():
    """Return all students with real-time contribution %."""
    try:
        students = get_all_students()
    except Exception as e:
        logger.error(f"Failed to fetch students: {e}")
        return jsonify({"error": "Failed to fetch students"}), 500
    # Convert to API format
    result = []
    for s in students:
        result.append({
            "student": s["name"],
            "keystrokes": s["keystrokes"],
            "activity": s["activity"],
            "role": s["role"],
            "contribution": s["contribution"],
            "updated_at": s.get("updated_at", ""),
        })
    return jsonify(result)


@students_bp.route("/students", methods=["POST"])
@jwt_required
def upsert_student_route():
    """Create or update a student record. Persists to SQLite in real-time."""
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Request body required"}), 400

    name = g.current_user.get("name", "")
    if g.current_user.get("role") != "student":
        return jsonify({"error": "Only students can submit activity"}), 403

    session_id = data.get("session_id")
    if not isinstance(session_id, str) or not session_id.strip():
        return jsonify({"error": "session_id is required"}), 400

    keystrokes = data.get("keystrokes", 0)
    if isinstance(keystrokes, bool) or not isinstance(keystrokes, int) or not 0 <= keystrokes <= 10000:
        return jsonify({"error": "keystrokes must be an integer from 0 to 10000"}), 400
    activity = data.get("activity", "idle")
    if activity not in {"idle", "typing", "editing", "submitted"}:
        return jsonify({"error": "Invalid activity value"}), 400
    role = ""
    score = 0

    if not record_session_activity(session_id.strip(), name, keystrokes, activity):
        return jsonify({"error": "You are not a member of this session"}), 403

    student = upsert_student(name, keystrokes, score, activity, role)

    return jsonify({
        "student": student.get("name", name),
        "keystrokes": student.get("keystrokes", keystrokes),
        "activity": student.get("activity", activity),
        "role": student.get("role", role),
        "contribution": student.get("contribution", 0),
    })


@students_bp.route("/students/<name>", methods=["GET"])
@jwt_required
def get_student(name: str):
    """Get a single student by name."""
    if g.current_user.get("role") != "professor" and g.current_user.get("name") != name:
        return jsonify({"error": "Insufficient permissions"}), 403
    student = get_student_by_name(name)
    if not student:
        return jsonify({"error": f"Student '{name}' not found"}), 404
    return jsonify({
        "student": student["name"],
        "keystrokes": student["keystrokes"],
        "activity": student["activity"],
        "role": student["role"],
        "contribution": student["contribution"],
    })


@students_bp.route("/students/<name>", methods=["DELETE"])
@roles_required("professor")
def delete_student_route(name: str):
    """Remove a student."""
    if not db_delete_student(name):
        return jsonify({"error": f"Student '{name}' not found"}), 404
    return jsonify({"message": f"Student '{name}' deleted"}), 200
