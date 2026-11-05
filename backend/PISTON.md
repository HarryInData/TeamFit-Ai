# Self-hosted Piston code runner

TeamFit uses Piston to compile and execute student code inside Isolate. The
backend returns visible output, compile/runtime diagnostics, and test results.
Piston is open source and self-hostable; the host still needs compute, storage,
runtime downloads, and maintenance. The public Piston API is not a free public
service, so this setup runs a private instance.

## Local development

Piston requires Docker with cgroup v2 support. From the repository root:

```sh
docker compose -f piston/docker-compose.yml up -d
```

The API binds to `127.0.0.1:2000`. Install the language packages TeamFit
supports by calling Piston's local package endpoint with the exact package and
version:

```sh
curl -X POST http://127.0.0.1:2000/api/v2/packages \
  -H 'Content-Type: application/json' \
  -d '{"language":"python","version":"3.12.0"}'
```

Install `node` version `20.11.1`, `gcc` version `10.2.0` (for C and C++), and
`java` version `15.0.2` as well. TeamFit selects these versions explicitly.

Use the installed runtime versions returned by
`GET http://127.0.0.1:2000/api/v2/runtimes` to verify setup. Configure
`backend/.env` with:

```text
PISTON_URL=http://127.0.0.1:2000
```

Start the backend and frontend, then use Run or Submit in a coding session.

## Production connection

Render cannot reach `127.0.0.1` on your development machine. The runner must
live on a reachable Linux host with Docker and cgroup v2. Put it behind a TLS
gateway that validates a long random shared secret and forwards only the
Piston API requests required by TeamFit. Do not expose Piston's raw API: it
also provides package installation and removal endpoints.

Configure the Render backend with:

```text
PISTON_URL=https://<private-runner-gateway>
PISTON_AUTH_HEADER=X-TeamFit-Token
PISTON_AUTH_TOKEN=<long-random-secret>
```

The gateway must require that header and the same secret before forwarding to
Piston. Production startup rejects HTTP runner URLs and missing gateway
authentication. An authenticated tunnel can connect a personal machine, but
that machine must stay online and has limited capacity; a small dedicated
Linux host is more reliable for live exams.

## Execution limits

TeamFit accepts only its supported language IDs, limits source and stdin size,
and sets fixed compile/run wall-time, CPU-time, and memory caps. Piston disables
outgoing network access by default and isolates each process with Isolate,
namespaces, and cgroups. Hidden tests contribute to grading without returning
their expected outputs to students. Rate-limit and load-test a runner before
using it for a live exam.
