"""
Dashboard Route — SQLite-backed with auto-idle and live AI summary.
"""

from flask import Blueprint, jsonify
from models.database import get_all_students, auto_idle_stale_students
from services.ai_summary import generate_ai_summary, generate_alerts
from middleware.auth import jwt_optional

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard", methods=["GET"])
@jwt_optional
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
            "score": s["score"],
            "activity": s["activity"],
            "role": s["role"],
            "contribution": s["contribution"],
        })

    total = len(students)

    # Calculate averages
    total_ks = sum(s.get("keystrokes", 0) for s in students)
    avg_score = (
        sum(s.get("score", 0) for s in students) / total if total > 0 else 0
    )
    active_count = sum(
        1 for s in students if s.get("activity", "idle") != "idle"
    )

    # Contribution split (already calculated by DB)
    contribution_split = [
        {"name": s["student"], "percentage": s["contribution"]}
        for s in students
    ]
    contribution_split.sort(key=lambda x: x["percentage"], reverse=True)

    # Activity timeline (mock data — realistic for demo)
    activity_timeline = [
        {"day": "MON", "count": 45},
        {"day": "TUE", "count": 62},
        {"day": "WED", "count": 38},
        {"day": "THU", "count": 71},
        {"day": "FRI", "count": 55},
        {"day": "SAT", "count": 80},
        {"day": "SUN", "count": 68},
    ]

    # Team efficiency based on actual data
    if total > 0 and total_ks > 0:
        team_efficiency = min(round((active_count / total) * 70 + avg_score * 0.3), 100)
    else:
        team_efficiency = 0

    # Total active time (mock for demo)
    active_time = "12h 45m"

    # AI-generated summary from REAL data
    ai_summary = generate_ai_summary(students)
    ai_alerts = generate_alerts(students)

    # Sprint velocity metrics
    sprint_velocity = {
        "overall_progress": min(round(avg_score * 0.88 + 10), 100) if total > 0 else 0,
        "code_quality": 94,
        "peer_sentiment": 82,
    }

    return jsonify({
        "students": students,
        "total_students": total,
        "total_keystrokes": total_ks,
        "average_score": round(avg_score, 1),
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
def generate_report():
    """Generate a report — returns JSON."""
    students_raw = get_all_students()
    students = [
        {"student": s["name"], "keystrokes": s["keystrokes"], "score": s["score"],
         "activity": s["activity"], "contribution": s["contribution"]}
        for s in students_raw
    ]
    return jsonify({
        "report_type": "Project Analytics Report",
        "course": "CS101: Intro to Python",
        "generated_at": "2024-01-15T10:30:00Z",
        "students": students,
        "summary": generate_ai_summary(students),
    })
