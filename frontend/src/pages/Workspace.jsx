import { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { executeCode, updateKeystrokes, getStudents } from '../services/api';
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

function getBadgeInfo(score) {
  if (score >= 50) return { label: 'Top Performer', className: 'ws-contributor-role--good', emoji: '🔥' };
  if (score >= 30) return { label: 'Steady', className: 'ws-contributor-role--good', emoji: '✅' };
  return { label: 'Needs Contribution', className: 'ws-contributor-role--warn', emoji: '⚠️' };
}

function getActivityText(activity) {
  switch (activity) {
    case 'typing': return 'is typing...';
    case 'editing': return 'is editing...';
    case 'submitted': return 'submitted code';
    default: return 'is idle';
  }
}

export default function Workspace() {
  const { user, logout } = useAuth();
  const studentName = user?.name || 'Student';

  // ── Language State ──
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]); // Python default
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Build files for current language
  const initFiles = buildFilesForLang(selectedLang);

  // ── Core State ──
  const [activeFile, setActiveFile] = useState(`main${selectedLang.ext}`);
  const [fileContents, setFileContents] = useState(initFiles.contents);
  const [files, setFiles] = useState(initFiles.files);
  const [output, setOutput] = useState(null);
  const [consoleTab, setConsoleTab] = useState('output');
  const [running, setRunning] = useState(false);
  const [keystrokes, setKeystrokes] = useState(0);
  const [activity, setActivity] = useState('idle');
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [apiError, setApiError] = useState(null);

  // ── UI modals/dropdowns ──
  const [showAddTeammate, setShowAddTeammate] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [teammateName, setTeammateName] = useState('');

  // ── Refs ──
  const keystrokeRef = useRef(0);
  const lastSyncRef = useRef(0);

  // Current code for editor
  const code = fileContents[activeFile] || '';

  // ── Language switch handler ──
  function handleLanguageChange(lang) {
    setSelectedLang(lang);
    const newFiles = buildFilesForLang(lang);
    setFiles(newFiles.files);
    setFileContents(newFiles.contents);
    setActiveFile(`main${lang.ext}`);
    setOutput(null);
    setShowLangMenu(false);
  }

  // ── 1. Fetch students from GET /api/students every 3 seconds ──
  const fetchStudents = useCallback(async () => {
    try {
      const data = await getStudents();
      setStudents(data);
      setApiError(null);
    } catch (err) {
      setApiError('Backend unavailable');
    } finally {
      setLoadingStudents(false);
    }
  }, []);

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
        updateKeystrokes(studentName, delta, activity).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [studentName, activity]);

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
  function handleFileClick(fileName) {
    setActiveFile(fileName);
    setOutput(null); // clear console when switching files
  }

  // ── Editor change handler ──
  function handleEditorChange(value) {
    setFileContents((prev) => ({ ...prev, [activeFile]: value || '' }));
    keystrokeRef.current += 1;
    setKeystrokes(keystrokeRef.current);
    setActivity('typing');
  }

  // ── Run Code ──
  async function handleRun() {
    if (!code.trim()) {
      setOutput({
        stdout: '',
        stderr: 'Error: Code cannot be empty. Write some code first!',
        status: 'Error',
        time: '0', memory: '0', score: 0,
      });
      setConsoleTab('output');
      return;
    }
    setRunning(true);
    setConsoleTab('output');
    setActivity('submitted');
    updateKeystrokes(studentName, keystrokeRef.current, 'submitted').catch(() => {});

    try {
      const result = await executeCode(code, selectedLang.id, studentName);
      setOutput(result);
      fetchStudents();
    } catch (err) {
      setOutput({
        stdout: '',
        stderr: err.message || 'Execution failed. Is the backend running?',
        status: 'Error',
        time: '0',
        memory: '0',
        score: 0,
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
          <span className="ws-session-label">Collaborative Session</span>
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

          <span className="ws-keystroke-count" title="Your keystrokes this session">⌨ {keystrokes}</span>
          <button className="ws-run-btn" onClick={handleRun} disabled={running}>
            <span className="ws-run-icon">▶</span>
            {running ? 'Running...' : 'Run Code'}
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
        {/* ── File Sidebar — Clickable ── */}
        <aside className="ws-sidebar">
          <div className="ws-sidebar-header">
            <span className="ws-sidebar-icon">📁</span>
            <div>
              <div className="ws-sidebar-title">Files</div>
              <div className="ws-sidebar-sub">{selectedLang.name} Project</div>
            </div>
          </div>
          <nav className="ws-file-list">
            {files.map((f) => (
              <button
                key={f.name}
                className={`ws-file-item ${activeFile === f.name ? 'ws-file-item--active' : ''}`}
                onClick={() => handleFileClick(f.name)}
              >
                <LangIcon icon={f.icon} size={16} /> {f.name}
              </button>
            ))}
            <button className="ws-file-item ws-file-settings" onClick={() => setShowSettings(true)}>
              ⚙️ Settings
            </button>
          </nav>
          <div className="ws-sidebar-bottom">
            <button className="ws-add-teammate-btn" onClick={() => setShowAddTeammate(true)}>
              👤 + Add Teammate
            </button>
            <button className="ws-help-btn" onClick={() => alert('Help: Use the editor to write code, click Run Code to execute. Keystrokes are tracked automatically.')}>
              ❓ Help
            </button>
          </div>
        </aside>

        {/* ── Main Editor Area ── */}
        <main className="ws-main">
          {/* Editor Tabs — reflects activeFile */}
          <div className="ws-editor-tabs">
            {files.filter((f) => f.name === activeFile || f.name === `main${selectedLang.ext}`).map((f) => (
              <button
                key={f.name}
                className={`ws-tab ${activeFile === f.name ? 'ws-tab--active' : ''}`}
                onClick={() => handleFileClick(f.name)}
              >
                <LangIcon icon={f.icon} className="ws-tab-icon" size={16} /> {f.name}
              </button>
            ))}
            {activeFile !== `main${selectedLang.ext}` && (
              <button
                className="ws-tab ws-tab--active"
                onClick={() => handleFileClick(activeFile)}
              >
                <span className="ws-tab-icon">📄</span> {activeFile}
              </button>
            )}
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
                  No problems detected in {activeFile}.
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
                    {output.score !== undefined && (
                      <span className="ws-console-score"> — Score: {output.score}/100</span>
                    )}
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

        {/* ── Right Panel ── */}
        <aside className="ws-panel">
          <div className="ws-panel-section">
            <h3 className="ws-panel-heading">LIVE CONTRIBUTION</h3>
            {loadingStudents ? (
              <div className="ws-panel-loading">
                <div className="ws-panel-spinner" />
                Loading team data...
              </div>
            ) : students.length === 0 ? (
              <div className="ws-panel-empty">No team members found</div>
            ) : (
              students.map((s) => {
                const badge = getBadgeInfo(s.contribution || 0);
                const contribution = s.contribution || 0;
                return (
                  <div key={s.student} className="ws-contributor-card">
                    <div className="ws-contributor-header">
                      <div>
                        <div className="ws-contributor-name">
                          {s.student}
                          {s.student === studentName && (
                            <span className="ws-contributor-you"> (you)</span>
                          )}
                        </div>
                        <div className={badge.className}>{badge.label}</div>
                      </div>
                      <span className="ws-contributor-emoji">{badge.emoji}</span>
                    </div>
                    <div className="ws-progress-bar">
                      <div
                        className="ws-progress-fill"
                        style={{
                          width: `${contribution}%`,
                          background: contribution >= 30
                            ? 'linear-gradient(90deg, #6C5CE7, #A855F7)'
                            : 'linear-gradient(90deg, #3B82F6, #6C5CE7)',
                        }}
                      />
                    </div>
                    <div className="ws-progress-meta">
                      <span className="ws-progress-label">{contribution}%</span>
                      <span className="ws-progress-ks">⌨ {s.keystrokes || 0}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* AI Insights — LIVE from real data */}
          <div className="ws-panel-section">
            <div className="ws-ai-header">
              <span className="ws-ai-dot" />
              AI INSIGHTS ENABLED
            </div>
            <div className="ws-ai-card">
              <p className="ws-ai-quote">
                {(() => {
                  if (students.length === 0) return '"Waiting for team members to start coding..."';
                  const totalKs = students.reduce((sum, s) => sum + (s.keystrokes || 0), 0);
                  if (totalKs === 0) return '"Start typing code — AI insights will appear in real-time."';
                  const sorted = [...students].sort((a, b) => (b.keystrokes || 0) - (a.keystrokes || 0));
                  const top = sorted[0];
                  if (sorted.length >= 2) {
                    const bot = sorted[sorted.length - 1];
                    return `"${top.student} is leading with ${top.keystrokes} keystrokes (${top.contribution}%), while ${bot.student} has ${bot.keystrokes} keystrokes (${bot.contribution}%). ${Math.abs(top.contribution - bot.contribution) > 30 ? 'Contribution imbalance detected.' : 'Team is well-balanced.'}"`;
                  }
                  return `"${top.student} is actively contributing with ${top.keystrokes} keystrokes."`;
                })()}
              </p>
              <div className="ws-ai-meta">
                LIVE ANALYSIS • {students.filter(s => s.activity !== 'idle').length}/{students.length} ACTIVE
                <span className="ws-ai-sparkle">✦</span>
              </div>
            </div>
          </div>

          {/* Course Card */}
          <div className="ws-course-card">
            <div className="ws-course-icon">🎓</div>
            <div>
              <div className="ws-course-name">CS101: {selectedLang.name} Project</div>
              <div className="ws-course-label">GROUP PROJECT A</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
