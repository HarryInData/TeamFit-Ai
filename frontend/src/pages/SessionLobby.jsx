import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createSession, joinSession, getSessionMembers } from '../services/api';
import './SessionLobby.css';

export default function SessionLobby() {
  const { user, sessionId, sessionCode, setSession, logout } = useAuth();
  const navigate = useNavigate();
  const { code: urlCode } = useParams();

  const [mode, setMode] = useState(urlCode ? 'join' : null); // null | 'create' | 'join'
  const [joinCode, setJoinCode] = useState(urlCode || '');
  const [title, setTitle] = useState('');
  const [createdSession, setCreatedSession] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const studentName = user?.name || 'Student';

  // Auto-join if URL has a code
  useEffect(() => {
    if (urlCode && !sessionId) {
      handleJoin(urlCode);
    }
  }, [urlCode]);

  // If already in a session, poll members
  const pollMembers = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await getSessionMembers(sessionId);
      setMembers(data.members || []);
    } catch (e) { /* ignore */ }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      pollMembers();
      const interval = setInterval(pollMembers, 3000);
      return () => clearInterval(interval);
    }
  }, [sessionId, pollMembers]);

  async function handleCreate() {
    setLoading(true);
    setError('');
    try {
      const data = await createSession(title || 'Coding Session');
      setCreatedSession(data);
      setSession(data.session_id, data.join_code);
      setMembers([{ user: studentName, role: 'owner', activity: 'idle', keystrokes: 0 }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(codeOverride) {
    const code = (codeOverride || joinCode).trim().toUpperCase();
    if (!code) { setError('Enter a session code'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await joinSession(code);
      setSession(data.session_id, data.join_code);
      setCreatedSession({ ...data, join_code: data.join_code });
      setMembers(data.members?.map(m => ({ user: m, activity: 'idle', keystrokes: 0 })) || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    const code = createdSession?.join_code || sessionCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleStart() {
    navigate('/workspace');
  }

  // ── Already in session ──
  if (sessionId) {
    return (
      <div className="lobby">
        <div className="lobby-bg-glow lobby-bg-glow--left" />
        <div className="lobby-bg-glow lobby-bg-glow--right" />

        <div className="lobby-card lobby-card--wide">
          <div className="lobby-status-badge">● SESSION ACTIVE</div>
          <h1 className="lobby-title">{createdSession?.title || 'Coding Session'}</h1>

          {/* Join Code Display */}
          <div className="lobby-code-display">
            <span className="lobby-code-label">SESSION CODE</span>
            <div className="lobby-code-value">
              {sessionCode || createdSession?.join_code || '...'}
            </div>
            <button className="lobby-copy-btn" onClick={handleCopy}>
              {copied ? '✓ Copied!' : '📋 Copy Code'}
            </button>
          </div>

          {/* Share Link */}
          <div className="lobby-share-link">
            Share link: <code>{window.location.origin}/join/{sessionCode || createdSession?.join_code}</code>
          </div>

          {/* Members */}
          <div className="lobby-members">
            <h3 className="lobby-members-title">
              Team Members ({members.length})
            </h3>
            <div className="lobby-members-list">
              {members.map((m, i) => (
                <div key={m.user || i} className="lobby-member">
                  <div className="lobby-member-avatar" style={{ '--hue': i * 60 }}>
                    {(m.user || '?').charAt(0)}
                  </div>
                  <div className="lobby-member-info">
                    <span className="lobby-member-name">
                      {m.user}
                      {m.user === studentName && <span className="lobby-you-badge">You</span>}
                    </span>
                    <span className="lobby-member-role">
                      {m.role === 'owner' ? '👑 Owner' : '👤 Member'}
                    </span>
                  </div>
                  <span className={`lobby-member-status lobby-member-status--${m.activity || 'idle'}`}>
                    {m.activity === 'idle' ? '⏸ Waiting' : '⌨ Active'}
                  </span>
                </div>
              ))}

              {/* Waiting indicator */}
              {members.length < 2 && (
                <div className="lobby-waiting">
                  <div className="lobby-waiting-dots">
                    <span /><span /><span />
                  </div>
                  Waiting for teammates to join...
                </div>
              )}
            </div>
          </div>

          {/* Start Button */}
          <button className="lobby-start-btn" onClick={handleStart}>
            <span className="lobby-start-icon">▶</span>
            Start Coding
          </button>
        </div>
      </div>
    );
  }

  // ── Mode Selection ──
  return (
    <div className="lobby">
      <div className="lobby-bg-glow lobby-bg-glow--left" />
      <div className="lobby-bg-glow lobby-bg-glow--right" />

      {/* Floating language icons */}
      <div className="lobby-float-icons">
        <img className="lobby-float-icon" src="/langicons/python-svgrepo-com.svg" alt="Python" style={{ '--delay': '0s', '--x': '10%', '--y': '20%' }} />
        <img className="lobby-float-icon" src="/langicons/js-svgrepo-com.svg" alt="JS" style={{ '--delay': '1s', '--x': '80%', '--y': '15%' }} />
        <img className="lobby-float-icon" src="/langicons/java-svgrepo-com.svg" alt="Java" style={{ '--delay': '2s', '--x': '70%', '--y': '75%' }} />
        <img className="lobby-float-icon" src="/langicons/python-svgrepo-com.svg" alt="Python" style={{ '--delay': '0.5s', '--x': '15%', '--y': '70%' }} />
        <img className="lobby-float-icon" src="/langicons/js-svgrepo-com.svg" alt="JS" style={{ '--delay': '1.5s', '--x': '45%', '--y': '85%' }} />
      </div>

      {!mode ? (
        <div className="lobby-card">
          <div className="lobby-logo">
            <span className="lobby-logo-glow" />
            <span className="lobby-logo-text">TeamFit AI</span>
          </div>
          <h1 className="lobby-title">Welcome, {studentName}</h1>
          <p className="lobby-subtitle">Start a collaborative coding session</p>

          <div className="lobby-options">
            <button className="lobby-option-btn lobby-option-btn--create" onClick={() => setMode('create')}>
              <span className="lobby-option-icon">🚀</span>
              <span className="lobby-option-label">Create Session</span>
              <span className="lobby-option-desc">Start a new team workspace</span>
            </button>
            <button className="lobby-option-btn lobby-option-btn--join" onClick={() => setMode('join')}>
              <span className="lobby-option-icon">🔗</span>
              <span className="lobby-option-label">Join Session</span>
              <span className="lobby-option-desc">Enter a team code to join</span>
            </button>
          </div>

          <button className="lobby-logout-btn" onClick={logout}>🚪 Logout</button>
        </div>
      ) : mode === 'create' ? (
        <div className="lobby-card">
          <button className="lobby-back-btn" onClick={() => setMode(null)}>← Back</button>
          <h1 className="lobby-title">🚀 Create Session</h1>
          <p className="lobby-subtitle">Your teammates will join using the code</p>

          <div className="lobby-form">
            <label className="lobby-label">Session Title (optional)</label>
            <input
              className="lobby-input"
              placeholder="e.g. CS101 Group Project"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button
              className="lobby-submit-btn"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? 'Creating...' : '✨ Create Session'}
            </button>
          </div>

          {error && <div className="lobby-error">⚠ {error}</div>}
        </div>
      ) : (
        <div className="lobby-card">
          <button className="lobby-back-btn" onClick={() => setMode(null)}>← Back</button>
          <h1 className="lobby-title">🔗 Join Session</h1>
          <p className="lobby-subtitle">Enter the code shared by your teammate</p>

          <div className="lobby-form">
            <label className="lobby-label">Session Code</label>
            <input
              className="lobby-input lobby-input--code"
              placeholder="TF-XXXX"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={7}
              autoFocus
            />
            <button
              className="lobby-submit-btn"
              onClick={() => handleJoin()}
              disabled={loading || !joinCode.trim()}
            >
              {loading ? 'Joining...' : '🔗 Join Session'}
            </button>
          </div>

          {error && <div className="lobby-error">⚠ {error}</div>}
        </div>
      )}
    </div>
  );
}
