"""Isolated source-code execution through a Judge0 sandbox.

There is deliberately no local interpreter fallback: application processes must
never execute student-controlled source code with their own operating-system
privileges.
"""

import requests
from config import Config

SUPPORTED_LANGUAGES = {50, 54, 62, 63, 71}
MAX_SOURCE_BYTES = 64 * 1024
MAX_STDOUT_BYTES = 32 * 1024
MAX_STDERR_BYTES = 32 * 1024
# Fixed execution envelope; clients cannot raise these values per submission.
EXECUTION_LIMITS = {
    "cpu_time_limit": 2,
    "cpu_extra_time": 0.5,
    "wall_time_limit": 5,
    "memory_limit": 128_000,
    "stack_limit": 64_000,
    "max_processes_and_or_threads": 20,
    "max_file_size": 1_024,
    "enable_network": False,
}


class ExecutionUnavailable(Exception):
    """The isolated execution provider is not configured or reachable."""


def execute_code(source_code: str, language_id: int = 71, stdin: str = "",
                 expected_output: str = None) -> dict:
    """Run code in Judge0 and normalize syntax, compile, and runtime errors."""
    if not isinstance(source_code, str) or not source_code.strip():
        raise ValueError("Code cannot be empty")
    if len(source_code.encode("utf-8")) > MAX_SOURCE_BYTES:
        raise ValueError("Code is too large (maximum 64 KiB)")
    if isinstance(language_id, bool) or language_id not in SUPPORTED_LANGUAGES:
        raise ValueError("Unsupported language")
    if not isinstance(stdin, str) or len(stdin.encode("utf-8")) > 10_000:
        raise ValueError("Program input is too large")
    if expected_output is not None and (not isinstance(expected_output, str) or len(expected_output.encode("utf-8")) > 10_000):
        raise ValueError("Expected output is too large")

    base_url = Config.JUDGE0_URL.rstrip("/")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if Config.JUDGE0_AUTH_HEADER and Config.JUDGE0_AUTH_TOKEN:
        headers[Config.JUDGE0_AUTH_HEADER] = Config.JUDGE0_AUTH_TOKEN
    if "rapidapi.com" in base_url:
        if not Config.JUDGE0_API_KEY:
            raise ExecutionUnavailable("Isolated code runner is not configured")
        headers.update({
            "X-RapidAPI-Key": Config.JUDGE0_API_KEY,
            "X-RapidAPI-Host": Config.JUDGE0_HOST,
        })

    try:
        response = requests.post(
            f"{base_url}/submissions?wait=true&base64_encoded=false",
            json={"source_code": source_code, "language_id": language_id, "stdin": stdin,
                  "expected_output": expected_output, **EXECUTION_LIMITS},
            headers=headers,
            timeout=(3, 20),
        )
    except requests.Timeout as exc:
        raise ExecutionUnavailable("Code execution service timed out") from exc
    except requests.RequestException as exc:
        raise ExecutionUnavailable("Code execution service is unavailable") from exc

    if response.status_code not in {200, 201}:
        # Do not return provider response bodies or credentials to the browser.
        raise ExecutionUnavailable(f"Code execution service returned HTTP {response.status_code}")
    try:
        result = response.json()
    except ValueError as exc:
        raise ExecutionUnavailable("Code execution service returned an invalid response") from exc

    if not isinstance(result, dict):
        raise ExecutionUnavailable("Code execution service returned an invalid response")
    status_data = result.get("status") or {}
    status = status_data.get("description", "Unknown") if isinstance(status_data, dict) else "Unknown"
    stdout = result.get("stdout") or ""
    stderr = result.get("stderr") or result.get("compile_output") or ""
    if not isinstance(stdout, str):
        stdout = str(stdout)
    if not isinstance(stderr, str):
        stderr = str(stderr)
    if status == "Compilation Error" and not stderr:
        stderr = "Compilation failed. Check the compiler output and source syntax."
    elif status == "Runtime Error" and not stderr:
        stderr = "The program stopped with a runtime error."
    elif status == "Time Limit Exceeded" and not stderr:
        stderr = "The program exceeded the execution time limit."

    return {
        "stdout": stdout[:MAX_STDOUT_BYTES],
        "stderr": stderr[:MAX_STDERR_BYTES],
        "status": status,
        "time": result.get("time") or "0",
        "memory": str(result.get("memory") or 0),
        "error_type": _error_type(status, stderr),
        "truncated": len(stdout) > MAX_STDOUT_BYTES or len(stderr) > MAX_STDERR_BYTES,
    }


def _error_type(status: str, stderr: str = "") -> str | None:
    normalized = status.lower()
    error_text = stderr.lower()
    if any(marker in error_text for marker in ("syntaxerror", "indentationerror", "invalid syntax")):
        return "syntax"
    if "compilation" in normalized:
        return "compile"
    if "runtime" in normalized:
        for error_name in ("nameerror", "typeerror", "valueerror", "indexerror", "keyerror", "zerodivisionerror"):
            if error_name in error_text:
                return error_name.removesuffix("error")
        return "runtime"
    if "time limit" in normalized:
        return "timeout"
    if "memory limit" in normalized:
        return "memory"
    if status == "Accepted":
        return None
    return "execution" if status != "Unknown" else "unknown"
