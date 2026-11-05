import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { getStudentDashboard, joinSession } from '../services/api';
import './ExamPortal.css';

function formatMark(exam, submissions) {
  const hasSubmission = submissions.some((submission) => submission.session_id === exam.id);
  if (exam.status === 'open' && !hasSubmission) return 'In progress · no submissions yet';
  if (!exam.possible_score) return 'Not graded';
  const progress = exam.status === 'open' ? ' · in progress' : '';
  return `${exam.earned_score}/${exam.possible_score} (${Math.round(exam.earned_score * 100 / exam.possible_score)}%)${progress}`;
}

export default function StudentDashboard() {
  const { user, logout, sessionId, setSession } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loadingExam, setLoadingExam] = useState('');

  const refresh = useCallback(async () => {
    try { setData(await getStudentDashboard()); } catch (err) { setError(err.message); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function enterExam(codeOrId) {
    setLoadingExam(codeOrId);
    setError('');
    try {
      const joined = await joinSession(codeOrId);
      setSession(joined.session_id, joined.join_code);
      navigate('/workspace');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingExam('');
    }
  }

  const exams = data?.exams || [];
  const completedExams = exams.filter((exam) => exam.status === 'closed');
  const completedEarned = completedExams.reduce((total, exam) => total + (exam.earned_score || 0), 0);
  const completedPossible = completedExams.reduce((total, exam) => total + (exam.possible_score || 0), 0);
  return (
    <main className="portal-shell">
      <header className="portal-header">
        <div className="portal-brand">TeamFit <span>Exam Portal</span></div>
        <div className="portal-account"><span>{user?.name}</span><button onClick={logout}>Log out</button></div>
      </header>
      <section className="portal-welcome">
        <div><p className="portal-eyebrow">STUDENT DASHBOARD</p><h1>Your exam progress</h1><p>Join an open practical exam or review marks from completed sessions.</p></div>
        {sessionId && <button className="portal-button portal-button--primary" onClick={() => navigate('/workspace')}>Resume current exam</button>}
      </section>
      {error && <div className="portal-alert">{error}</div>}

      <section className="portal-metrics">
        <article><span>Overall marks</span><strong>{completedPossible ? `${completedEarned}/${completedPossible}` : '—'}</strong></article>
        <article><span>Completed exams</span><strong>{completedExams.length}</strong></article>
        <article><span>Exams joined</span><strong>{exams.length}</strong></article>
      </section>

      <div className="portal-grid">
        <section className="portal-panel">
          <div className="portal-panel-heading"><div><p className="portal-eyebrow">AVAILABLE NOW</p><h2>Open practical exams</h2></div><button className="portal-button" onClick={refresh}>Refresh</button></div>
          <form className="portal-join-form" onSubmit={(event) => { event.preventDefault(); enterExam(joinCode.trim().toUpperCase()); }}>
            <input aria-label="Exam code" placeholder="Enter professor's exam code" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} />
            <button className="portal-button portal-button--primary" disabled={!joinCode.trim() || !!loadingExam}>Join by code</button>
          </form>
          <div className="portal-list">
            {(data?.open_exams || []).map((exam) => (
              <article className="portal-row" key={exam.id}>
                <div><h3>{exam.title}</h3><p>Professor {exam.created_by} · {exam.member_count} joined</p></div>
                <button className="portal-button portal-button--primary" disabled={!!loadingExam} onClick={() => enterExam(exam.id)}>{loadingExam === exam.id ? 'Joining…' : 'Join exam'}</button>
              </article>
            ))}
            {!data?.open_exams?.length && <p className="portal-empty">No exams are open right now. Your professor’s code will also work above.</p>}
          </div>
        </section>

        <section className="portal-panel">
          <div className="portal-panel-heading"><div><p className="portal-eyebrow">RESULTS</p><h2>Marks report</h2></div></div>
          <div className="portal-list">
            {exams.map((exam) => <article className="portal-row" key={exam.id}>
              <div><h3>{exam.title}</h3><p>{exam.created_by} · {exam.questions_total} questions · {exam.status}</p></div>
              <strong className="portal-mark">{formatMark(exam, data?.submissions || [])}</strong>
            </article>)}
            {!exams.length && <p className="portal-empty">Your marks report will appear here after you join an exam.</p>}
          </div>
          {data?.submissions?.length > 0 && <details className="portal-details"><summary>Question breakdown</summary>{data.submissions.map((submission) => <div className="portal-breakdown" key={`${submission.session_id}-${submission.question_id}`}><span>{submission.question_title}</span><span>{submission.score} points · {submission.passed_tests}/{submission.total_tests} tests</span></div>)}</details>}
        </section>
      </div>
    </main>
  );
}
