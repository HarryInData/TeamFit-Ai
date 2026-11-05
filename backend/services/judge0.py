"""Isolated source-code execution through a self-hosted Piston sandbox.

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
class ExecutionUnavailable(Exception):
    """The isolated execution provider is not configured or reachable."""


def execute_code(source_code: str, language_id: int = 71, stdin: str = "",
                 expected_output: str = None) -> dict:
    """Run code in Piston and normalize syntax, compile, and runtime errors."""
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

    if not isinstance(Config.PISTON_URL, str) or not Config.PISTON_URL.strip():
        raise ExecutionUnavailable("Isolated code runner is not configured")
    base_url = Config.PISTON_URL.rstrip("/")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if Config.PISTON_AUTH_HEADER and Config.PISTON_AUTH_TOKEN:
        headers[Config.PISTON_AUTH_HEADER] = Config.PISTON_AUTH_TOKEN

    language, version, filename = {
        50: ("c", "10.2.0", "main.c"),
        54: ("c++", "10.2.0", "main.cpp"),
        62: ("java", "15.0.2", "Main.java"),
        63: ("javascript", "20.11.1", "main.js"),
        71: ("python", "3.12.0", "main.py"),
    }[language_id]
    payload = {
        "language": language,
        "version": version,
        "files": [{"name": filename, "content": source_code}],
        "stdin": stdin,
        "compile_timeout": 10_000,
        "run_timeout": 5_000,
        "compile_cpu_time": 10_000,
        "run_cpu_time": 5_000,
        "compile_memory_limit": 256 * 1024 * 1024,
        "run_memory_limit": 128 * 1024 * 1024,
    }

    try:
        response = requests.post(
            f"{base_url}/api/v2/execute",
            json=payload,
            headers=headers,
            timeout=(3, 20),
        )
    except requests.Timeout as exc:
        raise ExecutionUnavailable("Code execution service timed out") from exc
    except requests.RequestException as exc:
        raise ExecutionUnavailable("Code execution service is unavailable") from exc

    if response.status_code != 200:
        # Do not return provider response bodies or credentials to the browser.
        raise ExecutionUnavailable(f"Code execution service returned HTTP {response.status_code}")
    try:
        result = response.json()
    except ValueError as exc:
        raise ExecutionUnavailable("Code execution service returned an invalid response") from exc

    if not isinstance(result, dict):
        raise ExecutionUnavailable("Code execution service returned an invalid response")
    compile_result = result.get("compile") if isinstance(result.get("compile"), dict) else {}
    run_result = result.get("run") if isinstance(result.get("run"), dict) else {}
    stage = compile_result if compile_result and (compile_result.get("code") != 0 or compile_result.get("status")) else run_result
    stdout = run_result.get("stdout") or ""
    stderr = "\n".join(part for part in (
        compile_result.get("stderr") or "",
        run_result.get("stderr") or "",
        compile_result.get("message") or "",
        run_result.get("message") or "",
    ) if part)
    stage_status = stage.get("status")
    if compile_result and (compile_result.get("code") not in (None, 0) or stage_status):
        status = "Compilation Error"
    elif stage_status == "TO":
        status = "Time Limit Exceeded"
    elif stage_status in ("OL", "EL"):
        status = "Output Limit Exceeded"
    elif stage_status == "XX":
        status = "Internal Error"
    elif stage_status in ("RE", "SG") or run_result.get("code") not in (None, 0):
        status = "Runtime Error"
    else:
        status = "Accepted"
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
        "time": str((run_result.get("cpu_time") or 0) / 1000),
        "memory": str(round((run_result.get("memory") or 0) / 1024)),
        "error_type": _error_type(status, stderr),
        "truncated": len(stdout) > MAX_STDOUT_BYTES or len(stderr) > MAX_STDERR_BYTES,
    }


def execute_code_cases(source_code: str, language_id: int,
                       cases: list[tuple[str, str]]) -> list[dict]:
    """Run a bounded list of test cases through Piston's isolated workers."""
    if not isinstance(cases, list) or not cases:
        raise ValueError("At least one test case is required")
    if len(cases) > 50:
        raise ValueError("A maximum of 50 test cases can be run at once")
    results = []
    for stdin, expected_output in cases:
        result = execute_code(source_code, language_id, stdin, expected_output)
        if result["status"] == "Accepted" and result["stdout"].strip() != expected_output.strip():
            result["status"] = "Wrong Answer"
            result["error_type"] = "wrong_answer"
        results.append(result)
    return results


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
    if "output limit" in normalized:
        return "output_limit"
    if "memory limit" in normalized:
        return "memory"
    if status == "Accepted":
        return None
    return "execution" if status != "Unknown" else "unknown"
