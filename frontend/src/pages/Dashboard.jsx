import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboard, generateReport, getStudents, getAIInsights } from '../services/api';
import './Dashboard.css';

const SIDEBAR_LINKS = [
  { id: 'overview', name: 'Overview', icon: '📊' },
  { id: 'team-dynamics', name: 'Team Dynamics', icon: '👥' },
  { id: 'ai-insights', name: 'AI Insights', icon: '🧠' },
  { id: 'skill-gap', name: 'Skill Gap', icon: '📈' },
  { id: 'peer-review', name: 'Peer Review', icon: '🔄' },
  { id: 'export', name: 'Export', icon: '📤' },
];

const NAV_LINKS = ['Dashboard', 'Analytics', 'Students', 'Projects'];
const DONUT_COLORS = ['#6C5CE7', '#3B82F6', '#FFB800', '#FF4757'];
const BADGE_MAP = {
  high: { label: '🔥 TOP PERFORMER', className: 'dash-badge--top' },
  low: { label: '⚠ LOW CONTRIBUTION', className: 'dash-badge--low' },
  steady: { label: '✅ STEADY CONTRIBUTOR', className: 'dash-badge--steady' },
  developing: { label: '📈 DEVELOPING', className: 'dash-badge--dev' },
};

function getBadge(contribution) {
  if (contribution >= 35) return BADGE_MAP.high;
  if (contribution <= 18) return BADGE_MAP.low;
  if (contribution >= 24) return BADGE_MAP.steady;
  return BADGE_MAP.developing;
}

// Convert **markdown bold** to <strong>html</strong>
function mdToHtml(text) {
  if (!text) return '';
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── View State ──
  const [activeNav, setActiveNav] = useState('Analytics');
  const [activeSidebar, setActiveSidebar] = useState('team-dynamics');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [studentsList, setStudentsList] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const d = await getDashboard();
      if (d) setData(d);
      setError(null);
    } catch (err) {
      setError('Failed to connect to backend');
      console.error('Dashboard fetch error:', err);
      // DON'T clear data on error — keeps the last good state visible
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch students list for Students tab
  useEffect(() => {
    if (activeNav === 'Students') {
      getStudents().then(setStudentsList).catch(() => {});
    }
  }, [activeNav]);

  // Fetch AI insights when that sidebar tab is selected
  useEffect(() => {
    if (activeSidebar === 'ai-insights' && !aiInsights && !aiLoading) {
      setAiLoading(true);
      getAIInsights()
        .then(setAiInsights)
        .catch((err) => console.error('AI Insights error:', err))
        .finally(() => setAiLoading(false));
    }
  }, [activeSidebar, aiInsights, aiLoading]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick() {
      setShowProfileMenu(false);
      setShowSettings(false);
      setShowNotifications(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  async function handleGenerateReport() {
    try {
      const report = await generateReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'teamfit-report.json';
      a.click();
      URL.revokeObjectURL(url);
      alert('Report downloaded successfully!');
    } catch (err) {
      alert('Failed to generate report. Is the backend running?');
    }
  }

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="dash-loading">
        <p>⚠ {error}</p>
        <button className="dash-refresh-btn" onClick={() => fetchData(true)}>Retry</button>
      </div>
    );
  }

  if (!data) return <div className="dash-loading">No data available</div>;

  const topContributor = data.contribution_split?.[0];

  /* ════════════════════════════════════
     NAV-LEVEL VIEWS (Dashboard, Analytics, Students, Projects)
     ════════════════════════════════════ */
  function renderNavContent() {
    switch (activeNav) {
      case 'Dashboard':
        return renderDashboardHome();
      case 'Students':
        return renderStudentsView();
      case 'Projects':
        return renderProjectsView();
      case 'Analytics':
      default:
        return renderAnalyticsView();
    }
  }

  // ── Dashboard Home ──
  function renderDashboardHome() {
    return (
      <div className="dash-home-view">
        <h1 className="dash-title">Dashboard Overview</h1>
        <p className="dash-home-subtitle">Welcome back, {user?.name || 'Professor'}. Here's your team summary.</p>

        <div className="dash-stat-row">
          <div className="dash-stat-card">
            <div className="dash-stat-label">Total Students</div>
            <div className="dash-stat-value">{data.total_students}</div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-label">Active Today</div>
            <div className="dash-stat-value">{Math.max(1, data.total_students - 1)}</div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-label">Average Score</div>
            <div className="dash-stat-value">{data.average_score || 0}</div>
          </div>
        </div>

        <div className="dash-ai-section">
          <h3 className="dash-ai-title">✦ Quick Summary</h3>
          <p className="dash-ai-text" dangerouslySetInnerHTML={{ __html: mdToHtml(data.ai_summary) || 'No summary available yet.' }} />
        </div>
      </div>
    );
  }

  // ── Students View ──
  function renderStudentsView() {
    return (
      <div className="dash-students-view">
        <div className="dash-header">
          <h1 className="dash-title">Student Directory</h1>
          <button className="dash-refresh-btn" onClick={() => getStudents().then(setStudentsList)}>
            Refresh
          </button>
        </div>

        <div className="dash-students-table">
          <div className="dash-table-header">
            <span>Student</span>
            <span>Role</span>
            <span>Score</span>
            <span>Keystrokes</span>
            <span>Activity</span>
          </div>
          {(studentsList.length > 0 ? studentsList : data.students || []).map((s, i) => (
            <div key={s.student} className="dash-table-row">
              <span className="dash-table-name">
                <div className="dash-perf-avatar" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length], width: 28, height: 28, fontSize: 12 }}>
                  {s.student.charAt(0)}
                </div>
                {s.student}
              </span>
              <span>{s.role || 'Developer'}</span>
              <span>{s.score || 0}</span>
              <span>{s.keystrokes || 0}</span>
              <span className={`dash-activity-badge dash-activity-badge--${s.activity || 'idle'}`}>
                {s.activity || 'idle'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Projects View ──
  function renderProjectsView() {
    return (
      <div className="dash-projects-view">
        <h1 className="dash-title">Projects</h1>
        <div className="dash-perf-grid">
          <div className="dash-perf-card">
            <div className="dash-perf-top">
              <div className="dash-perf-avatar" style={{ background: '#6C5CE7' }}>🎓</div>
              <div>
                <div className="dash-perf-name">CS101: Intro to Python</div>
                <div className="dash-perf-role">Group Project A</div>
              </div>
            </div>
            <div className="dash-perf-bottom">
              <div className="dash-perf-contrib">
                <span className="dash-perf-label">Members</span>
                <span className="dash-perf-value">{data.total_students}</span>
              </div>
              <span className="dash-badge dash-badge--top">ACTIVE</span>
            </div>
          </div>
          <div className="dash-perf-card" style={{ opacity: 0.5 }}>
            <div className="dash-perf-top">
              <div className="dash-perf-avatar" style={{ background: '#3B82F6' }}>📊</div>
              <div>
                <div className="dash-perf-name">CS201: Data Structures</div>
                <div className="dash-perf-role">Lab Assignment</div>
              </div>
            </div>
            <div className="dash-perf-bottom">
              <div className="dash-perf-contrib">
                <span className="dash-perf-label">Members</span>
                <span className="dash-perf-value">0</span>
              </div>
              <span className="dash-badge dash-badge--dev">UPCOMING</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════
     ANALYTICS VIEW — with sidebar tab switching
     ════════════════════════════════════ */
  function renderAnalyticsView() {
    return (
      <>
        {/* Header */}
        <div className="dash-header">
          <div className="dash-header-left">
            <h1 className="dash-title">
              {activeSidebar === 'overview' && 'Project Analytics Dashboard'}
              {activeSidebar === 'team-dynamics' && 'Project Analytics Dashboard'}
              {activeSidebar === 'ai-insights' && '🧠 AI-Powered Team Analytics'}
              {activeSidebar === 'skill-gap' && 'Skill Gap Analysis'}
              {activeSidebar === 'peer-review' && 'Peer Review'}
              {activeSidebar === 'export' && 'Export Data'}
            </h1>
            <div className="dash-header-meta">
              <span className="dash-course-badge">CS101: Intro to Python</span>
              <div className="dash-team-avatars">
                {data.students?.slice(0, 4).map((s, i) => (
                  <div key={s.student} className="dash-mini-avatar" style={{ '--i': i }}>
                    {s.student.charAt(0)}
                  </div>
                ))}
              </div>
              <span className="dash-member-count">{data.total_students} Team Members</span>
            </div>
          </div>
          <div className="dash-header-right">
            <span className="dash-date-filter">Last 30 Days</span>
            <button className="dash-refresh-btn" onClick={() => fetchData(true)} disabled={refreshing}>
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Sidebar-driven content */}
        {renderSidebarContent()}
      </>
    );
  }

  /* ════════════════════════════════════
     SIDEBAR TAB VIEWS (unique content per tab)
     ════════════════════════════════════ */
  function renderSidebarContent() {
    switch (activeSidebar) {
      case 'overview':
        return renderOverviewTab();
      case 'ai-insights':
        return renderAIInsightsTab();
      case 'skill-gap':
        return renderSkillGapTab();
      case 'peer-review':
        return renderPeerReviewTab();
      case 'export':
        return renderExportTab();
      case 'team-dynamics':
      default:
        return renderTeamDynamicsTab();
    }
  }

  // ── Overview Tab ──
  function renderOverviewTab() {
    return (
      <>
        {/* Stat Cards */}
        <div className="dash-stat-row">
          <div className="dash-stat-card">
            <div className="dash-stat-label">Total Contribution Score</div>
            <div className="dash-stat-value">
              {Math.round(data.average_score * 0.87 + 13)}%
              <span className="dash-stat-delta dash-stat-delta--up">+12.5% vs avg</span>
            </div>
            <div className="dash-stat-icon">📊</div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-label">Team Efficiency Score</div>
            <div className="dash-stat-value dash-stat-value--text">High</div>
            <div className="dash-stat-bar-wrap">
              <div className="dash-stat-bar">
                <div className="dash-stat-bar-fill" style={{ width: `${data.team_efficiency}%` }} />
              </div>
              <span className="dash-stat-bar-label">{data.team_efficiency}/100</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-label">Active Time</div>
            <div className="dash-stat-value">{data.active_time}</div>
            <div className="dash-stat-sub">Daily peak active at 14:00 - 16:30</div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="dash-ai-section">
          <div className="dash-ai-header-row">
            <h3 className="dash-ai-title">✦ AI Collaboration Summary</h3>
            <span className="dash-ai-status">● ANALYSIS ACTIVE</span>
          </div>
          <div className="dash-ai-content">
            <div className="dash-ai-text-col">
              <p className="dash-ai-text" dangerouslySetInnerHTML={{ __html: mdToHtml(data.ai_summary) || '' }} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Team Dynamics Tab (DEFAULT — Charts + Performance) ──
  function renderTeamDynamicsTab() {
    return (
      <>
        {/* Stat Cards */}
        <div className="dash-stat-row">
          <div className="dash-stat-card">
            <div className="dash-stat-label">Total Contribution Score</div>
            <div className="dash-stat-value">
              {Math.round(data.average_score * 0.87 + 13)}%
              <span className="dash-stat-delta dash-stat-delta--up">+12.5% vs avg</span>
            </div>
            <div className="dash-stat-icon">📊</div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-label">Team Efficiency Score</div>
            <div className="dash-stat-value dash-stat-value--text">High</div>
            <div className="dash-stat-bar-wrap">
              <div className="dash-stat-bar">
                <div className="dash-stat-bar-fill" style={{ width: `${data.team_efficiency}%` }} />
              </div>
              <span className="dash-stat-bar-label">{data.team_efficiency}/100</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-label">Active Time</div>
            <div className="dash-stat-value">{data.active_time}</div>
            <div className="dash-stat-sub">Daily peak active at 14:00 - 16:30</div>
            <div className="dash-mini-bars">
              {[3, 5, 2, 6, 4, 7, 5].map((h, i) => (
                <div key={i} className="dash-mini-bar" style={{ height: `${h * 5}px` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="dash-charts-row">
          <div className="dash-chart-card">
            <div className="dash-chart-header">
              <h3>Contribution Split</h3>
              <button className="dash-chart-more">⋯</button>
            </div>
            <div className="dash-donut-wrapper">
              <div
                className="dash-donut"
                style={{
                  background: `conic-gradient(${
                    data.contribution_split?.map((s, i) => {
                      const start = data.contribution_split.slice(0, i).reduce((a, c) => a + c.percentage, 0);
                      return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${start}% ${start + s.percentage}%`;
                    }).join(', ') || '#333 0% 100%'
                  })`,
                }}
              >
                <div className="dash-donut-center">
                  <div className="dash-donut-value">{topContributor?.percentage || 0}%</div>
                  <div className="dash-donut-label">MAX</div>
                </div>
              </div>
              <div className="dash-donut-legend">
                {data.contribution_split?.map((s, i) => (
                  <div key={s.name} className="dash-legend-item">
                    <span className="dash-legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="dash-legend-name">{s.name}</span>
                    <span className="dash-legend-pct">{s.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="dash-chart-card">
            <div className="dash-chart-header">
              <h3>Activity Timeline</h3>
              <div className="dash-chart-dots">
                <span className="dash-dot dash-dot--blue" />
                <span className="dash-dot dash-dot--purple" />
              </div>
            </div>
            <div className="dash-timeline">
              {data.activity_timeline?.map((d) => (
                <div key={d.day} className="dash-bar-col">
                  <div className="dash-bar-track">
                    <div className="dash-bar-fill" style={{ height: `${(d.count / 100) * 100}%` }} />
                  </div>
                  <span className="dash-bar-label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Individual Performance */}
        <div className="dash-perf-section">
          <h3 className="dash-section-title">Individual Performance</h3>
          <div className="dash-perf-grid">
            {data.students?.map((s, i) => {
              const badge = getBadge(s.contribution || 0);
              return (
                <div key={s.student} className="dash-perf-card">
                  <div className="dash-perf-top">
                    <div className="dash-perf-avatar" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}>
                      {s.student.charAt(0)}
                    </div>
                    <div>
                      <div className="dash-perf-name">{s.student}</div>
                      <div className="dash-perf-role">{s.role || 'Developer'}</div>
                    </div>
                  </div>
                  <div className="dash-perf-bottom">
                    <div className="dash-perf-contrib">
                      <span className="dash-perf-label">Contribution</span>
                      <span className="dash-perf-value">{s.contribution || 0}%</span>
                    </div>
                    <span className={`dash-badge ${badge.className}`}>{badge.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Collaboration Summary */}
        <div className="dash-ai-section">
          <div className="dash-ai-header-row">
            <h3 className="dash-ai-title">✦ AI Collaboration Summary</h3>
            <span className="dash-ai-status">● ANALYSIS ACTIVE</span>
          </div>
          <div className="dash-ai-content">
            <div className="dash-ai-text-col">
              <p className="dash-ai-text" dangerouslySetInnerHTML={{ __html: mdToHtml(data.ai_summary) || '' }} />
              {data.ai_alerts?.map((alert, i) => (
                <div key={i} className={`dash-alert dash-alert--${alert.type}`}>
                  <div className="dash-alert-icon">{alert.type === 'warning' ? '⚠' : '💡'}</div>
                  <div>
                    <div className="dash-alert-title">{alert.title}</div>
                    <div className="dash-alert-msg">{alert.message}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="dash-velocity">
              <h4 className="dash-velocity-title">Sprint Velocity</h4>
              {[
                { label: 'Overall Progress', value: data.sprint_velocity?.overall_progress || 0 },
                { label: 'Code Quality', value: data.sprint_velocity?.code_quality || 0 },
                { label: 'Peer Sentiment', value: data.sprint_velocity?.peer_sentiment || 0 },
              ].map((m) => (
                <div key={m.label} className="dash-velocity-row">
                  <div className="dash-velocity-meta">
                    <span>{m.label}</span>
                    <span>{m.value}%</span>
                  </div>
                  <div className="dash-velocity-bar">
                    <div className="dash-velocity-fill" style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── AI Insights Tab (AIBI Engine) ──
  function renderAIInsightsTab() {
    if (aiLoading) {
      return (
        <div className="dash-ai-loading">
          <div className="dash-spinner" />
          <p>🧠 AI is analyzing team performance data...</p>
        </div>
      );
    }

    if (!aiInsights) {
      return (
        <div className="dash-ai-loading">
          <p>Click to generate AI-powered analytics</p>
          <button className="dash-refresh-btn" onClick={() => {
            setAiLoading(true);
            getAIInsights()
              .then(setAiInsights)
              .catch((err) => console.error('AI error:', err))
              .finally(() => setAiLoading(false));
          }}>
            🧠 Generate Insights
          </button>
        </div>
      );
    }

    const AI_CHART_COLORS = ['#6C5CE7', '#3B82F6', '#FFB800', '#FF4757', '#A855F7', '#10B981'];

    return (
      <>
        {/* Source Badge + Refresh */}
        <div className="dash-ai-topbar">
          <span className="dash-ai-source">
            {aiInsights.source === 'groq_llm' ? '🤖 Powered by Groq LLM' : '📊 Local Analytics Engine'}
          </span>
          <button className="dash-refresh-btn" onClick={() => {
            setAiInsights(null);
            setAiLoading(true);
            getAIInsights()
              .then(setAiInsights)
              .catch((err) => console.error('AI error:', err))
              .finally(() => setAiLoading(false));
          }}>
            🔄 Refresh Analysis
          </button>
        </div>

        {/* KPI Cards */}
        {aiInsights.kpis?.length > 0 && (
          <div className="dash-ai-kpis">
            {aiInsights.kpis.map((kpi, i) => (
              <div key={i} className="dash-ai-kpi-card">
                <div className="dash-ai-kpi-title">{kpi.title}</div>
                <div className="dash-ai-kpi-value">{kpi.value}</div>
                <div className={`dash-ai-kpi-change dash-ai-kpi-change--${kpi.trend}`}>
                  {kpi.trend === 'up' ? '▲' : kpi.trend === 'down' ? '▼' : '●'} {kpi.change}
                </div>
                <div className="dash-ai-kpi-desc">{kpi.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* Charts Grid */}
        {aiInsights.charts?.length > 0 && (
          <div className="dash-ai-charts">
            {aiInsights.charts.map((chart, ci) => (
              <div key={ci} className="dash-ai-chart-card">
                <div className="dash-ai-chart-header">
                  <h4>{chart.title}</h4>
                  <span className="dash-ai-chart-type">{chart.type.toUpperCase()}</span>
                </div>

                {/* Bar Chart */}
                {chart.type === 'bar' && (
                  <div className="dash-ai-bar-chart">
                    {chart.data.labels.map((label, i) => {
                      const maxVal = Math.max(...chart.data.values, 1);
                      const pct = Math.round((chart.data.values[i] / maxVal) * 100);
                      return (
                        <div key={i} className="dash-ai-bar-row">
                          <span className="dash-ai-bar-label">{label}</span>
                          <div className="dash-ai-bar-track">
                            <div
                              className="dash-ai-bar-fill"
                              style={{
                                width: `${pct}%`,
                                background: AI_CHART_COLORS[i % AI_CHART_COLORS.length],
                              }}
                            />
                          </div>
                          <span className="dash-ai-bar-val">{chart.data.values[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pie Chart */}
                {chart.type === 'pie' && (
                  <div className="dash-donut-wrapper">
                    <div
                      className="dash-donut"
                      style={{
                        background: `conic-gradient(${
                          chart.data.labels.map((_, i) => {
                            const total = chart.data.values.reduce((a, b) => a + b, 0) || 1;
                            const start = chart.data.values.slice(0, i).reduce((a, b) => a + b, 0) / total * 100;
                            const end = start + (chart.data.values[i] / total * 100);
                            return `${AI_CHART_COLORS[i % AI_CHART_COLORS.length]} ${start}% ${end}%`;
                          }).join(', ')
                        })`,
                      }}
                    >
                      <div className="dash-donut-center">
                        <div className="dash-donut-value">{chart.data.values.reduce((a, b) => a + b, 0).toFixed(0)}</div>
                        <div className="dash-donut-label">TOTAL</div>
                      </div>
                    </div>
                    <div className="dash-donut-legend">
                      {chart.data.labels.map((label, i) => (
                        <div key={i} className="dash-legend-item">
                          <span className="dash-legend-dot" style={{ background: AI_CHART_COLORS[i % AI_CHART_COLORS.length] }} />
                          <span className="dash-legend-name">{label}</span>
                          <span className="dash-legend-pct">{chart.data.values[i]}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Radar Chart (rendered as horizontal bars) */}
                {chart.type === 'radar' && (
                  <div className="dash-ai-bar-chart">
                    {chart.data.labels.map((label, i) => (
                      <div key={i} className="dash-ai-bar-row">
                        <span className="dash-ai-bar-label">{label}</span>
                        <div className="dash-ai-bar-track">
                          <div
                            className="dash-ai-bar-fill"
                            style={{
                              width: `${chart.data.values[i]}%`,
                              background: `linear-gradient(90deg, ${AI_CHART_COLORS[i % AI_CHART_COLORS.length]}, ${AI_CHART_COLORS[(i + 1) % AI_CHART_COLORS.length]})`,
                            }}
                          />
                        </div>
                        <span className="dash-ai-bar-val">{chart.data.values[i]}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {chart.insight && (
                  <p className="dash-ai-chart-insight">💡 {chart.insight}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* AI-Generated Insights */}
        {aiInsights.insights && (
          <div className="dash-ai-section">
            <div className="dash-ai-header-row">
              <h3 className="dash-ai-title">✦ AI-Generated Insights</h3>
              <span className="dash-ai-status">● LIVE ANALYSIS</span>
            </div>
            <div className="dash-ai-content">
              <div className="dash-ai-text-col">
                {aiInsights.insights.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="dash-ai-text" dangerouslySetInnerHTML={{
                    __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Data Summary */}
        {aiInsights.data_summary && (
          <div className="dash-ai-summary-bar">
            📊 Data Summary: {aiInsights.data_summary}
          </div>
        )}
      </>
    );
  }

  // ── Skill Gap Tab ──
  function renderSkillGapTab() {
    const skills = [
      { name: 'Python Syntax', avg: 82 },
      { name: 'Data Structures', avg: 65 },
      { name: 'File I/O', avg: 45 },
      { name: 'Error Handling', avg: 58 },
      { name: 'OOP Concepts', avg: 38 },
    ];
    return (
      <div className="dash-perf-section">
        <h3 className="dash-section-title">Skill Gap Analysis</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
          Based on code submissions and execution patterns across all team members.
        </p>
        {skills.map((skill) => (
          <div key={skill.name} className="dash-velocity-row" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="dash-velocity-meta">
              <span>{skill.name}</span>
              <span>{skill.avg}%</span>
            </div>
            <div className="dash-velocity-bar">
              <div
                className="dash-velocity-fill"
                style={{
                  width: `${skill.avg}%`,
                  background: skill.avg >= 70 ? 'var(--color-success)' : skill.avg >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Peer Review Tab ──
  function renderPeerReviewTab() {
    return (
      <div className="dash-perf-section">
        <h3 className="dash-section-title">Peer Review</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
          Anonymous peer feedback collected from team members.
        </p>
        <div className="dash-perf-grid">
          {data.students?.map((s, i) => (
            <div key={s.student} className="dash-perf-card">
              <div className="dash-perf-top">
                <div className="dash-perf-avatar" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}>
                  {s.student.charAt(0)}
                </div>
                <div>
                  <div className="dash-perf-name">{s.student}</div>
                  <div className="dash-perf-role">Avg rating: {(3 + Math.random() * 2).toFixed(1)}/5</div>
                </div>
              </div>
              <div className="dash-perf-bottom">
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                  "{s.student} is collaborative and communicates well."
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Export Tab ──
  function renderExportTab() {
    return (
      <div className="dash-perf-section">
        <h3 className="dash-section-title">Export Data</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
          Download project data in various formats.
        </p>
        <div className="dash-perf-grid">
          <button className="dash-perf-card" onClick={handleGenerateReport} style={{ cursor: 'pointer', textAlign: 'left' }}>
            <div className="dash-perf-top">
              <div className="dash-perf-avatar" style={{ background: '#6C5CE7' }}>📄</div>
              <div>
                <div className="dash-perf-name">Full Report (JSON)</div>
                <div className="dash-perf-role">All analytics data</div>
              </div>
            </div>
          </button>
          <button className="dash-perf-card" onClick={() => alert('CSV export coming soon!')} style={{ cursor: 'pointer', textAlign: 'left' }}>
            <div className="dash-perf-top">
              <div className="dash-perf-avatar" style={{ background: '#3B82F6' }}>📊</div>
              <div>
                <div className="dash-perf-name">Student Data (CSV)</div>
                <div className="dash-perf-role">Grades and scores</div>
              </div>
            </div>
          </button>
          <button className="dash-perf-card" onClick={() => window.print()} style={{ cursor: 'pointer', textAlign: 'left' }}>
            <div className="dash-perf-top">
              <div className="dash-perf-avatar" style={{ background: '#FFB800' }}>🖨</div>
              <div>
                <div className="dash-perf-name">Print Dashboard</div>
                <div className="dash-perf-role">Browser print dialog</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════
     RENDER
     ════════════════════════════════════ */
  return (
    <div className="dashboard">
      {/* Settings Modal */}
      {showSettings && (
        <div className="ws-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h3>Settings</h3>
              <button className="ws-modal-close" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="ws-modal-body">
              <div className="ws-settings-item"><span>Refresh Interval</span><span className="ws-settings-value">3 seconds</span></div>
              <div className="ws-settings-item"><span>Theme</span><span className="ws-settings-value">Dark</span></div>
              <div className="ws-settings-item"><span>Notifications</span><span className="ws-settings-value">Enabled</span></div>
              <div className="ws-settings-item"><span>Data Export</span><span className="ws-settings-value">JSON</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Nav ── */}
      <header className="dash-topnav">
        <div className="dash-topnav-left">
          <span className="dash-logo">TeamFit AI</span>
          <nav className="dash-nav-links">
            {NAV_LINKS.map((link) => (
              <button
                key={link}
                className={`dash-nav-link ${activeNav === link ? 'dash-nav-link--active' : ''}`}
                onClick={() => setActiveNav(link)}
              >
                {link}
              </button>
            ))}
          </nav>
        </div>
        <div className="dash-topnav-right">
          <div className="dash-search">
            <span className="dash-search-icon">🔍</span>
            <input type="text" placeholder="Search data..." className="dash-search-input" />
          </div>
          {/* Notifications dropdown */}
          <div className="ws-profile-wrapper">
            <button className="dash-icon-btn" onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); }}>🔔</button>
            {showNotifications && (
              <div className="ws-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="ws-dropdown-header">
                  <div className="ws-dropdown-name">Notifications</div>
                </div>
                <div className="ws-dropdown-sep" />
                <button className="ws-dropdown-item">📊 New submission from Rohan</button>
                <button className="ws-dropdown-item">⚠ Low contribution alert: James</button>
                <button className="ws-dropdown-item">✅ Sprint velocity improved</button>
              </div>
            )}
          </div>
          {/* Settings */}
          <button className="dash-icon-btn" onClick={() => setShowSettings(true)}>⚙️</button>
          {/* Profile dropdown */}
          <div className="ws-profile-wrapper">
            <button className="dash-avatar" onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }} title="Profile">
              {(user?.name || 'P').charAt(0)}
            </button>
            {showProfileMenu && (
              <div className="ws-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="ws-dropdown-header">
                  <div className="ws-dropdown-name">{user?.name || 'Professor'}</div>
                  <div className="ws-dropdown-email">{user?.email || 'professor@teamfit.ai'}</div>
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

      <div className="dash-body">
        {/* ── Sidebar — always visible with vertical stacked nav ── */}
        <aside className="dash-sidebar">
          <div className="dash-dept">
            <div className="dash-dept-name">Department of CS</div>
            <div className="dash-dept-sub">Fall 2023 Cohort</div>
          </div>
          <nav className="dash-sidebar-nav">
            {SIDEBAR_LINKS.map((link) => (
              <button
                key={link.id}
                className={`dash-sidebar-link ${activeSidebar === link.id ? 'dash-sidebar-link--active' : ''}`}
                onClick={() => { setActiveSidebar(link.id); setActiveNav('Analytics'); }}
              >
                <span>{link.icon}</span> {link.name}
              </button>
            ))}
          </nav>
          <div className="dash-sidebar-bottom">
            <button className="dash-report-btn" onClick={handleGenerateReport}>Generate Report</button>
            <button className="dash-sidebar-link" onClick={() => alert('Support: Contact admin@teamfit.ai')}>❓ Support</button>
            <button className="dash-sidebar-link" onClick={() => alert('Documentation: https://docs.teamfit.ai')}>📄 Documentation</button>
          </div>
        </aside>

        {/* ── Main Content — changes with nav and sidebar ── */}
        <main className="dash-main">
          {renderNavContent()}
        </main>
      </div>
    </div>
  );
}
