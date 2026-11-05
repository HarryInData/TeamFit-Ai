"""Execute student submissions in short-lived Render microVM sandboxes."""

import os
import logging
import re
import shlex
import tempfile
import time
from pathlib import Path

from config import Config

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {50, 54, 62, 63, 71}
MAX_SOURCE_BYTES = 64 * 1024
MAX_STDOUT_BYTES = 32 * 1024
MAX_STDERR_BYTES = 32 * 1024
MAX_STDIN_BYTES = 10_000
SANDBOX_LIFETIME_SECONDS = 300
SANDBOX_STARTUP_SECONDS = 60
COMMAND_TIMEOUT_SECONDS = 12

LANGUAGE_RUNNERS = {
    50: ("c", "gcc /tmp/teamfit/main.c -o /tmp/teamfit/main && /tmp/teamfit/main"),
    54: ("cpp", "g++ -std=c++17 /tmp/teamfit/main.cpp -o /tmp/teamfit/main && /tmp/teamfit/main"),
    62: ("java", "javac /tmp/teamfit/Main.java && java -Xmx256m -cp /tmp/teamfit Main"),
    63: ("js", "node --max-old-space-size=256 /tmp/teamfit/main.js"),
    71: ("py", "python3 /tmp/teamfit/main.py"),
}


class ExecutionUnavailable(Exception):
    """Render Sandboxes is missing configuration or could not execute a run."""


def execute_code(source_code: str, language_id: int = 71, stdin: str = "",
                 expected_output: str = None) -> dict:
    """Run one submission and normalize its output to the existing API shape."""
    return execute_code_cases(source_code, language_id, [(stdin, expected_output)])[0]


def execute_code_cases(source_code: str, language_id: int, cases: list[tuple[str, str]]) -> list[dict]:
    """Run all test cases in one disposable microVM, then always terminate it."""
    _validate_request(source_code, language_id, cases)
    if not Config.RENDER_API_KEY or not Config.RENDER_WORKSPACE_ID:
        raise ExecutionUnavailable(
            "Render sandbox execution is not configured. Set RENDER_API_KEY and RENDER_WORKSPACE_ID on the backend."
        )

    try:
        from render import Render
        from render.sandbox import SandboxExecExit, SandboxExecOutput
    except ImportError as exc:
        raise ExecutionUnavailable("Render sandbox SDK is not installed on the backend") from exc

    extension, run_command = LANGUAGE_RUNNERS[language_id]
    try:
        return _execute_with_render(
            Render(token=Config.RENDER_API_KEY, owner_id=Config.RENDER_WORKSPACE_ID).sandboxes,
            SandboxExecExit,
            SandboxExecOutput,
            source_code,
            extension,
            run_command,
            cases,
        )
    except ExecutionUnavailable:
        raise
    except Exception as exc:
        # Provider errors can contain request details; do not expose them to students.
        raise ExecutionUnavailable("Render sandbox execution failed or timed out. Please try again.") from exc


def _execute_with_render(sandboxes, exit_type, output_type, source_code,
                         extension, run_command, cases):
    source_code = _java_source_filename(source_code, extension)
    sandbox = None
    results = []
    try:
        create_options = {
            "timeout_seconds": SANDBOX_LIFETIME_SECONDS,
            "idle_timeout_seconds": 300,
            "network_policy": "deny-all",
            "wait": False,
        }
        if Config.RENDER_SANDBOX_GROUP_ID:
            create_options["sandbox_group_id"] = Config.RENDER_SANDBOX_GROUP_ID
        if Config.RENDER_SANDBOX_SNAPSHOT_ID:
            create_options["snapshot_id"] = Config.RENDER_SANDBOX_SNAPSHOT_ID
        sandbox = sandboxes.create(
            **create_options,
        )
        sandboxes.wait_until_running(sandbox.id, timeout_seconds=SANDBOX_STARTUP_SECONDS, interval_seconds=0.5)
        _run_command(sandboxes, sandbox.id, "mkdir -p /tmp/teamfit", exit_type, output_type)
        source_path = Path(tempfile.gettempdir()) / f"teamfit-main-{os.getpid()}-{time.time_ns()}.{extension}"
        try:
            source_path.write_text(source_code, encoding="utf-8")
            sandboxes.copy_to(sandbox.id, str(source_path), f"/tmp/teamfit/main.{extension}")
        finally:
            source_path.unlink(missing_ok=True)

        for index, (stdin, expected_output) in enumerate(cases):
            input_path = Path(tempfile.gettempdir()) / f"teamfit-input-{os.getpid()}-{time.time_ns()}-{index}"
            try:
                input_path.write_text(stdin, encoding="utf-8")
                sandboxes.copy_to(sandbox.id, str(input_path), "/tmp/teamfit/input.txt")
            finally:
                input_path.unlink(missing_ok=True)

            command = _build_guest_command(run_command)
            started_at = time.monotonic()
            stdout, stderr, exit_code = _run_command(sandboxes, sandbox.id, command, exit_type, output_type)
            elapsed = time.monotonic() - started_at
            if exit_code is None:
                raise ExecutionUnavailable("Render sandbox ended without returning an exit status")

            stdout = _remove_exit_marker(stdout)
            status = _status_for(exit_code, stdout, stderr, expected_output, extension)
            results.append(_result(stdout, stderr, status, elapsed))
    finally:
        if sandbox is not None:
            try:
                sandboxes.terminate(sandbox.id)
            except Exception as exc:
                # The runtime timeout is a backstop if cleanup cannot be confirmed.
                logger.warning("Render sandbox cleanup was not confirmed for %s (%s)",
                               sandbox.id, type(exc).__name__)
    return results


def _run_command(sandboxes, sandbox_id, command, exit_type, output_type):
    stdout_parts, stderr_parts, exit_code = [], [], None
    stdout_size = stderr_size = 0
    for event in sandboxes.exec(sandbox_id, command):
        if isinstance(event, output_type):
            target = stderr_parts if event.stream == "stderr" else stdout_parts
            if event.stream == "stderr":
                remaining = MAX_STDERR_BYTES + 1 - stderr_size
                stderr_size += len(event.data.encode("utf-8", errors="replace"))
            else:
                remaining = MAX_STDOUT_BYTES + 1 - stdout_size
                stdout_size += len(event.data.encode("utf-8", errors="replace"))
            if remaining > 0:
                target.append(event.data[:remaining])
        elif isinstance(event, exit_type):
            exit_code = event.exit_code
    return "".join(stdout_parts), "".join(stderr_parts), exit_code


def _build_guest_command(run_command: str) -> str:
    # Source and input are copied as files, never interpolated into shell text.
    # Restrict resources and bound the whole compile/run command inside the guest.
    inner = (
        "mkdir -p /tmp/teamfit; cd /tmp/teamfit; "
        "ulimit -t 8; ulimit -u 64; ulimit -f 128; "
        ": > /tmp/teamfit/stdout.txt; : > /tmp/teamfit/stderr.txt; "
        f"if ! command -v {shlex.split(run_command)[0]} >/dev/null 2>&1; then "
        "echo 'Required language runtime is not installed in the Render sandbox image.' >&2; "
        "exit 125; fi; "
        f"{run_command} < /tmp/teamfit/input.txt > /tmp/teamfit/stdout.txt 2> /tmp/teamfit/stderr.txt; "
        "run_status=$?; "
        "head -c 32769 /tmp/teamfit/stdout.txt; "
        "head -c 32769 /tmp/teamfit/stderr.txt >&2; "
        "printf '\\n__TEAMFIT_EXIT__%s\\n' \"$run_status\""
    )
    return f"timeout -k 1 {COMMAND_TIMEOUT_SECONDS} bash -c {shlex.quote(inner)}"


def _java_source_filename(source_code: str, extension: str) -> str:
    if extension != "java":
        return source_code
    # The editor starter code and Java judge contract use a Main entry point.
    if re.search(r"\bpublic\s+class\s+(?!Main\b)[A-Za-z_$][\w$]*", source_code):
        raise ValueError("Java submissions must declare the public class Main")
    return source_code


def _remove_exit_marker(stdout: str) -> str:
    return re.sub(r"\n?__TEAMFIT_EXIT__-?\d+\n?$", "", stdout)


def _status_for(exit_code: int, stdout: str, stderr: str, expected_output: str | None,
                extension: str) -> str:
    if exit_code == 124 or exit_code == 137:
        return "Time Limit Exceeded"
    if exit_code == 125:
        return "Runtime Error"
    if exit_code != 0:
        compiler_error_markers = {"c": "main.c:", "cpp": "main.cpp:", "java": ".java:"}
        if "error:" in stderr.lower() and compiler_error_markers.get(extension, "\0") in stderr.lower():
            return "Compilation Error"
        return "Runtime Error"
    if expected_output is not None and _normalize_output(stdout) != _normalize_output(expected_output):
        return "Wrong Answer"
    return "Accepted"


def _normalize_output(value: str) -> str:
    return "\n".join(line.rstrip() for line in value.strip().splitlines())


def _result(stdout: str, stderr: str, status: str, elapsed: float) -> dict:
    stdout_bytes, stderr_bytes = stdout.encode("utf-8", errors="replace"), stderr.encode("utf-8", errors="replace")
    stdout = stdout_bytes[:MAX_STDOUT_BYTES].decode("utf-8", errors="ignore")
    stderr = stderr_bytes[:MAX_STDERR_BYTES].decode("utf-8", errors="ignore")
    return {
        "stdout": stdout,
        "stderr": stderr,
        "status": status,
        "time": f"{elapsed:.3f}",
        "memory": "",
        "error_type": _error_type(status, stderr),
        "truncated": len(stdout_bytes) > MAX_STDOUT_BYTES or len(stderr_bytes) > MAX_STDERR_BYTES,
    }


def _error_type(status: str, stderr: str = "") -> str | None:
    normalized, error_text = status.lower(), stderr.lower()
    if any(marker in error_text for marker in ("syntaxerror", "indentationerror", "invalid syntax")):
        return "syntax"
    if "compilation" in normalized:
        return "compile"
    if "runtime" in normalized:
        for name in ("nameerror", "typeerror", "valueerror", "indexerror", "keyerror", "zerodivisionerror"):
            if name in error_text:
                return name.removesuffix("error")
        return "runtime"
    if "time limit" in normalized:
        return "timeout"
    if status == "Wrong Answer":
        return "wrong_answer"
    if status == "Accepted":
        return None
    return "execution" if status != "Unknown" else "unknown"


def _validate_request(source_code: str, language_id: int, cases: list[tuple[str, str]]) -> None:
    if not isinstance(source_code, str) or not source_code.strip():
        raise ValueError("Code cannot be empty")
    if len(source_code.encode("utf-8")) > MAX_SOURCE_BYTES:
        raise ValueError("Code is too large (maximum 64 KiB)")
    if isinstance(language_id, bool) or language_id not in SUPPORTED_LANGUAGES:
        raise ValueError("Unsupported language")
    if not cases or len(cases) > 50:
        raise ValueError("Invalid test case count")
    for stdin, expected_output in cases:
        if not isinstance(stdin, str) or len(stdin.encode("utf-8")) > MAX_STDIN_BYTES:
            raise ValueError("Program input is too large")
        if expected_output is not None and (not isinstance(expected_output, str)
                                            or len(expected_output.encode("utf-8")) > MAX_STDIN_BYTES):
            raise ValueError("Expected output is too large")
