"""
AI Insights Route — SQLite-backed.
POST /api/ai-insights — accepts custom data or uses DB
GET  /api/ai-insights — uses live DB data
"""

import logging

from flask import Blueprint, request, jsonify
from models.database import get_all_students
from services.ai_engine import execute_ai_analysis
from services.question_generator import generate_question_draft
from config import Config
from middleware.auth import roles_required

ai_insights_bp = Blueprint("ai_insights", __name__)
logger = logging.getLogger(__name__)


@ai_insights_bp.route("/ai/generate-question", methods=["POST"])
@roles_required("professor")
def generate_question():
    """Generate a reviewable coding-question draft from a short professor prompt."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object"}), 400

    description = data.get("description")
    difficulty = data.get("difficulty", "intermediate")
    if not isinstance(description, str) or not description.strip() or len(description.strip()) > 2000:
        return jsonify({"error": "Describe the question idea in 1–2,000 characters"}), 400
    if not isinstance(difficulty, str) or difficulty not in {"beginner", "intermediate", "advanced"}:
        return jsonify({"error": "Difficulty must be beginner, intermediate, or advanced"}), 400

    try:
        question = generate_question_draft(description.strip(), difficulty)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception:
        logger.exception("AI question generation failed")
        return jsonify({"error": "AI could not generate a valid question. Please try again."}), 502
    return jsonify({"question": question})


@ai_insights_bp.route("/ai-insights", methods=["POST"])
@roles_required("professor")
def get_ai_insights():
    """POST /api/ai-insights — accepts optional student data, or uses DB."""
    data = request.get_json(silent=True)
    if data is None:
        data = {}
    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object"}), 400

    student_data = data.get("students", None)
    if student_data is not None and (not isinstance(student_data, list) or len(student_data) > 500):
        return jsonify({"error": "students must be a list of at most 500 records"}), 400

    if not student_data:
        # Pull live data from SQLite
        raw = get_all_students()
        student_data = [
            {"student": s["name"], "keystrokes": s["keystrokes"],
             "activity": s["activity"],
             "contribution": s["contribution"]}
            for s in raw
        ]

    if not student_data:
        return jsonify({
            "charts": [], "kpis": [],
            "insights": "No student data available.",
            "data_summary": "Empty dataset", "source": "empty",
        })

    groq_key = Config.GROQ_API_KEY
    result = execute_ai_analysis(student_data, groq_key)
    return jsonify(result)


@ai_insights_bp.route("/ai-insights", methods=["GET"])
@roles_required("professor")
def get_ai_insights_live():
    """GET /api/ai-insights — uses current live DB data."""
    raw = get_all_students()
    student_data = [
        {"student": s["name"], "keystrokes": s["keystrokes"],
         "activity": s["activity"],
         "contribution": s["contribution"]}
        for s in raw
    ]

    if not student_data:
        return jsonify({
            "charts": [], "kpis": [],
            "insights": "No student data available.",
            "data_summary": "Empty dataset", "source": "empty",
        })

    groq_key = Config.GROQ_API_KEY
    result = execute_ai_analysis(student_data, groq_key)
    return jsonify(result)
