"""
Student Routes — SQLite-backed CRUD.
All data persisted in real-time to teamfit.db.
"""

import logging
from flask import Blueprint, request, jsonify
from models.database import (
    upsert_student,
    get_all_students,
    get_student_by_name,
    delete_student as db_delete_student,
)
from middleware.auth import jwt_optional

logger = logging.getLogger("teamfit")

students_bp = Blueprint("students", __name__)


@students_bp.route("/students", methods=["GET"])
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
            "score": s["score"],
            "activity": s["activity"],
            "role": s["role"],
            "contribution": s["contribution"],
            "updated_at": s.get("updated_at", ""),
        })
    return jsonify(result)


@students_bp.route("/students", methods=["POST"])
@jwt_optional
def upsert_student_route():
    """Create or update a student record. Persists to SQLite in real-time."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body required"}), 400

    name = data.get("student", "").strip()
    if not name:
        return jsonify({"error": "Student name is required"}), 400

    keystrokes = data.get("keystrokes", 0)
    score = data.get("score", 0)
    activity = data.get("activity", "idle")
    role = data.get("role", "")

    student = upsert_student(name, keystrokes, score, activity, role)

    return jsonify({
        "student": student.get("name", name),
        "keystrokes": student.get("keystrokes", keystrokes),
        "score": student.get("score", score),
        "activity": student.get("activity", activity),
        "role": student.get("role", role),
        "contribution": student.get("contribution", 0),
    })


@students_bp.route("/students/<name>", methods=["GET"])
def get_student(name: str):
    """Get a single student by name."""
    student = get_student_by_name(name)
    if not student:
        return jsonify({"error": f"Student '{name}' not found"}), 404
    return jsonify({
        "student": student["name"],
        "keystrokes": student["keystrokes"],
        "score": student["score"],
        "activity": student["activity"],
        "role": student["role"],
        "contribution": student["contribution"],
    })


@students_bp.route("/students/<name>", methods=["DELETE"])
def delete_student_route(name: str):
    """Remove a student."""
    if not db_delete_student(name):
        return jsonify({"error": f"Student '{name}' not found"}), 404
    return jsonify({"message": f"Student '{name}' deleted"}), 200
