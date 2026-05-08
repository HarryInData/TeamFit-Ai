# TeamFit AI

> AI-powered insights for smarter student collaboration

A collaborative coding platform for evaluating students fairly using real-time contribution tracking, code execution via Judge0, and AI-driven analytics.

## Quick Start

```bash
chmod +x start.sh
./start.sh
```

This starts both the Flask backend (`:5000`) and React frontend (`:5173`).

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Student | `student@teamfit.ai` | `demo123` |
| Professor | `professor@teamfit.ai` | `demo123` |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Flask (Python) |
| Code Execution | Judge0 API |
| Styling | Vanilla CSS (design tokens) |
| Code Editor | Monaco Editor |

## Project Structure

```
TEAMFITAI/
├── backend/          # Flask API server
│   ├── app.py        # Entry point
│   ├── routes/       # API endpoints
│   ├── services/     # Judge0 + AI summary
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
| GET | `/api/students` | List all students |
| POST | `/api/students` | Create/update student |
| POST | `/api/execute` | Execute code via Judge0 |
| GET | `/api/dashboard` | Professor analytics data |
| GET | `/api/health` | Health check |

## Global API Contract

```json
{
  "student": "string",
  "keystrokes": 0,
  "score": 0,
  "activity": "string"
}
```
