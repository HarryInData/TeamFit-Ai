# Production readiness audit

## Current rating: 5/10

The repository has a usable React/Flask prototype and safer authentication boundaries, production configuration checks, a self-hosted Piston execution path, and automated checks. It is **not ready for a public production launch**: key services and release controls still need to be configured and exercised in a staging environment.

| Area | Rating | Finding |
| --- | ---: | --- |
| Authentication and authorization | 6/10 | Passwords are hashed, JWTs expire, public registration is student-only, and professor routes require a professor token. Add login/registration throttling, account recovery, and token revocation before a wider launch. |
| Code execution isolation | 5/10 | The app sends bounded executions to Piston/Isolate. A dedicated Piston host, network access controls, capacity, and live behavior still need configuration and verification. |
| Data and persistence | 4/10 | Production requires PostgreSQL, but schema setup still relies on `CREATE TABLE IF NOT EXISTS`; there are no versioned migrations, backup/restore checks, or PostgreSQL integration tests. |
| Product correctness | 6/10 | Professor-owned exams, hidden test cases, student exam workspaces, marks, and leaderboard are now implemented. Scoring is deterministic test-case scoring, not AI grading. AI skill-gap explanations and email delivery are not configured; CSV export is available. |
| Reliability and operations | 4/10 | Health checks cover database connectivity, but there is no observed deployment, monitoring/alerting, structured request correlation, rate limiting, or tested recovery procedure. |
| Build and regression checks | 7/10 | CI runs backend tests, frontend lint, and a production frontend build. Coverage is still small and does not yet exercise deployed PostgreSQL or a live Piston integration. |

## Changes made in this hardening pass

- Student code runs through Piston's isolated execution workers. Self-hosted Piston avoids a hosted API subscription, but requires a dedicated server and operations; see [backend/PISTON.md](backend/PISTON.md).
- Added JWT expiry, password hashing and legacy password migration, student-only self-registration, verified Firebase token handling, and role checks on sensitive routes.
- Added request-size and input validation, production startup configuration checks, database-aware health reporting, and session membership checks for activity writes.
- Scoped session activity and contribution totals to each coding session.
- Removed the fabricated “successful run = 100” grade and dashboard math that implied grades. The UI labels participation as keystroke share and says grading/history are unavailable.
- Added professor-owned practical exams, student progress and open-exam lists, hidden test-case scoring, ranked results, session closure, and a three-panel problem/editor/leaderboard workspace.
- Added evidence-based per-student test outcome summaries and downloadable CSV marks reports. The UI clearly identifies unavailable mail delivery and does not label deterministic grading as AI.
- Added backend API tests and GitHub Actions checks for backend tests, frontend lint, and frontend build.

## Release blockers and next steps

1. **Configure and verify the production services.** Set a strong `SECRET_KEY`, PostgreSQL `DATABASE_URL`, HTTPS `CORS_ORIGINS`, Firebase Admin credentials, and a reachable HTTPS Piston host behind an authenticated gateway. Deploy to staging and verify runtime availability, accepted/incorrect output, syntax/compile errors, timeouts, output limits, and provider outages.
2. **Add database migrations and integration coverage.** Introduce a migration tool, migrate an existing database, run tests against PostgreSQL, and document backup/restore and rollback procedures.
3. **Protect public endpoints and control costs.** Add shared rate limiting for authentication, AI, and code execution; cap Piston concurrency and daily usage; add abuse monitoring. Use a shared limiter store for multi-worker deployments.
4. **Configure the exam services.** Set Piston host URL and gateway authentication plus Firebase project settings on Render. The autograder is unavailable until a Piston host is reachable; Google sign-in is unavailable until Firebase web and Admin credentials are configured.
5. **Complete insight and report delivery.** Current individual notes are based on test outcomes and fixed explanations, not AI. Connect a grounded insight provider and a mail delivery service before advertising AI skill-gap analysis or emailed reports.
6. **Operational readiness.** Add production deployment configuration, structured logs and request IDs, metrics/alerts, dependency update automation, incident/recovery runbooks, and an end-to-end staging smoke test.

## Verification evidence

- Backend unit/API tests: 14 passing, including isolated temporary-database tests for roles, exam lifecycle, hidden tests, scoring, and sandbox limits.
- Frontend ESLint and Vite production build: passing for the dashboard and workspace refactor.
- `npm install` reported zero vulnerabilities during dependency installation. A later standalone `npm audit` could not contact the npm audit endpoint because the environment returned `EAI_AGAIN`; rerun it in connected CI.
- No live Piston host, Firebase production project, or PostgreSQL production environment was available for integration verification.
- The browser audit initially found a stale Flask process returning 404 for `/api/student/dashboard`; it was restarted from this checkout. The live flow then passed professor exam creation and publishing, student exam discovery and join, problem/editor/leaderboard rendering, and visible failure when the isolated runner is not configured. An end-to-end accepted submission still requires a reachable Piston host.
