"""
AI Insights Route — SQLite-backed.
POST /api/ai-insights — accepts custom data or uses DB
GET  /api/ai-insights — uses live DB data
"""

from flask import Blueprint, request, jsonify
from models.database import get_all_students
from services.ai_engine import execute_ai_analysis
from config import Config

ai_insights_bp = Blueprint("ai_insights", __name__)


@ai_insights_bp.route("/ai-insights", methods=["POST"])
def get_ai_insights():
    """POST /api/ai-insights — accepts optional student data, or uses DB."""
    data = request.get_json(silent=True) or {}

    student_data = data.get("students", None)

    if not student_data:
        # Pull live data from SQLite
        raw = get_all_students()
        student_data = [
            {"student": s["name"], "keystrokes": s["keystrokes"],
             "score": s["score"], "activity": s["activity"],
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
def get_ai_insights_live():
    """GET /api/ai-insights — uses current live DB data."""
    raw = get_all_students()
    student_data = [
        {"student": s["name"], "keystrokes": s["keystrokes"],
         "score": s["score"], "activity": s["activity"],
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
