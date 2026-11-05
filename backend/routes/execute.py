"""Authenticated endpoint for isolated source-code execution."""

from flask import Blueprint, request, jsonify
from services.judge0 import execute_code, ExecutionUnavailable
from middleware.auth import jwt_required

execute_bp = Blueprint("execute", __name__)


@execute_bp.route("/execute", methods=["POST"])
@jwt_required
def run_code():
    """
    Execute code in the isolated Piston runner. This endpoint reports execution
    output and diagnostics; exam grading is handled by the session route.
    Body: { code, language_id, student }
    """
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Request body required"}), 400

    code = data.get("code", "")
    language_id = data.get("language_id", 71)
    if not isinstance(code, str) or not code.strip():
        return jsonify({"error": "Code cannot be empty"}), 400
    if len(code.encode("utf-8")) > 65536:
        return jsonify({"error": "Code is too large (maximum 64 KiB)"}), 413
    if isinstance(language_id, bool) or not isinstance(language_id, int) or language_id not in {50, 54, 62, 63, 71}:
        return jsonify({"error": "Unsupported language"}), 400

    # Execute in the separately hosted, network-disabled Piston sandbox.
    try:
        result = execute_code(code, language_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except ExecutionUnavailable as exc:
        return jsonify({"error": str(exc)}), 503

    return jsonify(result)
