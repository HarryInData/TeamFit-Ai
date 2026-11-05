# TeamFit AI

> AI-powered insights for smarter student collaboration

A collaborative coding platform for evaluating students fairly using real-time contribution tracking, isolated code execution in Render Sandboxes, and AI-driven analytics.

## Quick Start

```bash
chmod +x start.sh
./start.sh
```

This starts both the Flask backend (`:5001`) and React frontend (`:5173`).
Create `backend/.env` from `backend/.env.example` first. Code execution requires
Render Sandbox credentials; without them, the backend returns a service
unavailable error and never executes source code locally.

## Development Demo Accounts

These seeded accounts are for local development only. They are not created in production.

| Role | Email | Password |
|------|-------|----------|
| Student | `student@teamfit.ai` | `demo123` |
| Professor | `professor@teamfit.ai` | `demo123` |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite |
| Backend | Flask (Python) |
| Code Execution | Render Sandboxes |
| Styling | Vanilla CSS (design tokens) |
| Code Editor | Monaco Editor |

## Project Structure

```
TEAMFITAI/
├── backend/          # Flask API server
│   ├── app.py        # Entry point
│   ├── routes/       # API endpoints
│   ├── services/     # Render Sandbox runner + AI summary
│   └── models/       # Data models
├── frontend/         # React + Vite app
│   └── src/
│       ├── pages/    # LoginPage, Workspace, Dashboard
│       ├── services/ # API service layer
│       └── context/  # Auth context
├── .claude/agents/   # AI subagent definitions
└── start.sh          # Launch script
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password/role |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/students` | List students (professor role required) |
| POST | `/api/students` | Record session-scoped student activity (authenticated session member) |
| POST | `/api/execute` | Run code in an isolated Render Sandbox (authenticated) |
| GET | `/api/dashboard` | Professor analytics data (professor role required) |
| GET | `/api/health` | Health check |

## Global API Contract

```json
{
  "student": "string",
  "keystrokes": 0,
  "activity": "string"
}
```

Execution responses report process status and output. They are not assignment grades; assignment tests and grading are not implemented.

## Production configuration

Set `APP_ENV=production`, a random `SECRET_KEY` of at least 32 characters,
PostgreSQL `DATABASE_URL`, and explicit HTTPS frontend origins in
`CORS_ORIGINS`. Configure Firebase Admin credentials for Google sign-in and
configure Judge0 CE through RapidAPI as described in [backend/JUDGE0.md](backend/JUDGE0.md).
Production startup fails when required secret/database/CORS configuration is
missing. Run the app with Gunicorn behind a TLS-terminating reverse proxy.

See [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) for the current audit rating, release blockers, and prioritized production-readiness plan.
