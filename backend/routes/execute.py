"""
Code Execution Route — uses SQLite for student score updates.
"""

from flask import Blueprint, request, jsonify
from services.judge0 import execute_code
from models.database import update_student_score, get_student_by_name

execute_bp = Blueprint("execute", __name__)


@execute_bp.route("/execute", methods=["POST"])
def run_code():
    """
    Execute code via Judge0 and update student score in DB.
    Body: { code, language_id, student }
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body required"}), 400

    code = data.get("code", "")
    language_id = data.get("language_id", 71)
    student_name = data.get("student", "")

    if not code.strip():
        return jsonify({"error": "Code cannot be empty"}), 400

    # Execute via Judge0
    result = execute_code(code, language_id)

    # Calculate score
    status = result.get("status", "")
    if status == "Accepted":
        score = 100
    elif "Error" in status:
        score = 0
    else:
        score = 50

    result["score"] = score

    # Update student record in SQLite
    if student_name:
        student = get_student_by_name(student_name)
        if student:
            update_student_score(student_name, score, "submitted")

    return jsonify(result)
