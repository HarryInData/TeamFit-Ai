"""
Dashboard Route — SQLite-backed with auto-idle and live AI summary.
"""

from flask import Blueprint, jsonify
from datetime import datetime, timezone
from models.database import get_all_students, auto_idle_stale_students
from services.ai_summary import generate_ai_summary, generate_alerts
from middleware.auth import roles_required

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard", methods=["GET"])
@roles_required("professor")
def get_dashboard():
    """
    Aggregated dashboard data for the professor view.
    Auto-idles stale students before returning data.
    """
    # Auto-mark students as idle if no update in 10 seconds
    auto_idle_stale_students(timeout_seconds=10)

    students_raw = get_all_students()

    # Convert to API format
    students = []
    for s in students_raw:
        students.append({
            "student": s["name"],
            "keystrokes": s["keystrokes"],
            "activity": s["activity"],
            "role": s["role"],
            "contribution": s["contribution"],
        })

    total = len(students)

    # Calculate averages
    total_ks = sum(s.get("keystrokes", 0) for s in students)
    active_count = sum(
        1 for s in students if s.get("activity", "idle") != "idle"
    )

    # Contribution split (already calculated by DB)
    contribution_split = [
        {"name": s["student"], "percentage": s["contribution"]}
        for s in students
    ]
    contribution_split.sort(key=lambda x: x["percentage"], reverse=True)

    # Historical activity is not stored yet, so don't fabricate a timeline.
    activity_timeline = []

    # Team efficiency based on actual data
    if total > 0:
        team_efficiency = round((active_count / total) * 100)
    else:
        team_efficiency = 0

    active_time = None

    # AI-generated summary from REAL data
    ai_summary = generate_ai_summary(students)
    ai_alerts = generate_alerts(students)

    # Sprint velocity metrics
    sprint_velocity = {"overall_progress": None, "code_quality": None, "peer_sentiment": None}

    return jsonify({
        "students": students,
        "total_students": total,
        "total_keystrokes": total_ks,
        "active_count": active_count,
        "contribution_split": contribution_split,
        "activity_timeline": activity_timeline,
        "team_efficiency": team_efficiency,
        "active_time": active_time,
        "ai_summary": ai_summary,
        "ai_alerts": ai_alerts,
        "sprint_velocity": sprint_velocity,
    })


@dashboard_bp.route("/dashboard/report", methods=["GET"])
@roles_required("professor")
def generate_report():
    """Generate a report — returns JSON."""
    students_raw = get_all_students()
    students = [
        {"student": s["name"], "keystrokes": s["keystrokes"],
         "activity": s["activity"], "contribution": s["contribution"]}
        for s in students_raw
    ]
    return jsonify({
        "report_type": "Project Analytics Report",
        "course": "CS101: Intro to Python",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "students": students,
        "summary": generate_ai_summary(students),
    })
