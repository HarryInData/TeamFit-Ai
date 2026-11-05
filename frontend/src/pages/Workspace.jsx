import { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/auth';
import { updateKeystrokes, getSessionMembers, getExamQuestions, getLeaderboard, runExamQuestion } from '../services/api';
import LANGUAGES from '../config/languages';
import './Workspace.css';

/* ── Renders SVG img or emoji span ── */
function LangIcon({ icon, className = '', size = 18 }) {
  if (icon && icon.startsWith('/')) {
    return <img src={icon} alt="" className={className} style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }} />;
  }
  return <span className={className}>{icon}</span>;
}

/* ── Generate file set for a language ── */
function buildFilesForLang(lang) {
  const ext = lang.ext;
  return {
    files: [
      { name: `main${ext}`, icon: lang.icon },
      { name: `solution${ext}`, icon: '📄' },
      { name: `test${ext}`, icon: '🧪' },
    ],
    contents: {
      [`main${ext}`]: lang.template,
      [`solution${ext}`]: `// solution${ext} — Extended implementation\n${lang.template}`,
      [`test${ext}`]: `// test${ext} — Unit tests\n// TODO: Write tests for your ${lang.name} code`,
    },
  };
}

const MEMBER_COLORS = ['#6C5CE7', '#A855F7', '#3B82F6', '#FFB800'];

function getActivityText(activity) {
  switch (activity) {
    case 'typing': return 'is typing...';
    case 'editing': return 'is editing...';
    case 'submitted': return 'submitted code';
    default: return 'is idle';
  }
}

export default function Workspace() {
  const { user, logout, sessionId } = useAuth();
  const studentName = user?.name || 'Student';

  // ── Language State ──
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]); // Python default
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Build files for current language
  const initFiles = buildFilesForLang(selectedLang);

  // ── Core State ──
  const [activeFile, setActiveFile] = useState(`main${selectedLang.ext}`);
  const [questionCodes, setQuestionCodes] = useState({});
  const [files, setFiles] = useState(initFiles.files);
  const [output, setOutput] = useState(null);
  const [consoleTab, setConsoleTab] = useState('output');
  const [running, setRunning] = useState(false);
  const [keystrokes, setKeystrokes] = useState(0);
  const [activity, setActivity] = useState('idle');
  const [students, setStudents] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);

  // ── UI modals/dropdowns ──
  const [showAddTeammate, setShowAddTeammate] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [teammateName, setTeammateName] = useState('');

  // ── Refs ──
  const keystrokeRef = useRef(0);
  const lastSyncRef = useRef(0);

  // Current code for editor
  const code = questionCodes[activeQuestionId] ?? activeQuestion?.starter_code ?? selectedLang.template;
  const activeQuestion = questions.find((question) => question.id === activeQuestionId) || questions[0];

  const refreshExam = useCallback(async () => {
    if (!sessionId) return;
    try {
      const [questionData, boardData] = await Promise.all([getExamQuestions(sessionId), getLeaderboard(sessionId)]);
      const nextQuestions = questionData.questions || [];
      setQuestions(nextQuestions);
      setActiveQuestionId((current) => nextQuestions.some((question) => question.id === current) ? current : nextQuestions[0]?.id || '');
      setLeaderboard(boardData.leaderboard || []);
    } catch (error) {
      setApiError(error.message);
    }
  }, [sessionId]);

  useEffect(() => { refreshExam(); const timer = setInterval(refreshExam, 5000); return () => clearInterval(timer); }, [refreshExam]);

  // ── Language switch handler ──
  function handleLanguageChange(lang) {
    setSelectedLang(lang);
    const newFiles = buildFilesForLang(lang);
    setFiles(newFiles.files);
    setQuestionCodes({});
    setActiveFile(`main${lang.ext}`);
    setOutput(null);
    setShowLangMenu(false);
  }

  // ── 1. Fetch students from GET /api/students every 3 seconds ──
  const fetchStudents = useCallback(async () => {
    if (!sessionId) {
      setStudents([]);
      setApiError('Join a coding session before opening the workspace.');
      return;
    }
    try {
      const data = await getSessionMembers(sessionId);
      setStudents((data.members || []).map((member) => ({
        student: member.user,
        keystrokes: member.keystrokes,
        activity: member.activity,
        role: member.role,
        contribution: member.contribution,
      })));
      setApiError(null);
    } catch {
      setApiError('Backend unavailable');
    }
  }, [sessionId]);

  useEffect(() => {
    fetchStudents();
    const interval = setInterval(fetchStudents, 3000);
    return () => clearInterval(interval);
  }, [fetchStudents]);

  // ── 2. Sync keystroke DELTAS every 5 seconds ──
  useEffect(() => {
    const interval = setInterval(() => {
      const currentKs = keystrokeRef.current;
      const delta = currentKs - lastSyncRef.current;
      if (delta > 0) {
        lastSyncRef.current = currentKs;
        // Send only the DELTA — backend increments
        updateKeystrokes(studentName, delta, activity, sessionId).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [studentName, activity, sessionId]);

  // ── 3. Auto-reset to idle after 5s of inactivity ──
  useEffect(() => {
    if (activity === 'typing') {
      const timer = setTimeout(() => setActivity('idle'), 5000);
      return () => clearTimeout(timer);
    }
  }, [activity, keystrokes]);

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    function handleClick() {
      setShowProfileMenu(false);
      setShowSettings(false);
      setShowLangMenu(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // ── File switching ──
  // ── Editor change handler ──
  function handleEditorChange(value) {
    setQuestionCodes((prev) => ({ ...prev, [activeQuestionId]: value || '' }));
    keystrokeRef.current += 1;
    setKeystrokes(keystrokeRef.current);
    setActivity('typing');
  }

  // ── Run Code ──
  async function handleRun() {
    if (!activeQuestion) {
      setOutput({ stdout: '', stderr: 'No exam question is available. Return to your dashboard and join an open exam.', status: 'Error', time: '0', memory: '0' });
      setConsoleTab('output');
      return;
    }
    if (!code.trim()) {
      setOutput({
        stdout: '',
        stderr: 'Error: Code cannot be empty. Write some code first!',
        status: 'Error',
        time: '0', memory: '0',
      });
      setConsoleTab('output');
      return;
    }
    setRunning(true);
    setConsoleTab('output');
    setActivity('submitted');
    updateKeystrokes(studentName, 0, 'submitted', sessionId).catch(() => {});

    try {
      const result = await runExamQuestion(sessionId, activeQuestion.id, code, selectedLang.id);
      setOutput(result);
      fetchStudents();
      refreshExam();
    } catch (err) {
      setOutput({
        stdout: '',
        stderr: err.message || 'Execution failed. Is the backend running?',
        status: 'Error',
        time: '0',
        memory: '0',
      });
    } finally {
      setRunning(false);
    }
  }

  // ── Add Teammate ──
  function handleAddTeammate(e) {
    e.preventDefault();
    if (teammateName.trim()) {
      alert(`Invite sent to "${teammateName}"`);
      setTeammateName('');
      setShowAddTeammate(false);
    }
  }

  // ── Derive active members ──
  const activeMembers = students.filter((s) => s.activity !== 'idle');

  return (
    <div className="workspace">
      {/* ── Modals ── */}
      {showAddTeammate && (
        <div className="ws-modal-overlay" onClick={() => setShowAddTeammate(false)}>
          <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h3>Add Teammate</h3>
              <button className="ws-modal-close" onClick={() => setShowAddTeammate(false)}>✕</button>
            </div>
            <form className="ws-modal-body" onSubmit={handleAddTeammate}>
              <label className="ws-modal-label">Name or Email</label>
              <input
                className="ws-modal-input"
                type="text"
                placeholder="Enter teammate name or email"
                value={teammateName}
                onChange={(e) => setTeammateName(e.target.value)}
                autoFocus
              />
              <div className="ws-modal-actions">
                <button type="button" className="ws-modal-cancel" onClick={() => setShowAddTeammate(false)}>Cancel</button>
                <button type="submit" className="ws-modal-submit">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="ws-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h3>Settings</h3>
              <button className="ws-modal-close" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="ws-modal-body">
              <div className="ws-settings-item">
                <span>Theme</span>
                <span className="ws-settings-value">Dark Mode</span>
              </div>
              <div className="ws-settings-item">
                <span>Font Size</span>
                <span className="ws-settings-value">14px</span>
              </div>
              <div className="ws-settings-item">
                <span>Auto-save</span>
                <span className="ws-settings-value">Enabled</span>
              </div>
              <div className="ws-settings-item">
                <span>Language</span>
                <span className="ws-settings-value">Python</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Nav ── */}
      <header className="ws-topnav">
        <div className="ws-topnav-left">
          <span className="ws-logo-text">TeamFit AI</span>
          <span className="ws-session-label">{activeQuestion ? 'Practical Exam' : 'Coding Session'}</span>
          <span className="ws-system-badge ws-system-badge--active">● System Active</span>
          {apiError && <span className="ws-api-error">⚠ {apiError}</span>}
        </div>
        <div className="ws-topnav-right">
          {/* ── Language Selector ── */}
          <div className="ws-lang-wrapper">
            <button
              className="ws-lang-btn"
              onClick={(e) => { e.stopPropagation(); setShowLangMenu(!showLangMenu); }}
              title="Select Language"
            >
              <LangIcon icon={selectedLang.icon} className="ws-lang-icon" size={20} />
              <span className="ws-lang-name">{selectedLang.name}</span>
              <span className="ws-lang-caret">▾</span>
            </button>
            {showLangMenu && (
              <div className="ws-lang-menu" onClick={(e) => e.stopPropagation()}>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    className={`ws-lang-option ${lang.id === selectedLang.id ? 'ws-lang-option--active' : ''}`}
                    onClick={() => handleLanguageChange(lang)}
                  >
                    <LangIcon icon={lang.icon} className="ws-lang-option-icon" size={18} />
                    <span>{lang.name}</span>
                    {lang.id === selectedLang.id && <span className="ws-lang-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="ws-keystroke-count">{leaderboard.length} students</span>
          <button className="ws-run-btn" onClick={handleRun} disabled={running}>
            <span className="ws-run-icon">▶</span>
            {running ? 'Grading...' : 'Submit & run'}
          </button>
          <button className="ws-icon-btn" title="Team">👥</button>
          {/* Profile dropdown — NOT redirect to login */}
          <div className="ws-profile-wrapper">
            <button
              className="ws-avatar-btn"
              title="Profile"
              onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}
            >
              {studentName.charAt(0)}
            </button>
            {showProfileMenu && (
              <div className="ws-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="ws-dropdown-header">
                  <div className="ws-dropdown-name">{studentName}</div>
                  <div className="ws-dropdown-email">{user?.email || 'student@teamfit.ai'}</div>
                </div>
                <div className="ws-dropdown-sep" />
                <button className="ws-dropdown-item" onClick={() => { setShowSettings(true); setShowProfileMenu(false); }}>
                  ⚙️ Settings
                </button>
                <button className="ws-dropdown-item" onClick={() => { alert('Profile editing coming soon!'); setShowProfileMenu(false); }}>
                  👤 Edit Profile
                </button>
                <div className="ws-dropdown-sep" />
                <button className="ws-dropdown-item ws-dropdown-item--danger" onClick={logout}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="ws-body">
        <aside className="ws-problem-panel">
        <div className="ws-problem-head"><span>QUESTION {Math.max(questions.findIndex((question) => question.id === activeQuestion?.id) + 1, 1)} OF {questions.length}</span><strong>{activeQuestion?.max_score ?? 0} pts</strong></div>
          {questions.length > 1 && <select aria-label="Select question" value={activeQuestion?.id || ''} onChange={(event) => setActiveQuestionId(event.target.value)}>{questions.map((question, index) => <option value={question.id} key={question.id}>{index + 1}. {question.title}</option>)}</select>}
          <div className="ws-problem-content">
            {activeQuestion ? <><h1>{activeQuestion.title}</h1><p className="ws-problem-statement">{activeQuestion.statement}</p>{(activeQuestion.examples || []).map((example, index) => <div className="ws-example" key={index}><strong>Example {index + 1}</strong><pre>Input: {example.input}{'\n'}Output: {example.output}</pre></div>)}</> : <div className="ws-console-placeholder">{apiError || 'Loading exam question…'}</div>}
          </div>
        </aside>

        {/* ── Main Editor Area ── */}
        <main className="ws-main">
          {/* Editor Tab — shows only the active file */}
          <div className="ws-editor-tabs">
            <button className="ws-tab ws-tab--active">
              <LangIcon icon={files.find(f => f.name === activeFile)?.icon || '📄'} className="ws-tab-icon" size={16} /> {activeFile}
            </button>
          </div>

          {/* Monaco Editor — language changes dynamically */}
          <div className="ws-editor-container">
            <Editor
              key={`${selectedLang.id}-${activeFile}`}
              height="100%"
              defaultLanguage={selectedLang.monaco}
              language={selectedLang.monaco}
              theme="vs-dark"
              value={code}
              onChange={handleEditorChange}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                renderLineHighlight: 'gutter',
                smoothScrolling: true,
              }}
            />
          </div>

          {/* Activity Bar — Live from API */}
          <div className="ws-activity-bar">
            {activeMembers.length > 0 ? (
              activeMembers.map((m, i) => (
                <span
                  key={m.student}
                  className="ws-activity-indicator"
                  style={{ '--dot-color': MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                >
                  <span className="ws-activity-dot" />
                  {m.student} {getActivityText(m.activity)}
                </span>
              ))
            ) : (
              <span className="ws-activity-indicator ws-activity-indicator--idle">
                All team members idle
              </span>
            )}
          </div>

          {/* Console */}
          <div className="ws-console">
            <div className="ws-console-tabs">
              {['output', 'debug', 'problems'].map((tab) => (
                <button
                  key={tab}
                  className={`ws-console-tab ${consoleTab === tab ? 'ws-console-tab--active' : ''}`}
                  onClick={() => setConsoleTab(tab)}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="ws-console-output">
              {consoleTab === 'debug' ? (
                <div className="ws-console-placeholder">
                  Debug output will appear here. Active file: {activeFile}
                </div>
              ) : consoleTab === 'problems' ? (
                <div className="ws-console-placeholder">
                  {!output
                    ? 'Run the code to see compiler and runtime errors. Static analysis is not configured.'
                    : output.error_type
                      ? `${output.error_type} error (${output.status}): ${output.stderr || 'No error details provided.'}`
                      : output.status === 'Accepted'
                        ? 'Execution completed without a reported error. Static analysis is not configured.'
                        : `Execution status: ${output.status || 'Unknown'}`}
                </div>
              ) : running ? (
                <div className="ws-console-running">
                  <div className="ws-console-spinner" />
                  Executing code...
                </div>
              ) : output ? (
                <>
                  <div className={`ws-console-status ${output.status === 'Accepted' ? 'ws-console-status--success' : 'ws-console-status--error'}`}>
                    {output.status === 'Accepted' ? '✓ Execution Successful.' : `✗ Execution Failed: ${output.status}`}
                  </div>
                  {output.stdout && <pre className="ws-console-text">{output.stdout}</pre>}
                  {output.stderr && <pre className="ws-console-text ws-console-text--error">{output.stderr}</pre>}
                  <div className="ws-console-meta">
                    Time: {output.time}s &nbsp;&nbsp; Memory: {output.memory}KB
                  </div>
                  <div className="ws-console-prompt">$ _</div>
                </>
              ) : (
                <div className="ws-console-placeholder">
                  Click "Run Code" to execute your program.
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="ws-panel ws-leaderboard-panel">
          <div className="ws-panel-section"><h3 className="ws-panel-heading">LIVE LEADERBOARD</h3><p className="ws-leaderboard-caption">Ranked by best score across questions</p>
            {leaderboard.length ? leaderboard.map((student) => <div className={`ws-rank-row ${student.user_name === studentName ? 'ws-rank-row--you' : ''}`} key={student.user_name}><span className="ws-rank-number">#{student.rank}</span><span className="ws-rank-name">{student.user_name}{student.user_name === studentName ? ' (you)' : ''}</span><strong>{student.score}<small>/{student.max_score}</small></strong></div>) : <div className="ws-panel-empty">No students joined yet</div>}
            <div className="ws-exam-count">{leaderboard.length} joined · updates every 5 seconds</div>
          </div>
          <div className="ws-panel-section ws-my-score"><h3 className="ws-panel-heading">YOUR PROGRESS</h3>{leaderboard.find((student) => student.user_name === studentName) ? <><strong>#{leaderboard.find((student) => student.user_name === studentName).rank}</strong><span>{leaderboard.find((student) => student.user_name === studentName).score}/{leaderboard.find((student) => student.user_name === studentName).max_score} points</span></> : <p>Submit your first solution to get ranked.</p>}</div>
        </aside>
      </div>
    </div>
  );
}
