# Render Sandbox code execution

Student code runs inside a disposable Render Sandbox microVM. The backend
uploads only the source file and current test input, denies sandbox outbound
network traffic, applies guest CPU, process, file-size, and wall-clock limits,
relies on the sandbox VM memory plan, returns bounded output, and terminates the
sandbox after the test run.
All test cases for one question run sequentially in the same temporary sandbox.

## Backend configuration

Add these environment variables to the Flask service on Render:

```text
RENDER_API_KEY=<Render API key>
RENDER_WORKSPACE_ID=<workspace ID that owns the sandboxes>
# Optional: pin creation to a prepared group and runtime snapshot
RENDER_SANDBOX_GROUP_ID=
RENDER_SANDBOX_SNAPSHOT_ID=
```

The API key must be created in Render Account Settings. Render currently does
not generally offer scoped sandbox API keys or credential brokering, so the
key may have broader workspace permissions than this feature needs. Keep it
only in the backend's secret environment variables. Never put it in Vercel,
frontend code, the sandbox environment, or chat. The backend should use a
dedicated Render workspace for this integration where practical.

No sandbox is created during deployment. Each authenticated execution creates
one sandbox, waits for it to start, runs all test cases for that question,
then terminates it. Sandboxes have a five-minute maximum lifetime as a cleanup
backstop. Render may charge for active sandbox CPU and memory use. The default
compute plan is 1 CPU and 2 GB RAM.

## Runtime availability

The execution adapter currently supports language IDs for C, C++, Java,
JavaScript, and Python. Render's public Sandbox documentation does not promise
that each runtime is present in the default image. If the default image is
missing a compiler, prepare a sandbox with the required tools, capture a
snapshot in the same sandbox group, and set both optional group/snapshot IDs.
A missing compiler/runtime is returned in the test output. The adapter
deliberately does not install packages at execution time or enable outbound
network access for student code.

## Local development

The backend returns HTTP 503 for code execution until both environment
variables are set and the Render sandbox SDK is installed. The required SDK
version is pinned in `requirements.txt`. Keep the credentials out of `.env`
files that could be committed.
