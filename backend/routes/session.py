"""
Session Routes — Create, Join, Stats
"""

from flask import Blueprint, jsonify, request, g
from models.database import (
    create_session, join_session, get_session_members,
    get_session_by_code, get_all_sessions, get_session, list_exam_questions,
    list_open_exams, start_session, close_session, auto_idle_stale_students,
    get_exam_question, store_exam_submission, get_exam_leaderboard
)
from services.judge0 import execute_code, ExecutionUnavailable, SUPPORTED_LANGUAGES, MAX_SOURCE_BYTES
from services.ai_summary import generate_ai_summary
from middleware.auth import jwt_required, roles_required

session_bp = Blueprint("session", __name__)


@session_bp.route("/session/create", methods=["POST"])
@roles_required("professor")
def create():
    """Create a professor-owned draft practical exam."""
    from flask import g
    data = request.get_json(silent=True)
    if data is None:
        data = {}
    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object"}), 400
    user_name = g.current_user.get("name", "Unknown")
    title = data.get("title", "Practical Exam")
    if not isinstance(title, str) or not title.strip() or len(title.strip()) > 120:
        return jsonify({"error": "Session title must be between 1 and 120 characters"}), 400
    title = title.strip()

    questions = data.get("questions")
    if not isinstance(questions, list) or not 1 <= len(questions) <= 20:
        return jsonify({"error": "Add between 1 and 20 questions before creating the exam"}), 400
    clean_questions = []
    for position, question in enumerate(questions):
        if not isinstance(question, dict):
            return jsonify({"error": f"Question {position + 1} must be an object"}), 400
        q_title = question.get("title")
        statement = question.get("statement")
        starter_code = question.get("starter_code", "")
        examples = question.get("examples", [])
        test_cases = question.get("test_cases")
        max_score = question.get("max_score", 100)
        if not isinstance(q_title, str) or not q_title.strip() or len(q_title) > 160:
            return jsonify({"error": f"Question {position + 1} needs a title (maximum 160 characters)"}), 400
        if not isinstance(statement, str) or not statement.strip() or len(statement) > 20000:
            return jsonify({"error": f"Question {position + 1} needs a problem statement (maximum 20,000 characters)"}), 400
        if not isinstance(starter_code, str) or len(starter_code) > 16384:
            return jsonify({"error": f"Question {position + 1} starter code is too large"}), 400
        if not isinstance(examples, list) or len(examples) > 10:
            return jsonify({"error": f"Question {position + 1} can have at most 10 examples"}), 400
        if not isinstance(test_cases, list) or not 1 <= len(test_cases) <= 10:
            return jsonify({"error": f"Question {position + 1} needs between 1 and 10 test cases"}), 400
        if isinstance(max_score, bool) or not isinstance(max_score, int) or not 1 <= max_score <= 1000:
            return jsonify({"error": f"Question {position + 1} max_score must be from 1 to 1000"}), 400
        normalized_tests = []
        for case in test_cases:
            if (not isinstance(case, dict) or not isinstance(case.get("stdin", ""), str)
                    or not isinstance(case.get("expected_output"), str)
                    or len(case.get("stdin", "")) > 10000 or len(case["expected_output"]) > 10000):
                return jsonify({"error": f"Question {position + 1} has an invalid test case"}), 400
            normalized_tests.append({
                "stdin": case.get("stdin", ""),
                "expected_output": case["expected_output"],
                "hidden": bool(case.get("hidden", True)),
            })
        clean_examples = []
        for example in examples:
            if not isinstance(example, dict) or not isinstance(example.get("input", ""), str) or not isinstance(example.get("output", ""), str):
                return jsonify({"error": f"Question {position + 1} has an invalid example"}), 400
            clean_examples.append({"input": example.get("input", ""), "output": example.get("output", "")})
        clean_questions.append({
            "title": q_title.strip(), "statement": statement.strip(),
            "starter_code": starter_code, "examples": clean_examples,
            "test_cases": normalized_tests, "max_score": max_score,
        })

    session = create_session(created_by=user_name, title=title, questions=clean_questions)

    return jsonify({
        "session_id": session["session_id"],
        "join_code": session["join_code"],
        "join_link": f"/join/{session['join_code']}",
        "title": session["title"],
        "created_by": session["created_by"],
        "status": session["status"],
    }), 201


@session_bp.route("/session/join", methods=["POST"])
@jwt_required
def join():
    """Join an existing session by code or ID."""
    from flask import g
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Request body required"}), 400

    user_name = g.current_user.get("name", "Unknown")
    if g.current_user.get("role") != "student":
        return jsonify({"error": "Only students can join an exam"}), 403
    session_id = data.get("session_id")
    join_code_value = data.get("join_code", "")
    join_code = join_code_value.strip().upper() if isinstance(join_code_value, str) else ""

    if not session_id and not join_code:
        return jsonify({"error": "session_id or join_code required"}), 400

    session = join_session(
        user_name=user_name,
        session_id=session_id,
        join_code=join_code or None,
    )

    if not session:
        return jsonify({"error": "Exam is not open or the session code is invalid"}), 404

    members = get_session_members(session["id"])

    return jsonify({
        "session_id": session["id"],
        "join_code": session["join_code"],
        "title": session["title"],
        "created_by": session["created_by"],
        "members": [m["user_name"] for m in members],
    })


@session_bp.route("/session/<session_id>/stats", methods=["GET"])
@jwt_required
def session_stats(session_id):
    """Get real-time stats for a session."""
    # Auto-idle stale users
    auto_idle_stale_students(timeout_seconds=10)

    members = get_session_members(session_id)
    if not any(m["user_name"] == g.current_user.get("name") for m in members):
        return jsonify({"error": "Session not found"}), 404

    if not members:
        return jsonify({"error": "Session not found or empty"}), 404

    # Calculate contribution within this session
    total_ks = sum(m.get("keystrokes", 0) or 0 for m in members)
    users = []
    for m in members:
        ks = m.get("keystrokes", 0) or 0
        contrib = round((ks / total_ks * 100), 1) if total_ks > 0 else 0
        users.append({
            "user": m["user_name"],
            "keystrokes": ks,
            "activity": m.get("activity", "idle") or "idle",
            "contribution": contrib,
            "role": m.get("role", "member"),
        })

    # AI summary from real data
    ai_summary = generate_ai_summary([
        {"student": u["user"], "keystrokes": u["keystrokes"],
         "contribution": u["contribution"], "activity": u["activity"]}
        for u in users
    ])

    return jsonify({
        "session_id": session_id,
        "users": users,
        "total_keystrokes": total_ks,
        "active_count": sum(1 for u in users if u["activity"] != "idle"),
        "ai_summary": ai_summary,
    })


@session_bp.route("/session/<session_id>/members", methods=["GET"])
@jwt_required
def session_members(session_id):
    """List members in a session."""
    members = get_session_members(session_id)
    if not any(m["user_name"] == g.current_user.get("name") for m in members):
        return jsonify({"error": "Session not found"}), 404
    return jsonify({
        "session_id": session_id,
        "members": [
            {"user": m["user_name"], "role": m.get("role", "member"),
             "keystrokes": m.get("keystrokes", 0) or 0,
             "activity": m.get("activity", "idle") or "idle"}
            for m in members
        ],
    })


@session_bp.route("/sessions", methods=["GET"])
@roles_required("professor")
def list_sessions():
    """List sessions owned by the signed-in professor."""
    sessions = get_all_sessions(g.current_user.get("name"))
    return jsonify({"sessions": sessions})


@session_bp.route("/sessions/open", methods=["GET"])
@roles_required("student")
def open_sessions():
    return jsonify({"sessions": list_open_exams()})


@session_bp.route("/session/<session_id>/questions", methods=["GET"])
@jwt_required
def questions(session_id):
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Exam not found"}), 404
    current_name = g.current_user.get("name")
    is_owner = session.get("created_by") == current_name and g.current_user.get("role") == "professor"
    is_member = any(member["user_name"] == current_name for member in get_session_members(session_id))
    if not is_owner and not is_member:
        return jsonify({"error": "Join the exam before reading its questions"}), 403
    items = list_exam_questions(session_id)
    return jsonify({"session_id": session_id, "questions": items})


@session_bp.route("/session/<session_id>/start", methods=["POST"])
@roles_required("professor")
def start(session_id):
    if not start_session(session_id, g.current_user.get("name", "")):
        return jsonify({"error": "Only the owner can open an exam, and it must have questions"}), 403
    return jsonify({"session_id": session_id, "status": "open"})


@session_bp.route("/session/<session_id>/close", methods=["POST"])
@roles_required("professor")
def close(session_id):
    if not close_session(session_id, g.current_user.get("name", "")):
        return jsonify({"error": "Only the owner can close an open exam"}), 403
    return jsonify({"session_id": session_id, "status": "closed"})


@session_bp.route("/session/<session_id>/leaderboard", methods=["GET"])
@jwt_required
def leaderboard(session_id):
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Exam not found"}), 404
    if not any(member["user_name"] == g.current_user.get("name") for member in get_session_members(session_id)):
        return jsonify({"error": "Join the exam to view the leaderboard"}), 403
    return jsonify({"session_id": session_id, "leaderboard": get_exam_leaderboard(session_id)})


@session_bp.route("/session/<session_id>/question/<question_id>/run", methods=["POST"])
@roles_required("student")
def run_question(session_id, question_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Request body required"}), 400
    code = data.get("code")
    language_id = data.get("language_id", 71)
    submit = data.get("submit", True)
    if not isinstance(submit, bool):
        return jsonify({"error": "submit must be a boolean"}), 400
    if not isinstance(code, str) or not code.strip():
        return jsonify({"error": "Code cannot be empty"}), 400
    if len(code.encode("utf-8")) > MAX_SOURCE_BYTES:
        return jsonify({"error": "Code is too large (maximum 64 KiB)"}), 413
    if isinstance(language_id, bool) or not isinstance(language_id, int) or language_id not in SUPPORTED_LANGUAGES:
        return jsonify({"error": "Unsupported language"}), 400

    session = get_session(session_id)
    if not session or session.get("status") != "open":
        return jsonify({"error": "Exam is not open"}), 404
    student_name = g.current_user.get("name", "")
    if not any(member["user_name"] == student_name for member in get_session_members(session_id)):
        return jsonify({"error": "Join the exam before submitting code"}), 403
    question = get_exam_question(question_id, session_id)
    if not question:
        return jsonify({"error": "Question not found"}), 404

    all_tests = question.get("test_cases", [])
    # Run-tests requests can exercise only professor-marked public cases.
    # Hidden cases run only when a student submits for a recorded grade.
    tests = all_tests if submit else [case for case in all_tests if not case.get("hidden", True)]
    if not tests:
        return jsonify({"error": "This question has no public test cases to run. Submit your solution when it is ready."}), 400
    results = []
    passed = 0
    for index, case in enumerate(tests, start=1):
        try:
            result = execute_code(code, language_id, case["stdin"], case["expected_output"])
        except ExecutionUnavailable as exc:
            return jsonify({"error": str(exc)}), 503
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        is_passed = result.get("status") == "Accepted"
        passed += int(is_passed)
        results.append({
            "case": index,
            "passed": is_passed,
            "status": result.get("status"),
            "error_type": result.get("error_type"),
            "stderr": result.get("stderr", "")[:4096],
        })

    total = len(tests)
    score = round(question["max_score"] * passed / total) if total and submit else None
    overall_status = "Accepted" if passed == total else "Partial" if passed else "Failed"
    visible_results = [result for result, case in zip(results, tests) if not case.get("hidden", True)]
    if submit:
        store_exam_submission(session_id, question_id, student_name, score, passed, total, overall_status)
    return jsonify({
        "status": overall_status,
        "score": score,
        "max_score": question["max_score"] if submit else None,
        "passed_tests": passed,
        "total_tests": total,
        "submitted": submit,
        # Show details only for public samples; hidden-case outcomes are reflected
        # in the aggregate score without exposing a per-case oracle.
        "test_results": visible_results,
        "leaderboard": get_exam_leaderboard(session_id),
    })
