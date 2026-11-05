import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/auth';
import { createSession, generateQuestionDraft, getDashboard, startExam, closeExam } from '../services/api';
import './ExamPortal.css';

const emptyQuestion = () => ({ idea: '', difficulty: 'intermediate', title: '', statement: '', exampleInput: '', exampleOutput: '', testCases: [{ stdin: '', expectedOutput: '' }], starterCode: '', maxScore: 100 });

export default function ProfessorDashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingQuestion, setGeneratingQuestion] = useState(null);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const refresh = useCallback(async () => {
    try { setData(await getDashboard()); } catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  function updateQuestion(index, field, value) {
    setQuestions((current) => current.map((question, i) => i === index ? { ...question, [field]: value } : question));
  }

  function updateTestCase(questionIndex, caseIndex, field, value) {
    setQuestions((current) => current.map((question, index) => index !== questionIndex ? question : {
      ...question,
      testCases: question.testCases.map((testCase, testIndex) => testIndex === caseIndex ? { ...testCase, [field]: value } : testCase),
    }));
  }

  async function generateQuestion(index) {
    const question = questions[index];
    if (!question?.idea?.trim()) {
      setError('Add a short idea for the question you want AI to create.');
      return;
    }
    setGeneratingQuestion(index);
    setError('');
    try {
      const { question: draft } = await generateQuestionDraft(question.idea.trim(), question.difficulty || 'intermediate');
      setQuestions((current) => current.map((item, i) => i === index ? {
        ...item,
        title: draft.title,
        statement: draft.statement,
        exampleInput: draft.example_input,
        exampleOutput: draft.example_output,
        starterCode: draft.starter_code,
        testCases: draft.test_cases.map((testCase) => ({ stdin: testCase.stdin, expectedOutput: testCase.expected_output })),
        maxScore: draft.max_score || 100,
      } : item));
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingQuestion(null);
    }
  }

  async function saveExam(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const examQuestions = questions.map((question) => ({
      title: question.title,
      statement: question.statement,
      starter_code: question.starterCode,
      examples: [{ input: question.exampleInput, output: question.exampleOutput }],
      test_cases: [
        ...(question.exampleInput || question.exampleOutput ? [{ stdin: question.exampleInput, expected_output: question.exampleOutput, hidden: false }] : []),
        ...question.testCases.map((testCase) => ({ stdin: testCase.stdin, expected_output: testCase.expectedOutput, hidden: true })),
      ],
      max_score: Number(question.maxScore),
    }));
    try {
      await createSession(title, examQuestions);
      setCreating(false);
      setTitle('');
      setQuestions([emptyQuestion()]);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  async function publishExam(sessionId) {
    setError('');
    try { await startExam(sessionId); await refresh(); }
    catch (err) { setError(err.message); }
  }

  async function endExam(sessionId) {
    setError('');
    try { await closeExam(sessionId); await refresh(); }
    catch (err) { setError(err.message); }
  }

  function exportSession(session, result) {
    const columns = ['Student', 'Rank', 'Score', 'Possible points', 'Questions solved', 'Questions total'];
    const lines = [columns, ...(result?.leaderboard || []).map((student) => [student.user_name, student.rank, student.score, student.max_score, student.questions_solved, student.questions_total])];
    const csv = lines.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `${session.title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}-results.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const sessions = data?.sessions || [];
  const students = data?.total_students || 0;
  return (
    <main className="portal-shell">
      <header className="portal-header">
        <div className="portal-brand">TeamFit <span>Professor Console</span></div>
        <div className="portal-account"><span>{user?.name}</span><button onClick={logout}>Log out</button></div>
      </header>
      <section className="portal-welcome">
        <div><p className="portal-eyebrow">PRACTICAL EXAMS</p><h1>Class performance</h1><p>Create coding exams, publish them to students, and review session results.</p></div>
        <button className="portal-button portal-button--primary" onClick={() => setCreating((value) => !value)}>{creating ? 'Close form' : '＋ Create practical exam'}</button>
      </section>
      {error && <div className="portal-alert">{error}</div>}

      <section className="portal-metrics">
        <article><span>Exam sessions</span><strong>{data?.total_sessions || 0}</strong></article>
        <article><span>Students across sessions</span><strong>{students}</strong></article>
        <article><span>Open exams</span><strong>{sessions.filter((session) => session.status === 'open').length}</strong></article>
      </section>

      {creating && <form className="portal-panel portal-form" onSubmit={saveExam}>
        <div className="portal-panel-heading"><div><p className="portal-eyebrow">NEW EXAM</p><h2>Set the practical</h2></div></div>
        <label>Exam title<input required maxLength={120} placeholder="e.g. Data structures practical" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        {questions.map((question, index) => <fieldset className="portal-question-form" key={index}>
          <legend>Question {index + 1}</legend>
          <div className="portal-ai-question">
            <div><strong>Draft this question with AI</strong><span>Describe the concept; AI will prepare an editable problem, example, starter code, and hidden tests.</span></div>
            <label>Short question idea<textarea rows={2} maxLength={2000} value={question.idea || ''} onChange={(event) => updateQuestion(index, 'idea', event.target.value)} placeholder="e.g. Find the shortest path in a grid with obstacles" /></label>
            <div className="portal-form-columns portal-ai-question-actions">
              <label>Difficulty<select value={question.difficulty || 'intermediate'} onChange={(event) => updateQuestion(index, 'difficulty', event.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
              <button className="portal-button portal-button--primary" type="button" onClick={() => generateQuestion(index)} disabled={generatingQuestion !== null || saving}>{generatingQuestion === index ? 'Generating question…' : '✨ Generate question'}</button>
            </div>
            <small>Review the generated statement and hidden tests before saving the exam.</small>
          </div>
          <label>Question title<input required maxLength={160} value={question.title} onChange={(event) => updateQuestion(index, 'title', event.target.value)} placeholder="e.g. Pair Sum" /></label>
          <label>Problem description<textarea required maxLength={20000} rows={5} value={question.statement} onChange={(event) => updateQuestion(index, 'statement', event.target.value)} placeholder="Describe the problem, input, output, and constraints." /></label>
          <div className="portal-form-columns">
            <label>Example input<textarea rows={3} value={question.exampleInput} onChange={(event) => updateQuestion(index, 'exampleInput', event.target.value)} /></label>
            <label>Example output<textarea rows={3} value={question.exampleOutput} onChange={(event) => updateQuestion(index, 'exampleOutput', event.target.value)} /></label>
          </div>
          <div className="portal-test-cases"><div className="portal-test-cases-heading"><strong>Hidden test cases</strong><span>Inputs and expected output stay private from students.</span></div>
            {question.testCases.map((testCase, caseIndex) => <div className="portal-form-columns portal-test-case" key={caseIndex}>
              <label>Input {caseIndex + 1}<textarea required rows={3} value={testCase.stdin} onChange={(event) => updateTestCase(index, caseIndex, 'stdin', event.target.value)} /></label>
              <label>Expected output<textarea required rows={3} value={testCase.expectedOutput} onChange={(event) => updateTestCase(index, caseIndex, 'expectedOutput', event.target.value)} /></label>
              {question.testCases.length > 1 && <button className="portal-button portal-remove-test" type="button" onClick={() => updateQuestion(index, 'testCases', question.testCases.filter((_, i) => i !== caseIndex))}>Remove test case</button>}
            </div>)}
            <button className="portal-button" type="button" onClick={() => updateQuestion(index, 'testCases', [...question.testCases, { stdin: '', expectedOutput: '' }])}>＋ Add hidden test case</button>
          </div>
          <label>Starter code<textarea rows={4} value={question.starterCode} onChange={(event) => updateQuestion(index, 'starterCode', event.target.value)} placeholder="Optional starter code shown in the editor." /></label>
          <label>Points<input type="number" min="1" max="1000" required value={question.maxScore} onChange={(event) => updateQuestion(index, 'maxScore', event.target.value)} /></label>
        </fieldset>)}
        <div className="portal-form-actions"><button className="portal-button" type="button" onClick={() => setQuestions((current) => [...current, emptyQuestion()])}>Add question</button><button className="portal-button portal-button--primary" disabled={saving}>{saving ? 'Saving…' : 'Save exam as draft'}</button></div>
      </form>}

      <section className="portal-panel">
        <div className="portal-panel-heading"><div><p className="portal-eyebrow">YOUR EXAMS</p><h2>Sessions and results</h2></div><button className="portal-button" onClick={refresh}>Refresh</button></div>
        <div className="portal-list">
          {sessions.map((session) => {
            const result = data.session_results?.find((item) => item.session_id === session.id);
            return <article className="portal-session-card" key={session.id}>
              <div className="portal-row"><div><span className={`portal-status portal-status--${session.status}`}>{session.status}</span><h3>{session.title}</h3><p>{session.member_count} students · Code <strong>{session.join_code}</strong></p></div>
                <div className="portal-form-actions">{session.status === 'draft' && <button className="portal-button portal-button--primary" onClick={() => publishExam(session.id)}>Publish exam</button>}{session.status === 'open' && <button className="portal-button" onClick={() => endExam(session.id)}>Close exam</button>}{result && <button className="portal-button" onClick={() => exportSession(session, result)}>Export CSV</button>}</div>
              </div>
              {result?.leaderboard?.length > 0 && <div className="portal-leaderboard"><h4>Student results · select a student for skill gaps</h4>{result.leaderboard.map((student) => <button className="portal-breakdown portal-student-result" key={student.user_name} onClick={() => setSelectedStudent({ sessionId: session.id, studentName: student.user_name })}><span>#{student.rank} {student.user_name}</span><span>{student.score}/{student.max_score} · {student.questions_solved}/{student.questions_total} solved</span></button>)}</div>}
              {selectedStudent?.sessionId === session.id && <div className="portal-insight"><strong>{selectedStudent.studentName}: evidence-based skill gap review</strong>{(result.question_results || []).filter((item) => item.student_name === selectedStudent.studentName).map((item) => <p key={item.question_id}><b>{item.question_title}</b> — {item.score}/{item.max_score} points, {item.passed_tests}/{item.total_tests} tests passed. {item.passed_tests < item.total_tests ? 'Review the failing edge cases and expected output handling.' : 'All available tests passed.'}</p>)}{!(result.question_results || []).some((item) => item.student_name === selectedStudent.studentName) && <p>No submissions recorded yet. There is not enough evidence to infer a skill gap.</p>}</div>}
              {result?.question_results?.length > 0 && <div className="portal-insight"><strong>Class insight</strong><p>{result.leaderboard.length} students have joined; {result.question_results.length} question submissions have been graded. Question-level outcomes are based on test cases passed. Download CSV to review ranked marks.</p></div>}
            </article>;
          })}
          {!sessions.length && <p className="portal-empty">No exams created yet. Add a question and its hidden test cases to get started.</p>}
        </div>
      </section>
      <section className="portal-panel portal-note"><h2>Grading and reports</h2><p>Marks are calculated from hidden test case outcomes, with each question weighted by its professor-assigned points. Student skill gap notes use recorded question results. CSV reports can be downloaded now; sending email reports needs a configured mail delivery service.</p></section>
    </main>
  );
}
