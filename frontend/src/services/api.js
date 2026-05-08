/**
 * ═══════════════════════════════════════════
 * API SERVICE LAYER — TeamFit AI
 * Centralized API client with JWT auth.
 * Uses VITE_API_URL in production,
 * falls back to Vite proxy (/api) in dev.
 * ═══════════════════════════════════════════
 */

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

function getToken() {
  return localStorage.getItem('teamfit_token') || '';
}

function authHeaders(extra = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Shared fetch wrapper with error handling.
 * Prevents crashes from network failures or non-JSON responses.
 */
async function apiFetch(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (networkErr) {
    throw new Error('Server unavailable. Please check your connection.');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(res.ok ? 'Unexpected server response' : `Server error (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

/* ── Auth ── */

export async function login(email, password, role) {
  return apiFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role }),
  });
}

export async function register(name, email, password, role) {
  return apiFetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role }),
  });
}

export async function googleLogin(role) {
  return apiFetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
}

/* ── Students ── */

export async function getStudents() {
  return apiFetch(`${API_BASE}/students`, {
    headers: authHeaders(),
  });
}

export async function updateKeystrokes(student, keystrokes, activity) {
  return apiFetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ student, keystrokes, score: 0, activity }),
  });
}

export async function getStudent(name) {
  return apiFetch(`${API_BASE}/students/${encodeURIComponent(name)}`, {
    headers: authHeaders(),
  });
}

/* ── Code Execution ── */

export async function executeCode(code, languageId = 71, student = '') {
  return apiFetch(`${API_BASE}/execute`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code, language_id: languageId, student }),
  });
}

/* ── Dashboard ── */

export async function getDashboard() {
  return apiFetch(`${API_BASE}/dashboard`, {
    headers: authHeaders(),
  });
}

export async function generateReport() {
  return apiFetch(`${API_BASE}/dashboard/report`, {
    headers: authHeaders(),
  });
}

/* ── AI Insights ── */

export async function getAIInsights(students = null) {
  const options = students
    ? {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ students }),
      }
    : { method: 'GET', headers: authHeaders() };
  return apiFetch(`${API_BASE}/ai-insights`, options);
}

/* ── Sessions ── */

export async function createSession(title = 'Coding Session') {
  return apiFetch(`${API_BASE}/session/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title }),
  });
}

export async function joinSession(joinCode) {
  return apiFetch(`${API_BASE}/session/join`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ join_code: joinCode }),
  });
}

export async function getSessionStats(sessionId) {
  return apiFetch(`${API_BASE}/session/${sessionId}/stats`, {
    headers: authHeaders(),
  });
}

export async function getSessionMembers(sessionId) {
  return apiFetch(`${API_BASE}/session/${sessionId}/members`, {
    headers: authHeaders(),
  });
}

export async function listSessions() {
  return apiFetch(`${API_BASE}/sessions`, {
    headers: authHeaders(),
  });
}

/* ── Health ── */

export async function getHealth() {
  return apiFetch(`${API_BASE}/health`);
}
