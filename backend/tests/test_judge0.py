import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import Config
from services.judge0 import ExecutionUnavailable, execute_code, execute_code_cases


class PistonSandboxTests(unittest.TestCase):
    def setUp(self):
        self.original = (Config.PISTON_URL, Config.PISTON_AUTH_HEADER, Config.PISTON_AUTH_TOKEN)

    def tearDown(self):
        Config.PISTON_URL, Config.PISTON_AUTH_HEADER, Config.PISTON_AUTH_TOKEN = self.original

    @patch("services.judge0.requests.post")
    def test_compilation_error_is_classified_when_diagnostic_matches(self, post):
        Config.PISTON_URL = "http://piston.test"
        post.return_value = Mock(status_code=200, json=lambda: {
            "compile": {"code": 1, "stderr": "main.c:1: error: expected expression"},
        })
        result = execute_code("int main( {", 50)
        self.assertEqual(result["error_type"], "syntax")
        self.assertIn("expected expression", result["stderr"])

    @patch("services.judge0.requests.post")
    def test_python_syntax_error_is_classified(self, post):
        Config.PISTON_URL = "http://piston.test"
        post.return_value = Mock(status_code=200, json=lambda: {
            "run": {"code": 1, "stderr": "SyntaxError: invalid syntax"},
        })
        self.assertEqual(execute_code("if True print('bad')", 71)["error_type"], "syntax")

    def test_invalid_language_and_large_code_are_rejected_before_submission(self):
        with self.assertRaises(ValueError):
            execute_code("print('ok')", 999)
        with self.assertRaises(ValueError):
            execute_code("x" * (64 * 1024 + 1), 71)

    @patch("services.judge0.requests.post")
    def test_authorization_header_is_sent_to_self_hosted_runner(self, post):
        Config.PISTON_URL = "https://piston.internal"
        Config.PISTON_AUTH_HEADER = "X-Auth-User"
        Config.PISTON_AUTH_TOKEN = "secret-test-token"
        post.return_value = Mock(status_code=200, json=lambda: {
            "run": {"code": 0, "stdout": "42\n"},
        })
        result = execute_code("print(42)", 71)
        self.assertEqual(result["stdout"], "42\n")
        self.assertEqual(post.call_args.kwargs["headers"]["X-Auth-User"], "secret-test-token")

    @patch("services.judge0.requests.post")
    def test_submissions_have_fixed_resource_limits(self, post):
        Config.PISTON_URL = "http://piston.test"
        post.return_value = Mock(status_code=200, json=lambda: {"run": {"code": 0}})
        execute_code("print(1)", 71)
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["run_cpu_time"], 5_000)
        self.assertEqual(payload["run_timeout"], 5_000)
        self.assertEqual(payload["run_memory_limit"], 128 * 1024 * 1024)
        self.assertEqual(payload["language"], "python")
        self.assertEqual(payload["version"], "3.12.0")
        self.assertEqual(post.call_args.args[0], "http://piston.test/api/v2/execute")

    @patch("services.judge0.requests.post")
    def test_successful_process_with_wrong_stdout_is_not_accepted(self, post):
        Config.PISTON_URL = "http://piston.test"
        post.return_value = Mock(status_code=200, json=lambda: {
            "run": {"code": 0, "stdout": "4  ", "stderr": ""},
        })
        result = execute_code_cases("print(4)", 71, [("", "5\n")])[0]
        self.assertEqual(result["status"], "Wrong Answer")
        self.assertEqual(result["error_type"], "wrong_answer")


if __name__ == "__main__":
    unittest.main()
