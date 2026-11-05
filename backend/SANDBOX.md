# Isolated code execution

TeamFit sends source code to Judge0. It never executes submitted Python,
JavaScript, C, C++, or Java inside the Flask process. Judge0 runs submissions in
its Isolate-based sandbox and returns compiler output, runtime output, exit
status, time, and memory. The API validates language IDs and code size, requires
a signed-in user, bounds the request and response sizes, and turns provider
failures into HTTP 503 responses.

## Use the managed Judge0 endpoint

Set `JUDGE0_URL`, `JUDGE0_API_KEY`, and `JUDGE0_HOST` in `backend/.env`. Keep the
API key only on the backend. Never add it to a `VITE_*` variable or commit it.
The browser receives stdout/stderr, execution status, and safe resource
statistics only. Each submission requests fixed limits of 2 seconds CPU, 5
seconds wall time, 128,000 KB memory, 64,000 KB stack, 20 processes/threads,
and 1,024 KB per file; it explicitly disables sandbox network access. Configure
Judge0's allowed submission maxima to accept these values and enforce equal or
tighter limits again in the isolated worker.

## Use self-hosted Judge0

Deploy the official Judge0 CE release on a dedicated Linux host or isolated
worker pool. Judge0's official deployment includes privileged server/worker
containers for its Isolate sandbox; keep those workers away from the app host,
restrict their network and cloud credentials, and follow Judge0's host/kernel
requirements. Do not expose the Judge0 port publicly. Place it behind a private
network and TLS proxy, configure its authorization header/token, and allow only
the TeamFit backend to connect.

Set the backend values:

```dotenv
JUDGE0_URL=https://judge0.internal.example
JUDGE0_API_KEY=
JUDGE0_AUTH_HEADER=X-Auth-User
JUDGE0_AUTH_TOKEN=<the same secret configured in Judge0 AUTHZ_TOKEN>
```

Set Judge0's `AUTHZ_HEADER` to the same header name and `AUTHZ_TOKEN` to the
same secret. Keep the token in a secret manager in production. Change
`X-Auth-User` if your Judge0 config uses a different header. This token is sent
only on backend-to-backend requests.

## Error results

The workspace displays Judge0's compiler output for compilation errors and
stderr for syntax/runtime errors. The API also returns `error_type` values such
as `syntax`, `compile`, `runtime`, `timeout`, and `memory`, plus a `truncated`
flag when output exceeded the 32 KiB display limit. It does not infer that a
program is correct just because it ran: assignment correctness requires
explicit test cases, which this repository does not yet model.

Official references: [Judge0 source and deployment files](https://github.com/judge0/judge0),
[Judge0 configuration](https://github.com/judge0/judge0/blob/master/judge0.conf),
[Judge0 releases](https://github.com/judge0/judge0/releases).
