"""
Code Execution Route — uses SQLite for student score updates.
"""

from flask import Blueprint, request, jsonify, g
from services.judge0 import execute_code, ExecutionUnavailable
from models.database import update_student_score, get_student_by_name
from middleware.auth import jwt_required

execute_bp = Blueprint("execute", __name__)


@execute_bp.route("/execute", methods=["POST"])
@jwt_required
def run_code():
    """
    Execute code via Judge0 and update student score in DB.
    Body: { code, language_id, student }
    """
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Request body required"}), 400

    code = data.get("code", "")
    language_id = data.get("language_id", 71)
    student_name = g.current_user.get("name", "")

    if not isinstance(code, str) or not code.strip():
        return jsonify({"error": "Code cannot be empty"}), 400
    if len(code.encode("utf-8")) > 65536:
        return jsonify({"error": "Code is too large (maximum 64 KiB)"}), 413
    if isinstance(language_id, bool) or not isinstance(language_id, int) or language_id not in {50, 54, 62, 63, 71}:
        return jsonify({"error": "Unsupported language"}), 400

    # Execute via Judge0
    try:
        result = execute_code(code, language_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except ExecutionUnavailable as exc:
        return jsonify({"error": str(exc)}), 503

    # Calculate score
    status = result.get("status", "")
    if status == "Accepted":
        score = 100
    else:
        score = 0

    result["score"] = score

    # Only the authenticated user's record may be affected.
    student = get_student_by_name(student_name)
    if student:
        update_student_score(student_name, score, "submitted")

    return jsonify(result)
