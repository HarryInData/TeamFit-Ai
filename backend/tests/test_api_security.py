import sys
import unittest
import uuid
import tempfile
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from config import Config
from middleware.auth import create_token, decode_token
from models import database


class ApiSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._original_sqlite_path = database._SQLITE_PATH
        cls._test_database_dir = tempfile.TemporaryDirectory(prefix="teamfit-api-tests-")
        database._SQLITE_PATH = str(Path(cls._test_database_dir.name) / "teamfit-test.db")
        cls.app = create_app()
        cls.app.config.update(TESTING=True)
        cls.client = cls.app.test_client()

    @classmethod
    def tearDownClass(cls):
        database._SQLITE_PATH = cls._original_sqlite_path
        cls._test_database_dir.cleanup()

    def test_private_api_rejects_anonymous_requests(self):
        self.assertEqual(self.client.get("/api/dashboard").status_code, 401)
        self.assertEqual(self.client.get("/api/students").status_code, 401)
        self.assertEqual(self.client.post("/api/execute", json={"code": "print(1)"}).status_code, 401)

    def test_registration_hashes_password_and_student_cannot_read_professor_data(self):
        email = f"test-{uuid.uuid4()}@example.test"
        result = self.client.post("/api/auth/register", json={
            "name": f"Student {uuid.uuid4().hex[:8]}",
            "email": email,
            "password": "a-strong-test-password",
            "role": "student",
        })
        self.assertEqual(result.status_code, 201)
        self.assertNotIn("password", result.json["user"])
        token = result.json["token"]
        headers = {"Authorization": f"Bearer {token}"}
        self.assertEqual(self.client.get("/api/dashboard", headers=headers).status_code, 403)
        self.assertEqual(self.client.get("/api/students", headers=headers).status_code, 403)

    def test_execution_fails_closed_without_isolated_runner(self):
        user = {"id": "student-1", "name": "Sandbox Tester", "email": "sandbox@example.test", "role": "student"}
        response = self.client.post("/api/execute", json={"code": "print(1)", "language_id": 71},
                                    headers={"Authorization": f"Bearer {create_token(user)}"})
        self.assertEqual(response.status_code, 503)
        self.assertIn("isolated code runner", response.json["error"].lower())

    def test_execution_success_is_not_reported_as_a_grade(self):
        user = {"id": "student-2", "name": "Runner Tester", "email": "runner@example.test", "role": "student"}
        with patch("routes.execute.execute_code", return_value={"status": "Accepted", "stdout": "ok"}):
            response = self.client.post("/api/execute", json={"code": "print('ok')", "language_id": 71},
                                        headers={"Authorization": f"Bearer {create_token(user)}"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["status"], "Accepted")
        self.assertNotIn("score", response.json)

    def test_activity_is_scoped_to_a_session_and_requires_membership(self):
        name = f"Session Tester {uuid.uuid4().hex[:8]}"
        student = {"id": str(uuid.uuid4()), "name": name, "email": f"{uuid.uuid4()}@example.test", "role": "student"}
        professor = {"id": str(uuid.uuid4()), "name": "Exam Professor", "email": f"{uuid.uuid4()}@example.test", "role": "professor"}
        headers = {"Authorization": f"Bearer {create_token(student)}"}
        professor_headers = {"Authorization": f"Bearer {create_token(professor)}"}
        question = {"title": "Add numbers", "statement": "Read two integers and print their sum.",
                    "examples": [{"input": "2 3", "output": "5"}],
                    "test_cases": [{"stdin": "2 3", "expected_output": "5", "hidden": True}],
                    "starter_code": "", "max_score": 100}
        created = self.client.post("/api/session/create", json={"title": "Scoped activity", "questions": [question]}, headers=professor_headers)
        self.assertEqual(created.status_code, 201)
        session_id = created.json["session_id"]
        self.assertEqual(created.json["status"], "draft")
        self.assertEqual(self.client.post(f"/api/session/{session_id}/start", headers=professor_headers).status_code, 200)
        self.assertEqual(self.client.post("/api/session/join", json={"join_code": created.json["join_code"]}, headers=headers).status_code, 200)

        activity = self.client.post("/api/students", json={
            "session_id": session_id, "keystrokes": 12, "activity": "typing",
        }, headers=headers)
        self.assertEqual(activity.status_code, 200)
        members = self.client.get(f"/api/session/{session_id}/members", headers=headers)
        self.assertEqual(members.status_code, 200)
        student_member = next(member for member in members.json["members"] if member["user"] == name)
        self.assertEqual(student_member["keystrokes"], 12)

        outsider = {"id": str(uuid.uuid4()), "name": "Outsider", "email": f"{uuid.uuid4()}@example.test", "role": "student"}
        denied = self.client.post("/api/students", json={
            "session_id": session_id, "keystrokes": 1, "activity": "typing",
        }, headers={"Authorization": f"Bearer {create_token(outsider)}"})
        self.assertEqual(denied.status_code, 403)

        question_result = self.client.get(f"/api/session/{session_id}/questions", headers=headers)
        self.assertEqual(question_result.status_code, 200)
        self.assertEqual(question_result.json["questions"][0]["statement"], question["statement"])
        self.assertNotIn("test_cases", question_result.json["questions"][0])
        question_id = question_result.json["questions"][0]["id"]
        with patch("routes.session.execute_code", return_value={"status": "Accepted", "stdout": "5\n", "stderr": ""}):
            submission = self.client.post(
                f"/api/session/{session_id}/question/{question_id}/run",
                json={"code": "print(2 + 3)", "language_id": 71}, headers=headers,
            )
        self.assertEqual(submission.status_code, 200)
        self.assertEqual(submission.json["score"], 100)
        self.assertEqual(submission.json["passed_tests"], 1)
        closed = self.client.post(f"/api/session/{session_id}/close", headers=professor_headers)
        self.assertEqual(closed.status_code, 200)
        self.assertEqual(closed.json["status"], "closed")
        self.assertEqual(self.client.post("/api/session/join", json={"session_id": session_id}, headers=headers).status_code, 404)

    def test_only_professor_can_create_exam_with_questions(self):
        student = {"id": "student-create", "name": "Student Creator", "email": "creator@example.test", "role": "student"}
        response = self.client.post("/api/session/create", json={"title": "Blocked", "questions": []},
                                    headers={"Authorization": f"Bearer {create_token(student)}"})
        self.assertEqual(response.status_code, 403)

    def test_self_registration_cannot_create_professors_and_google_has_no_mock_bypass(self):
        result = self.client.post("/api/auth/register", json={
            "name": "Attempted Professor", "email": f"{uuid.uuid4()}@example.test",
            "password": "a-strong-test-password", "role": "professor",
        })
        self.assertEqual(result.status_code, 403)
        google_result = self.client.post("/api/auth/google", json={"role": "professor"})
        self.assertIn(google_result.status_code, (400, 401))

    def test_tokens_expire(self):
        old_ttl = Config.TOKEN_TTL_SECONDS
        try:
            Config.TOKEN_TTL_SECONDS = -1
            token = create_token({"id": "u1", "name": "A", "email": "a@example.test", "role": "student"})
            self.assertIsNone(decode_token(token))
        finally:
            Config.TOKEN_TTL_SECONDS = old_ttl


if __name__ == "__main__":
    unittest.main()
