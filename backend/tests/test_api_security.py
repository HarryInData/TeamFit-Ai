import sys
import unittest
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from config import Config
from middleware.auth import create_token, decode_token


class ApiSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config.update(TESTING=True)
        cls.client = cls.app.test_client()

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

    def test_activity_is_scoped_to_a_session_and_requires_membership(self):
        name = f"Session Tester {uuid.uuid4().hex[:8]}"
        user = {"id": str(uuid.uuid4()), "name": name, "email": f"{uuid.uuid4()}@example.test", "role": "student"}
        headers = {"Authorization": f"Bearer {create_token(user)}"}
        created = self.client.post("/api/session/create", json={"title": "Scoped activity"}, headers=headers)
        self.assertEqual(created.status_code, 201)
        session_id = created.json["session_id"]

        activity = self.client.post("/api/students", json={
            "session_id": session_id, "keystrokes": 12, "activity": "typing",
        }, headers=headers)
        self.assertEqual(activity.status_code, 200)
        members = self.client.get(f"/api/session/{session_id}/members", headers=headers)
        self.assertEqual(members.status_code, 200)
        self.assertEqual(members.json["members"][0]["keystrokes"], 12)

        outsider = {"id": str(uuid.uuid4()), "name": "Outsider", "email": f"{uuid.uuid4()}@example.test", "role": "student"}
        denied = self.client.post("/api/students", json={
            "session_id": session_id, "keystrokes": 1, "activity": "typing",
        }, headers={"Authorization": f"Bearer {create_token(outsider)}"})
        self.assertEqual(denied.status_code, 403)

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
