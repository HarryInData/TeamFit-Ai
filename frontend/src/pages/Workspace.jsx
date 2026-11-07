import { useCallback, useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { useTheme } from '../context/useTheme';
import { getExamQuestions, getLeaderboard, runExamQuestion } from '../services/api';
import LANGUAGES from '../config/languages';
import ThemeToggle from '../components/ThemeToggle';
import './Workspace.css';

const STORAGE_KEY = 'teamfit_exam_drafts';

function readDraft(sessionId, questionId, languageId) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return all[`${sessionId}:${questionId}:${languageId}`];
  } catch { return undefined; }
}

function writeDraft(sessionId, questionId, languageId, code) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  all[`${sessionId}:${questionId}:${languageId}`] = code;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function getConsoleOutput(result) {
  if (result?.stdout) return result.stdout;
  const caseOutput = (result?.test_results || [])
    .filter((test) => test.stdout)
    .map((test) => `[Test case ${test.case}]\n${test.stdout}`)
    .join('\n');
  if (caseOutput) return caseOutput;
  return result?.stderr || result?.error || 'The program finished without writing to standard output.';
}

function getExecutionErrors(result) {
  const failedCases = (result?.test_results || []).filter((test) => !test.passed);
  const details = failedCases.map((test) => {
    const kind = test.error_type || test.status || 'Failed';
    const message = [test.error_summary, test.stderr].filter(Boolean).join('\n\n') || (test.status === 'Wrong Answer'
      ? 'The program ran, but its output did not match the expected output.'
      : 'The test case failed without additional error details.');
    return `[Test case ${test.case} · ${kind}]\n${message}`;
  });
  if (result?.stderr && !details.length) details.push(result.stderr);
  if (result?.error_summary && !details.length) details.push(result.error_summary);
  if (result?.error) details.push(result.error);
  return details.join('\n\n') || 'No errors were reported for the visible test cases.';
}

export default function Workspace() {
  const { user, logout, sessionId, sessionCode, clearSession } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [questions, setQuestions] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [consoleTab, setConsoleTab] = useState('tests');
  const [rightTab, setRightTab] = useState('rank');
  const [mobilePanel, setMobilePanel] = useState('problem');

  const activeQuestion = questions.find((item) => item.id === activeQuestionId) || questions[0];
  const resolvedQuestionId = activeQuestion?.id;
  const codeKey = `${activeQuestion?.id || ''}:${selectedLang.id}`;
  const code = drafts[codeKey] ?? activeQuestion?.starter_code ?? '';
  const me = leaderboard.find((student) => student.user_name === user?.name);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const [questionData, boardData] = await Promise.all([getExamQuestions(sessionId), getLeaderboard(sessionId)]);
      const next = questionData.questions || [];
      setQuestions(next);
      setActiveQuestionId((current) => next.some((item) => item.id === current) ? current : next[0]?.id || '');
      setLeaderboard(boardData.leaderboard || []);
      setError('');
    } catch (err) { setError(err.message); }
  }, [sessionId]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!sessionId || !resolvedQuestionId) return;
    const restored = readDraft(sessionId, resolvedQuestionId, selectedLang.id);
    const key = `${resolvedQuestionId}:${selectedLang.id}`;
    if (restored !== undefined) setDrafts((current) => ({ ...current, [key]: restored }));
    setOutput(null);
    setSavedAt(restored !== undefined ? new Date() : null);
  }, [sessionId, resolvedQuestionId, selectedLang.id]);

  useEffect(() => {
    if (!sessionId || !activeQuestion || drafts[codeKey] === undefined) return;
    const timer = window.setTimeout(() => {
      try {
        writeDraft(sessionId, activeQuestion.id, selectedLang.id, drafts[codeKey]);
        setSavedAt(new Date());
      } catch { setError('Draft could not be saved in this browser.'); }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [sessionId, activeQuestion, selectedLang.id, codeKey, drafts]);

  function saveDraft() {
    if (!sessionId || !activeQuestion) return;
    try {
      writeDraft(sessionId, activeQuestion.id, selectedLang.id, code);
      setSavedAt(new Date());
      setError('');
    } catch { setError('Draft could not be saved in this browser.'); }
  }

  async function runCode(submit = false) {
    if (!activeQuestion) return;
    if (!code.trim()) { setOutput({ status: 'Error', error: 'Write a solution before running it.', test_results: [] }); return; }
    setRunning(true);
    setError('');
    setConsoleTab('tests');
    try {
      const result = await runExamQuestion(sessionId, activeQuestion.id, code, selectedLang.id, submit);
      setOutput(result);
      if (submit) refresh();
    } catch (err) { setOutput({ status: 'Error', error: err.message, test_results: [] }); }
    finally { setRunning(false); }
  }

  const questionIndex = Math.max(questions.findIndex((item) => item.id === activeQuestion?.id), 0);
  const joinedCount = leaderboard.length;
  const maxPoints = useMemo(() => questions.reduce((sum, question) => sum + Number(question.max_score || 0), 0), [questions]);
  const localRank = me?.rank ? `#${me.rank}` : '—';

  return <main className="exam-workspace">
    <header className="exam-topbar">
      <button className="exam-brand" onClick={() => navigate('/session')} aria-label="Back to student dashboard"><span className="exam-brand-mark">▣</span><span>TeamFit</span></button>
      <div className="exam-course"><strong>{activeQuestion?.title || 'Practical examination'}</strong><span>{sessionCode ? `Session ${sessionCode}` : 'Student coding workspace'}</span></div>
      <div className="exam-top-actions">
        <span className="exam-live"><i/>Session active</span>
        <button className="exam-action-button" onClick={saveDraft}>Save draft</button>
        <button className="exam-action-button" onClick={() => runCode(false)} disabled={running}>{running ? 'Running…' : '▶ Run tests'}</button>
        <button className="exam-action-button exam-action-primary" onClick={() => runCode(true)} disabled={running}>{running ? 'Submitting…' : 'Submit solution'}</button>
        <ThemeToggle inline />
        <button className="exam-avatar" title="Log out" onClick={logout}>{(user?.name || 'S').slice(0, 1).toUpperCase()}</button>
      </div>
    </header>

    <nav className="exam-question-nav" aria-label="Exam questions">
      {questions.map((question, index) => {
        const isActive = question.id === activeQuestion?.id;
        const score = leaderboard.find((row) => row.user_name === user?.name)?.question_scores?.[question.id];
        return <button key={question.id} className={`exam-question-tab ${isActive ? 'is-active' : ''}`} onClick={() => { setActiveQuestionId(question.id); setMobilePanel('problem'); }}>
          <span className="exam-question-number">{index + 1}</span><span className="exam-question-title">{question.title}</span><span className="exam-question-points">{score ?? question.max_score} pts</span>
        </button>;
      })}
      <div className="exam-total-score"><span>Total exam score</span><strong>{me ? `${me.score} / ${maxPoints}` : `— / ${maxPoints}`}</strong></div>
    </nav>

    {error && <div className="exam-banner-error" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
    <nav className="exam-mobile-nav" aria-label="Workspace panels">
      {[['problem','Problem'],['editor','Code editor'],['standings','Standings']].map(([key,label]) => <button key={key} className={mobilePanel === key ? 'is-active' : ''} onClick={() => setMobilePanel(key)}>{label}</button>)}
    </nav>

    <div className="exam-workbench">
      <aside className={`exam-problem-pane ${mobilePanel === 'problem' ? 'mobile-active' : ''}`}>
        <div className="exam-pane-heading"><h2>Problem specification</h2><span>{activeQuestion?.max_score || 0} pts</span></div>
        <div className="exam-problem-scroll">
          {activeQuestion ? <>
            <h1>{questionIndex + 1}. {activeQuestion.title}</h1>
            <p className="exam-problem-meta"><span>Practical problem</span><span>Question {questionIndex + 1} of {questions.length}</span></p>
            <div className="exam-problem-statement">{activeQuestion.statement}</div>
            {(activeQuestion.examples || []).map((example, index) => <section className="exam-example" key={`${activeQuestion.id}-${index}`}><div className="exam-example-head"><strong>Example {index + 1}</strong><span>Sample case</span></div><pre><b>Input</b>{'\n'}{example.input}{'\n\n'}<b>Output</b>{'\n'}{example.output}{example.explanation ? `\n\nExplanation\n${example.explanation}` : ''}</pre></section>)}
          </> : <div className="exam-empty-state">{error || 'Loading exam questions…'}</div>}
        </div>
      </aside>

      <section className={`exam-editor-pane ${mobilePanel === 'editor' ? 'mobile-active' : ''}`}>
        <div className="exam-editor-toolbar">
          <label className="exam-language-select">Language <select value={selectedLang.id} onChange={(event) => { const lang = LANGUAGES.find((item) => item.id === Number(event.target.value)); if (lang) setSelectedLang(lang); }}>
            {LANGUAGES.map((lang) => <option key={lang.id} value={lang.id}>{lang.name}</option>)}
          </select></label>
          <span className="exam-save-state">{savedAt ? `Saved on this device · ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Autosave on this device'}</span>
          <button className="exam-reset-button" onClick={() => { setDrafts((current) => ({ ...current, [codeKey]: activeQuestion?.starter_code || '' })); setOutput(null); }}>Reset code</button>
        </div>
        <div className="exam-code-editor">
          <Editor key={`${activeQuestion?.id}-${selectedLang.id}`} height="100%" language={selectedLang.monaco} value={code} onChange={(value) => setDrafts((current) => ({ ...current, [codeKey]: value || '' }))} theme={theme === 'dark' ? 'vs-dark' : 'vs'} options={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", minimap: { enabled: false }, lineNumbers: 'on', scrollBeyondLastLine: false, padding: { top: 16 }, renderLineHighlight: 'gutter', smoothScrolling: true, automaticLayout: true, tabSize: 4 }} />
        </div>
        <div className="exam-output-panel">
          <div className="exam-output-tabs">{[['tests','Test results'],['output','Console output'],['errors','Errors']].map(([id,label]) => {
            const failedCount = output?.test_results?.filter((test) => !test.passed).length || 0;
            const errorCount = failedCount + (output?.error || (output?.stderr && !failedCount) ? 1 : 0);
            const count = id === 'tests' && output?.test_results?.length
              ? ` (${output.test_results.filter((item) => item.passed).length}/${output.test_results.length})`
              : id === 'errors' && errorCount ? ` (${errorCount})` : '';
            return <button key={id} className={consoleTab === id ? 'is-active' : ''} onClick={() => setConsoleTab(id)}>{label}{count}</button>;
          })}</div>
          <div className="exam-output-content" aria-live="polite">
            {running ? <p className="exam-output-muted">Compiling and running your code…</p> : !output ? <p className="exam-output-muted">Run your solution to see program output, compiler diagnostics, and public test results. Hidden test inputs and expected answers stay private.</p> : consoleTab === 'tests' ? <>
              <div className={`exam-result-summary ${output.status === 'Accepted' ? 'is-pass' : output.status === 'Partial' ? 'is-partial' : 'is-fail'}`}><strong>{output.status === 'Accepted' ? 'All available tests passed' : output.status === 'Partial' ? 'Some tests passed' : output.status || 'Execution failed'}</strong>{output.score !== undefined && <span>{output.score}/{output.max_score} points · {output.passed_tests}/{output.total_tests} passed</span>}</div>
              {(output.test_results || []).map((test, index) => <div className="exam-test-result" key={`${test.case || index}-${index}`}><span className={test.passed ? 'test-check' : 'test-fail'}>{test.passed ? '✓' : '!'}</span><span>Test case {test.case || index + 1}</span><strong>{test.passed ? 'Passed' : test.status || 'Failed'}</strong>{test.error_type && <small>{test.error_type}</small>}</div>)}
              {output.error && <p className="exam-output-error">{output.error}</p>}
              {output.test_results?.some((test) => test.truncated) && <p className="exam-output-muted">Some output was shortened to fit the result panel.</p>}
            </> : consoleTab === 'output' ? <pre className="exam-console-text">{getConsoleOutput(output)}</pre> : <pre className="exam-console-text exam-output-error">{getExecutionErrors(output)}</pre>}
          </div>
        </div>
      </section>

      <aside className={`exam-standings-pane ${mobilePanel === 'standings' ? 'mobile-active' : ''}`}>
        <div className="exam-standings-heading"><h2>Live session standings</h2><div className="exam-pane-tabs"><button className={rightTab === 'rank' ? 'is-active' : ''} onClick={() => setRightTab('rank')}>Rank</button><button className={rightTab === 'history' ? 'is-active' : ''} onClick={() => setRightTab('history')}>Your progress</button></div></div>
        {rightTab === 'rank' ? <>
          <p className="exam-standings-caption">{joinedCount} {joinedCount === 1 ? 'student has' : 'students have'} joined · refreshes every 5 seconds</p>
          <div className="exam-rank-table"><div className="exam-rank-header"><span>Rank</span><span>Student</span><span>Score</span></div>
            {leaderboard.map((student) => <div className={`exam-rank-row ${student.user_name === user?.name ? 'is-you' : ''}`} key={student.user_name}><span className="rank-index">#{student.rank}</span><span className="rank-student">{student.user_name}{student.user_name === user?.name && <small>You</small>}</span><strong>{student.score}<small>/{student.max_score}</small></strong></div>)}
            {!leaderboard.length && <p className="exam-output-muted">Rankings appear after students submit their first solution.</p>}
          </div>
        </> : <div className="exam-my-progress"><p>Your current rank</p><strong>{localRank}</strong><span>{me ? `${me.score} of ${me.max_score} points` : 'Submit a solution to appear in the standings.'}</span><div className="exam-progress-bar"><i style={{ width: `${me?.max_score ? Math.min(100, me.score / me.max_score * 100) : 0}%` }} /></div><small>{questions.length} questions · {maxPoints} possible points</small></div>}
        <div className="exam-submission-history"><h3>Latest result</h3>{output ? <div className="exam-history-card"><span className={output.status === 'Accepted' ? 'test-check' : 'test-fail'}>{output.status === 'Accepted' ? '✓' : '!'}</span><div><strong>{output.status || 'Run completed'}</strong><small>{output.passed_tests ?? 0}/{output.total_tests ?? 0} tests passed{output.submitted ? ' · submitted' : ' · public run'}</small></div><b>{output.submitted ? `${output.score ?? 0} pts` : 'Run'}</b></div> : <p>No solution submitted in this question yet.</p>}</div>
        <div className="exam-privacy-note">Only your professor can identify you on the exam roster. Peer standings use the session display name.</div>
      </aside>
    </div>
    <footer className="exam-statusbar"><span>● Secure exam workspace</span><span>{savedAt ? 'Draft saved locally' : 'Draft autosave enabled'}</span><span>{selectedLang.name}</span><button onClick={() => { clearSession?.(); navigate('/session'); }}>Leave workspace</button></footer>
  </main>;
}
