import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const nodes = document.querySelectorAll(".landing-page .reveal");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("visible"));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="landing-page">

      <nav>
        <div className="nav-logo">
          Team<em>Fit</em> AI
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#cta">For educators</a>
        </div>
        <div className="nav-cta">
          <button className="btn-outline" onClick={() => navigate("/login")}>
            Log in
          </button>
          <button className="btn-glow" onClick={() => navigate("/login")}>
            Get started free
          </button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-inner">
          <div className="reveal">
            <div className="hero-badge">
              <div className="badge-dot">
                <div className="badge-pulse"></div>
              </div>
              Professor-led coding practicals
            </div>
            <h1>
              Practical exams,
              <br />
              <em className="h1-line2">clearly assessed.</em>
            </h1>
            <p className="hero-sub">
              Professors create coding exams with private test cases. Students
              solve problems in a focused workspace and review their results.
            </p>
            <div className="hero-actions">
              <button
                className="hero-btn-main"
                onClick={() => navigate("/login")}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Choose your role
              </button>
              <button
                className="hero-btn-ghost"
                onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                How it works
              </button>
            </div>
            <div className="hero-tags">
              <span className="htag">Student & professor roles</span>
              <span className="htag">Private test cases</span>
              <span className="htag">Isolated code runner</span>
              <span className="htag">Progress reports</span>
            </div>
          </div>

          <div
            className="editor-wrap reveal"
            style={{ transitionDelay: ".2s" }}
          >
            <div className="float-tag ft1">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: "5px",
                }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Session active
            </div>
            <div className="float-tag ft2">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: "5px",
                }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Test-based grading
            </div>
            <div className="editor-card">
              <div className="editor-topbar">
                <div
                  className="tbar-dot"
                  style={{ background: "#ff5f57" }}
                ></div>
                <div
                  className="tbar-dot"
                  style={{ background: "#febc2e" }}
                ></div>
                <div
                  className="tbar-dot"
                  style={{ background: "#28c840" }}
                ></div>
                <div className="editor-tab">solution.py · sample data</div>
                <div className="live-badge">
                  <div className="live-dot"></div>Sample workspace
                </div>
              </div>
              <div className="code-body">
                <div>
                  <span className="ln">1</span>
                  <span className="cm"># Sample exam workspace</span>
                </div>
                <div>
                  <span className="ln">2</span>
                </div>
                <div>
                  <span className="ln">3</span>
                  <span className="kw">def </span>
                  <span className="fn">merge_sort</span>(arr):
                </div>
                <div>
                  <span className="ln">4</span>&nbsp;&nbsp;
                  <span className="kw">if </span>len(arr) &lt;= 1:
                </div>
                <div>
                  <span className="ln">5</span>&nbsp;&nbsp;&nbsp;&nbsp;
                  <span className="kw">return </span>arr
                </div>
                <div>
                  <span className="ln">6</span>&nbsp;&nbsp;mid = len(arr) // 2
                </div>
                <div>
                  <span className="ln">7</span>&nbsp;&nbsp;left&nbsp; =
                  merge_sort(arr[:mid])
                </div>
                <div>
                  <span className="ln">8</span>&nbsp;&nbsp;right =
                  merge_sort(arr[mid:])
                </div>
                <div>
                  <span className="ln">9</span>&nbsp;&nbsp;
                  <span className="kw">return </span>
                  <span className="fn">merge</span>(left, right)
                  <span className="cursor-blink"></span>
                </div>
              </div>
              <div className="contrib-panel">
                <div className="cp-label">Sample data · question outcomes</div>
                <div className="contrib-row">
                  <div
                    className="contrib-avatar"
                    style={{
                      background: "rgba(29,78,216,.3)",
                      color: "var(--accent1)",
                    }}
                  >
                    AS
                  </div>
                  <div className="contrib-name" style={{ fontSize: "12px" }}>
                    Aanya S.
                  </div>
                  <div className="contrib-bar-wrap">
                    <div
                      className="contrib-bar"
                      id="bar1"
                      style={{
                        width: "68%",
                        background: "#1d4ed8",
                      }}
                    ></div>
                  </div>
                  <div
                    className="contrib-pct"
                    style={{ color: "var(--accent1)" }}
                    id="pct1"
                  >
                    68%
                  </div>
                </div>
                <div className="contrib-row">
                  <div
                    className="contrib-avatar"
                    style={{
                      background: "rgba(5,150,105,.25)",
                      color: "var(--accent2)",
                    }}
                  >
                    RM
                  </div>
                  <div className="contrib-name" style={{ fontSize: "12px" }}>
                    Rohan M.
                  </div>
                  <div className="contrib-bar-wrap">
                    <div
                      className="contrib-bar"
                      id="bar2"
                      style={{
                        width: "22%",
                        background: "#059669",
                      }}
                    ></div>
                  </div>
                  <div
                    className="contrib-pct"
                    style={{ color: "var(--accent2)" }}
                    id="pct2"
                  >
                    22%
                  </div>
                </div>
                <div className="contrib-row">
                  <div
                    className="contrib-avatar"
                    style={{
                      background: "rgba(5,150,105,.2)",
                      color: "var(--green)",
                    }}
                  >
                    ZK
                  </div>
                  <div className="contrib-name" style={{ fontSize: "12px" }}>
                    Zaid K.
                  </div>
                  <div className="contrib-bar-wrap">
                    <div
                      className="contrib-bar"
                      id="bar3"
                      style={{
                        width: "10%",
                        background: "#64748b",
                      }}
                    ></div>
                  </div>
                  <div
                    className="contrib-pct"
                    style={{ color: "var(--green)" }}
                    id="pct3"
                  >
                    10%
                  </div>
                </div>
              </div>
              <div className="metrics-row">
                <div className="metric-box">
                  <div className="metric-val" id="mks">
                    3
                  </div>
                  <div className="metric-lbl">Sample questions</div>
                </div>
                <div className="metric-box">
                  <div className="metric-val" id="mat">
                    24
                  </div>
                  <div className="metric-lbl">Example students</div>
                </div>
                <div className="metric-box">
                  <div className="metric-val" id="msc">
                    35
                  </div>
                  <div className="metric-lbl">Possible points</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="trust">
        <div className="trust-scroll" id="trust-scroll">
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(29,78,216,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            Open exam sessions
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(5,150,105,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            Hidden test grading
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(5,150,105,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            Monaco live editor
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(71,85,105,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#475569"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            Professor dashboard
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(217,119,6,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#d97706"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            Render sandboxed
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(29,78,216,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            JWT role-based auth
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(5,150,105,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            Question-level marks
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(5,150,105,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            CSV result exports
          </div>
          {/* Duplicates for scrolling */}
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(29,78,216,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            Open exam sessions
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(5,150,105,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            Hidden test grading
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(5,150,105,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            Monaco live editor
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(71,85,105,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#475569"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            Professor dashboard
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(217,119,6,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#d97706"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            Render sandboxed
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(29,78,216,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            JWT role-based auth
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(5,150,105,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            Question-level marks
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(5,150,105,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            CSV result exports
          </div>
        </div>
      </div>

      <section className="features" id="features">
        <div
          style={{ textAlign: "center", marginBottom: 0 }}
          className="reveal"
        >
          <div className="section-eyebrow">Features</div>
          <h2 className="section-heading">Built to catch what grades can't</h2>
          <p
            style={{
              fontSize: "15px",
              color: "var(--muted)",
              marginTop: "14px",
              maxWidth: "480px",
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.7,
            }}
          >
            Everything a professor needs to know who did the work — without
            asking students to self-report.
          </p>
        </div>
        <div
          className="features-grid reveal"
          style={{ transitionDelay: ".15s" }}
        >
          <div className="feat-card">
            <div
              className="feat-icon"
              style={{
                background: "rgba(29,78,216,.08)",
                borderColor: "rgba(29,78,216,.15)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="feat-title">Professor-led exam sessions</div>
            <p className="feat-desc">
              Professors create coding practicals, add questions and private
              test cases, then publish a session for their students to join.
            </p>
            <div className="feat-tags">
              <span className="ftag">exam authoring</span>
              <span className="ftag">join codes</span>
              <span className="ftag">question sets</span>
            </div>
          </div>
          <div className="feat-card">
            <div
              className="feat-icon"
              style={{
                background: "rgba(5,150,105,.08)",
                borderColor: "rgba(5,150,105,.15)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="feat-title">Test-based grading</div>
            <p className="feat-desc">
              Student submissions run against professor-authored tests. Marks
              reflect the test cases passed and the point value of each question.
            </p>
            <div className="feat-tags">
              <span className="ftag">private tests</span>
              <span className="ftag">question points</span>
            </div>
          </div>
          <div className="feat-card">
            <div
              className="feat-icon"
              style={{
                background: "rgba(5,150,105,.08)",
                borderColor: "rgba(5,150,105,.15)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <div className="feat-title">Focused coding workspace</div>
            <p className="feat-desc">
              Students read the problem, write code in the Monaco editor, run
              public examples, submit solutions, and review their results.
            </p>
            <div className="feat-tags">
              <span className="ftag">live editor</span>
              <span className="ftag">Python · JavaScript · Java</span>
            </div>
          </div>
          <div className="feat-card">
            <div
              className="feat-icon"
              style={{
                background: "rgba(71,85,105,.08)",
                borderColor: "rgba(71,85,105,.15)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#475569"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="feat-title">Professor analytics dashboard</div>
            <p className="feat-desc">
              Review participation, submitted marks, ranked results, and
              question-level outcomes. Download a CSV report for your records.
            </p>
            <div className="feat-tags">
              <span className="ftag">per-student view</span>
              <span className="ftag">exportable</span>
            </div>
          </div>
        </div>
      </section>

      <section className="how" id="how">
        <div style={{ textAlign: "center" }} className="reveal">
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-heading">Three steps. Zero guesswork.</h2>
        </div>
        <div className="steps reveal" style={{ transitionDelay: ".1s" }}>
          <div className="step">
            <div className="step-num">01</div>
            <div className="step-title">Students join the room</div>
            <p className="step-desc">
              A session code gets everyone into a shared workspace —
              JWT-secured, role-separated, no browser extension required.
            </p>
            <div className="step-connector"></div>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <div className="step-title">Solve in the exam workspace</div>
            <p className="step-desc">
              Students read each prompt, run public examples in the editor, and
              submit when they are ready for grading.
            </p>
            <div className="step-connector"></div>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <div className="step-title">Review marks and outcomes</div>
            <p className="step-desc">
              Professors review scores from the private test suite, inspect
              question outcomes, and export the session results as CSV.
            </p>
          </div>
        </div>
      </section>

      <div className="cta-section" id="cta">
        <div className="cta-glow"></div>
        <div className="reveal">
          <div className="section-eyebrow" style={{ marginBottom: "16px" }}>
            Get started
          </div>
          <h2 className="cta-heading">
            Fair grades start with
            <br />
            <span
              style={{
                background:
                  "linear-gradient(120deg,var(--accent1),var(--accent2))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              real data.
            </span>
          </h2>
          <p className="cta-sub">
            Choose your account type to sign in or create an account. Students
            and professors each get a workspace tailored to their role.
          </p>
          <div className="demo-cards">
            <button
              type="button"
              className="demo-card"
              aria-label="Continue as a student"
              onClick={() => navigate("/login?role=student")}
            >
              <div
                className="demo-card-icon"
                style={{ background: "rgba(29,78,216,.12)" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <div className="demo-card-label">Continue as a</div>
                <div className="demo-card-title">Student</div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginLeft: "auto" }}
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button
              type="button"
              className="demo-card"
              aria-label="Continue as a professor"
              onClick={() => navigate("/login?role=professor")}
            >
              <div
                className="demo-card-icon"
                style={{ background: "rgba(5,150,105,.12)" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div>
                <div className="demo-card-label">Continue as a</div>
                <div className="demo-card-title">Professor</div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginLeft: "auto" }}
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <footer>
        <div className="footer-logo">
          Team<em>Fit</em> AI
        </div>
        <div className="footer-text">React · Flask · Monaco · Render Sandboxes</div>
        <div className="footer-text">© 2026 TeamFit</div>
      </footer>
    </main>
  );
}
