import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import Config
from services.judge0 import ExecutionUnavailable, execute_code


class Judge0SandboxTests(unittest.TestCase):
    def setUp(self):
        self.original = (Config.JUDGE0_URL, Config.JUDGE0_API_KEY, Config.JUDGE0_AUTH_HEADER, Config.JUDGE0_AUTH_TOKEN)

    def tearDown(self):
        Config.JUDGE0_URL, Config.JUDGE0_API_KEY, Config.JUDGE0_AUTH_HEADER, Config.JUDGE0_AUTH_TOKEN = self.original

    def test_cloud_runner_requires_api_key(self):
        Config.JUDGE0_URL = "https://judge0-ce.p.rapidapi.com"
        Config.JUDGE0_API_KEY = ""
        with self.assertRaises(ExecutionUnavailable):
            execute_code("print('safe')", 71)

    @patch("services.judge0.requests.post")
    def test_compilation_error_is_reported_as_compile_error(self, post):
        Config.JUDGE0_URL = "http://judge0.test"
        post.return_value = Mock(status_code=201, json=lambda: {
            "status": {"description": "Compilation Error"},
            "compile_output": "main.c:1: error: expected expression",
        })
        result = execute_code("int main( {", 50)
        self.assertEqual(result["error_type"], "compile")
        self.assertIn("expected expression", result["stderr"])

    @patch("services.judge0.requests.post")
    def test_python_syntax_error_is_classified(self, post):
        Config.JUDGE0_URL = "http://judge0.test"
        post.return_value = Mock(status_code=200, json=lambda: {
            "status": {"description": "Runtime Error"},
            "stderr": "SyntaxError: invalid syntax",
        })
        self.assertEqual(execute_code("if True print('bad')", 71)["error_type"], "syntax")

    def test_invalid_language_and_large_code_are_rejected_before_submission(self):
        with self.assertRaises(ValueError):
            execute_code("print('ok')", 999)
        with self.assertRaises(ValueError):
            execute_code("x" * (64 * 1024 + 1), 71)

    @patch("services.judge0.requests.post")
    def test_authorization_header_is_sent_to_self_hosted_runner(self, post):
        Config.JUDGE0_URL = "https://judge0.internal"
        Config.JUDGE0_AUTH_HEADER = "X-Auth-User"
        Config.JUDGE0_AUTH_TOKEN = "secret-test-token"
        post.return_value = Mock(status_code=201, json=lambda: {
            "status": {"description": "Accepted"}, "stdout": "42\n",
        })
        result = execute_code("print(42)", 71)
        self.assertEqual(result["stdout"], "42\n")
        self.assertEqual(post.call_args.kwargs["headers"]["X-Auth-User"], "secret-test-token")

    @patch("services.judge0.requests.post")
    def test_submissions_have_resource_limits_and_network_disabled(self, post):
        Config.JUDGE0_URL = "http://judge0.test"
        post.return_value = Mock(status_code=201, json=lambda: {"status": {"description": "Accepted"}})
        execute_code("print(1)", 71)
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["cpu_time_limit"], 2)
        self.assertEqual(payload["wall_time_limit"], 5)
        self.assertEqual(payload["memory_limit"], 128_000)
        self.assertEqual(payload["max_processes_and_or_threads"], 20)
        self.assertFalse(payload["enable_network"])


if __name__ == "__main__":
    unittest.main()
