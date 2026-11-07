"""Isolated source-code execution through a self-hosted Piston sandbox.

There is deliberately no local interpreter fallback: application processes must
never execute student-controlled source code with their own operating-system
privileges.
"""

import re
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

    error_type, error_summary = _error_details(status, stderr)
    return {
        "stdout": stdout[:MAX_STDOUT_BYTES],
        "stderr": stderr[:MAX_STDERR_BYTES],
        "status": status,
        "language": language,
        "time": str((run_result.get("cpu_time") or 0) / 1000),
        "memory": str(round((run_result.get("memory") or 0) / 1024)),
        "error_type": error_type,
        "error_summary": error_summary,
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
            result["error_type"], result["error_summary"] = _error_details("Wrong Answer")
        results.append(result)
    return results


_ERROR_PATTERNS = (
    ("syntax", (
        r"syntaxerror", r"indentationerror", r"invalid syntax", r"syntax error",
        r"unexpected token", r"unexpected identifier", r"unexpected end of file",
        r"expected (?:expression|primary-expression|';'|token)", r"expected ';'", r"['\"]?;['\"]? expected",
        r"illegal start of (?:expression|type)", r"reached end of file while parsing", r"unclosed (?:parenthesis|bracket|brace)",
        r"no viable alternative", r"missing ['\"].*?['\"] at",
    )),
    ("name", (
        r"nameerror", r"referenceerror", r"cannot find symbol", r"undeclared identifier",
        r"was not declared in this scope", r"not defined", r"no member named",
    )),
    ("type", (
        r"typeerror", r"incompatible types", r"type mismatch", r"cannot be converted to",
        r"no suitable method", r"no matching function",
    )),
    ("link", (r"undefined reference", r"undefined symbol", r"multiple definition", r"linker command failed")),
    ("index", (r"indexerror", r"index out of bounds", r"arrayindexoutofboundsexception", r"out of range")),
    ("key", (r"keyerror",)),
    ("value", (r"valueerror", r"numberformatexception", r"invalid literal for", r"format specifier")),
    ("null_reference", (r"nullpointerexception", r"cannot read (?:properties|property) of null", r"undefined is not an object")),
    ("division_by_zero", (r"zerodivisionerror", r"division by zero", r"arithmeticexception")),
    ("memory", (r"outofmemoryerror", r"memoryerror", r"std::bad_alloc", r"cannot allocate memory", r"memory limit exceeded")),
    ("memory_access", (r"segmentation fault", r"sigsegv", r"access violation", r"bus error")),
    ("arithmetic", (r"floating point exception", r"arithmetic overflow", r"overflowerror")),
    ("assertion", (r"assertionerror", r"assertion failed", r"assertion .* failed")),
)

_ERROR_SUMMARIES = {
    "syntax": "The code has a syntax or parsing error. Check the indicated line and nearby punctuation.",
    "name": "A variable, function, or symbol could not be found. Check its name and scope.",
    "type": "The code uses an incompatible value or function type. Check the types in the diagnostic.",
    "link": "Compilation reached the linker, but a required symbol or definition is missing or duplicated.",
    "index": "The code accessed an index outside the available sequence or array bounds.",
    "key": "The code requested a key that is not present in the map or dictionary.",
    "value": "A value could not be parsed or used in the requested format.",
    "null_reference": "The code tried to access a member through a null or undefined value.",
    "division_by_zero": "The code attempted to divide by zero.",
    "memory": "The program exceeded its available memory.",
    "memory_access": "The program accessed invalid memory. Check pointer and array bounds.",
    "arithmetic": "The program encountered an invalid arithmetic operation or overflow.",
    "assertion": "An assertion failed while the program was running.",
    "compile": "The compiler rejected the program. See the compiler diagnostic for details.",
    "runtime": "The program stopped with a runtime error. See the diagnostic for details.",
    "timeout": "The program exceeded the execution time limit.",
    "output_limit": "The program produced more output than the sandbox allows.",
    "wrong_answer": "The program ran, but its output did not match the expected output.",
    "internal": "The isolated execution service encountered an internal error.",
}


def _error_details(status: str, stderr: str = "") -> tuple[str | None, str | None]:
    """Classify common diagnostics across Python, JS, C/C++, and Java."""
    normalized = (status or "").lower()
    error_text = (stderr or "").lower()
    if normalized == "accepted":
        return None, None
    if "wrong answer" in normalized:
        error_type = "wrong_answer"
    elif "time limit" in normalized or normalized == "timeout":
        error_type = "timeout"
    elif "output limit" in normalized:
        error_type = "output_limit"
    elif "memory limit" in normalized:
        error_type = "memory"
    elif "internal error" in normalized:
        error_type = "internal"
    else:
        error_type = next((kind for kind, patterns in _ERROR_PATTERNS
                           if any(re.search(pattern, error_text) for pattern in patterns)), None)
        if error_type is None:
            if "compilation" in normalized:
                error_type = "compile"
            elif "runtime" in normalized:
                error_type = "runtime"
            else:
                error_type = "execution" if normalized not in ("", "unknown") else "unknown"

    summary = _ERROR_SUMMARIES.get(error_type)
    if error_type in {"compile", "execution", "unknown"} and not summary:
        summary = "Execution did not complete successfully. See the diagnostic output for details."
    return error_type, summary


def _error_type(status: str, stderr: str = "") -> str | None:
    """Backward-compatible classifier used by existing callers."""
    return _error_details(status, stderr)[0]
