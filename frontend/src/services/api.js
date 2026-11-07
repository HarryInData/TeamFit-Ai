import { onAuthStateChanged } from '@firebase/auth';
import { auth } from '../config/firebase';

/**
 * ═══════════════════════════════════════════
 * API SERVICE LAYER — TeamFit AI
 * Centralized API client with JWT auth.
 * Uses VITE_API_URL in production,
 * falls back to Vite proxy (/api) in dev.
 * ═══════════════════════════════════════════
 */

// VITE_API_URL should be the backend root (e.g. https://teamfit-ai.onrender.com)
// In dev, falls back to /api which is handled by Vite proxy.
const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/+$/, '')  // strip trailing slash
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
  const headers = options.headers || {};
  const hasBearerToken = Boolean(headers.Authorization || headers.authorization || getToken());
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new Error('Server unavailable. Please check your connection.');
  }

  if (res.status === 401 && hasBearerToken && !url.includes('/auth/')) {
    const refreshedToken = await refreshBackendToken();
    if (refreshedToken) {
      try {
        res = await fetch(url, {
          ...options,
          headers: { ...headers, Authorization: `Bearer ${refreshedToken}` },
        });
      } catch {
        throw new Error('Server unavailable. Please check your connection.');
      }
    } else {
      clearExpiredSession();
      throw new Error('Your sign-in expired. Please sign in with Google again.');
    }
  }

  let data;
  try { data = await res.json(); }
  catch { throw new Error(res.ok ? 'Unexpected server response' : `Server error (${res.status})`); }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

async function waitForFirebaseUser() {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    const timeout = setTimeout(() => { unsubscribe(); resolve(null); }, 4000);
    unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    }, () => {
      clearTimeout(timeout);
      unsubscribe();
      resolve(null);
    });
  });
}

async function refreshBackendToken() {
  try {
    const firebaseUser = await waitForFirebaseUser();
    if (!firebaseUser) return null;
    const savedUser = JSON.parse(localStorage.getItem('teamfit_user') || 'null');
    if (!savedUser || !['student', 'professor'].includes(savedUser.role)) return null;

    const idToken = await firebaseUser.getIdToken(true);
    const response = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, role: savedUser.role }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.token || !data?.user || data.user.role !== savedUser.role) return null;
    localStorage.setItem('teamfit_user', JSON.stringify(data.user));
    localStorage.setItem('teamfit_token', data.token);
    return data.token;
  } catch {
    return null;
  }
}

function clearExpiredSession() {
  localStorage.removeItem('teamfit_user');
  localStorage.removeItem('teamfit_token');
  window.dispatchEvent(new Event('teamfit:auth-expired'));
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

export async function googleLogin(idToken, role) {
  return apiFetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, role }),
  });
}

/* ── Students ── */

export async function getStudents() {
  return apiFetch(`${API_BASE}/students`, {
    headers: authHeaders(),
  });
}

export async function updateKeystrokes(student, keystrokes, activity, sessionId) {
  return apiFetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ student, keystrokes, activity, session_id: sessionId }),
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

export async function getStudentDashboard() {
  return apiFetch(`${API_BASE}/student/dashboard`, { headers: authHeaders() });
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

export async function generateQuestionDraft(description, difficulty = 'intermediate') {
  return apiFetch(`${API_BASE}/ai/generate-question`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ description, difficulty }),
  });
}

/* ── Sessions ── */

export async function createSession(title = 'Practical Exam', questions = []) {
  return apiFetch(`${API_BASE}/session/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title, questions }),
  });
}

export async function joinSession(joinCode) {
  const value = String(joinCode ?? '').trim();
  const payload = /^TF-/i.test(value) ? { join_code: value.toUpperCase() } : { session_id: value };
  return apiFetch(`${API_BASE}/session/join`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
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

export async function listOpenSessions() {
  return apiFetch(`${API_BASE}/sessions/open`, { headers: authHeaders() });
}

export async function getExamQuestions(sessionId) {
  return apiFetch(`${API_BASE}/session/${sessionId}/questions`, { headers: authHeaders() });
}

export async function startExam(sessionId) {
  return apiFetch(`${API_BASE}/session/${sessionId}/start`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({}),
  });
}

export async function closeExam(sessionId) {
  return apiFetch(`${API_BASE}/session/${sessionId}/close`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({}),
  });
}

export async function getLeaderboard(sessionId) {
  return apiFetch(`${API_BASE}/session/${sessionId}/leaderboard`, { headers: authHeaders() });
}

export async function runExamQuestion(sessionId, questionId, code, languageId = 71, submit = true) {
  return apiFetch(`${API_BASE}/session/${sessionId}/question/${questionId}/run`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ code, language_id: languageId, submit }),
  });
}

/* ── Health ── */

export async function getHealth() {
  return apiFetch(`${API_BASE}/health`);
}
