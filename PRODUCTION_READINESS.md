# Production readiness audit

## Current rating: 5/10

The repository has a usable React/Flask prototype and now has safer authentication boundaries, production configuration checks, a remote sandbox execution path, and automated checks. It is **not ready for a public production launch**: key services and release controls still need to be configured and exercised in a staging environment.

| Area | Rating | Finding |
| --- | ---: | --- |
| Authentication and authorization | 6/10 | Passwords are hashed, JWTs expire, public registration is student-only, and professor routes require a professor token. Add login/registration throttling, account recovery, and token revocation before a wider launch. |
| Code execution isolation | 6/10 | The app no longer executes submitted code in its own process; it fails closed and submits only to Judge0. A real provider, quotas, network policy, resource limits, and abuse controls must be configured and verified. |
| Data and persistence | 4/10 | Production requires PostgreSQL, but schema setup still relies on `CREATE TABLE IF NOT EXISTS`; there are no versioned migrations, backup/restore checks, or PostgreSQL integration tests. |
| Product correctness | 4/10 | Execution success is not assignment correctness. No assignment test harness or trustworthy grading model exists; keystroke share is an easily gamed participation signal and must not be used as a grade. Historical activity, active time, peer review, and CSV export are not implemented. |
| Reliability and operations | 4/10 | Health checks cover database connectivity, but there is no observed deployment, monitoring/alerting, structured request correlation, rate limiting, or tested recovery procedure. |
| Build and regression checks | 7/10 | CI now runs backend tests, frontend lint, and a production frontend build. Coverage is still small and currently exercises SQLite and mocked Judge0 responses rather than deployed PostgreSQL/provider integrations. |

## Changes made in this hardening pass

- Replaced unsafe local code execution fallback with an authenticated, bounded Judge0 client. Provider failure returns an error instead of executing code in the web process.
- Added JWT expiry, password hashing and legacy password migration, student-only self-registration, verified Firebase token handling, and role checks on sensitive routes.
- Added request-size and input validation, production startup configuration checks, database-aware health reporting, and session membership checks for activity writes.
- Scoped session activity and contribution totals to each coding session.
- Removed the fabricated “successful run = 100” grade and dashboard math that implied grades. The UI labels participation as keystroke share and says grading/history are unavailable.
- Added 12 backend tests and GitHub Actions checks for backend tests, frontend lint, and frontend build.

## Release blockers and next steps

1. **Configure and verify the production services.** Set a strong `SECRET_KEY`, PostgreSQL `DATABASE_URL`, HTTPS `CORS_ORIGINS`, Firebase Admin credentials, and authenticated HTTPS Judge0 settings. Deploy to staging and run success, syntax error, compile error, timeout, output-limit, and provider-outage checks.
2. **Add database migrations and integration coverage.** Introduce a migration tool, migrate an existing database, run tests against PostgreSQL, and document backup/restore and rollback procedures.
3. **Protect public endpoints and control costs.** Add shared rate limiting for authentication, AI, and code execution; cap Judge0 time, memory, concurrency, and daily usage; add abuse monitoring. Use a shared limiter store for multi-worker deployments.
4. **Define real grading before displaying grades.** Create assignment definitions and test cases, run them inside the isolated executor, and persist versioned, explainable results. Until then, do not present keystroke counts or a successful process exit as a grade or code-quality measure.
5. **Complete the advertised collaboration features.** Build actual activity history, peer review, skill-gap evidence, and CSV export or remove those claims from the product UI/marketing.
6. **Operational readiness.** Add production deployment configuration, structured logs and request IDs, metrics/alerts, dependency update automation, incident/recovery runbooks, and an end-to-end staging smoke test.

## Verification evidence

- Backend unit/API tests: 12 passing locally.
- Frontend ESLint and Vite production build: passing locally.
- `npm install` reported zero vulnerabilities during dependency installation. A later standalone `npm audit` could not contact the npm audit endpoint because the environment returned `EAI_AGAIN`; rerun it in connected CI.
- No live Judge0 service, Firebase production project, or PostgreSQL production environment was available for integration verification.
