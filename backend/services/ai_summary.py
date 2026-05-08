"""
AI Summary — generates real summaries from live student data.
No hardcoded templates — uses actual keystroke and contribution numbers.
"""


def generate_ai_summary(students: list) -> str:
    """Generate AI summary from REAL student data."""
    if not students:
        return "No student data available. Waiting for team members to start coding."

    # Sort by keystrokes (contribution)
    sorted_students = sorted(students, key=lambda s: s.get("keystrokes", 0), reverse=True)
    total_ks = sum(s.get("keystrokes", 0) for s in sorted_students)

    if total_ks == 0:
        return "Session started. Waiting for team members to begin coding — keystrokes will be tracked in real-time."

    top = sorted_students[0]
    top_name = top["student"]
    top_ks = top.get("keystrokes", 0)
    top_contrib = top.get("contribution", 0)

    parts = []

    # Main insight
    if len(sorted_students) >= 2:
        bottom = sorted_students[-1]
        bot_name = bottom["student"]
        bot_ks = bottom.get("keystrokes", 0)
        bot_contrib = bottom.get("contribution", 0)

        parts.append(
            f"{top_name} is leading with **{top_ks} keystrokes** ({top_contrib}% contribution), "
            f"while {bot_name} has contributed **{bot_ks} keystrokes** ({bot_contrib}%)."
        )

        # Imbalance warning
        if top_contrib > 0 and bot_contrib > 0 and (top_contrib / max(bot_contrib, 1)) > 2.5:
            parts.append(
                f"⚠️ Contribution imbalance detected — {bot_name} should increase engagement."
            )
        elif abs(top_contrib - bot_contrib) < 15:
            parts.append("✅ Team contribution is well-balanced.")
    else:
        parts.append(
            f"{top_name} is actively contributing with **{top_ks} keystrokes**."
        )

    # Activity status
    active = [s for s in sorted_students if s.get("activity", "idle") != "idle"]
    idle = [s for s in sorted_students if s.get("activity", "idle") == "idle"]

    if active:
        names = ", ".join(s["student"] for s in active)
        parts.append(f"Currently active: **{names}**.")
    if idle:
        names = ", ".join(s["student"] for s in idle)
        parts.append(f"Idle: {names}.")

    return " ".join(parts)


def generate_alerts(students: list) -> list:
    """Generate alert cards based on real contribution data."""
    alerts = []

    if not students:
        return alerts

    total_ks = sum(s.get("keystrokes", 0) for s in students)
    if total_ks == 0:
        return [{
            "type": "info",
            "title": "Session Ready",
            "message": "Waiting for team members to start coding. Keystrokes will be tracked in real-time."
        }]

    sorted_students = sorted(students, key=lambda s: s.get("keystrokes", 0))

    # Check for low contributors
    for s in sorted_students:
        contrib = s.get("contribution", 0)
        if contrib < 25 and len(students) >= 2:
            alerts.append({
                "type": "warning",
                "title": "Low Contribution Alert",
                "message": (
                    f"{s['student']} has only {s.get('keystrokes', 0)} keystrokes "
                    f"({contrib}% contribution). Consider pair programming."
                ),
            })
            alerts.append({
                "type": "recommendation",
                "title": "Suggestion",
                "message": (
                    f"Assign {s['student']} a focused coding task to increase engagement."
                ),
            })
            break  # Only one alert set

    return alerts
