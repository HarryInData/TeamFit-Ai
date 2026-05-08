import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const cursor = document.getElementById("cursor");
    const ring = document.getElementById("cursor-ring");
    let mx = 0,
      my = 0,
      rx = 0,
      ry = 0;
    document.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      cursor.style.left = mx + "px";
      cursor.style.top = my + "px";
    });
    (function animRing() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = Math.round(rx) + "px";
      ring.style.top = Math.round(ry) + "px";
      requestAnimationFrame(animRing);
    })();
    document.querySelectorAll("button,.demo-card").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        cursor.style.width = "18px";
        cursor.style.height = "18px";
        ring.style.width = "52px";
        ring.style.height = "52px";
      });
      el.addEventListener("mouseleave", () => {
        cursor.style.width = "10px";
        cursor.style.height = "10px";
        ring.style.width = "36px";
        ring.style.height = "36px";
      });
    });

    // Canvas particle/connection field
    const canvas = document.getElementById("bg-canvas");
    const ctx = canvas.getContext("2d");
    let W,
      H,
      particles = [];
    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.r = Math.random() * 1.5 + 0.5;
        this.a = Math.random();
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > W) this.vx *= -1;
        if (this.y < 0 || this.y > H) this.vy *= -1;
      }
    }
    for (let i = 0; i < 90; i++) particles.push(new Particle());
    const COLORS = [
      "rgba(192,132,252,",
      "rgba(244,114,182,",
      "rgba(56,189,248,",
    ];
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.update();
        const col = COLORS[i % 3];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = col + "0.5)";
        ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = col + (0.18 * (1 - d / 120)).toFixed(2) + ")";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    draw();

    // Animate bars after load
    setTimeout(() => {
      document.getElementById("bar1").style.width = "68%";
      document.getElementById("pct1").textContent = "68%";
      document.getElementById("bar2").style.width = "22%";
      document.getElementById("pct2").textContent = "22%";
      document.getElementById("bar3").style.width = "10%";
      document.getElementById("pct3").textContent = "10%";
    }, 600);
    // Count-up metrics
    function countUp(id, end, suffix, dur) {
      const el = document.getElementById(id);
      let s = 0;
      const step = dur / 60;
      const t = setInterval(() => {
        if (s >= end) {
          el.textContent = end + suffix;
          clearInterval(t);
        } else {
          s += end / 60;
          el.textContent = Math.round(s) + suffix;
        }
      }, step);
    }
    setTimeout(() => {
      countUp("mks", 347, "", 1800);
      countUp("mat", 24, "m", 1800);
      setTimeout(() => {
        document.getElementById("msc").textContent = "91";
      }, 1900);
    }, 800);

    // Scroll reveal
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        }),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    setTimeout(
      () =>
        document
          .querySelectorAll(".reveal")
          .forEach((el) => el.classList.add("visible")),
      100,
    );
  }, []);

  return (
    <>
      <div id="cursor"></div>
      <div id="cursor-ring"></div>
      <canvas id="bg-canvas"></canvas>

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
              Beta — free for educators
            </div>
            <h1>
              Stop rewarding
              <br />
              <em className="h1-line2">free riders.</em>
            </h1>
            <p className="hero-sub">
              AI-powered contribution tracking for group coding assignments.
              Know exactly who wrote what — automatically, silently, fairly.
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
                See it live
              </button>
              <button
                className="hero-btn-ghost"
                onClick={() => alert("Demo video coming soon!")}
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
                Watch 2-min demo
              </button>
            </div>
            <div className="hero-tags">
              <span className="htag">FERPA-safe</span>
              <span className="htag">No student install</span>
              <span className="htag">Judge0 sandboxed</span>
              <span className="htag">JWT auth</span>
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
              AI scoring...
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
                <div className="editor-tab">group_project.py</div>
                <div className="live-badge">
                  <div className="live-dot"></div>3 coding
                </div>
              </div>
              <div className="code-body">
                <div>
                  <span className="ln">1</span>
                  <span className="cm"># TeamFit AI — Session 42</span>
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
                <div className="cp-label">Live contribution</div>
                <div className="contrib-row">
                  <div
                    className="contrib-avatar"
                    style={{
                      background: "rgba(192,132,252,.3)",
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
                        width: "0%",
                        background: "linear-gradient(to right,#9333ea,#c084fc)",
                      }}
                    ></div>
                  </div>
                  <div
                    className="contrib-pct"
                    style={{ color: "var(--accent1)" }}
                    id="pct1"
                  >
                    0%
                  </div>
                </div>
                <div className="contrib-row">
                  <div
                    className="contrib-avatar"
                    style={{
                      background: "rgba(244,114,182,.25)",
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
                        width: "0%",
                        background: "linear-gradient(to right,#be185d,#f472b6)",
                      }}
                    ></div>
                  </div>
                  <div
                    className="contrib-pct"
                    style={{ color: "var(--accent2)" }}
                    id="pct2"
                  >
                    0%
                  </div>
                </div>
                <div className="contrib-row">
                  <div
                    className="contrib-avatar"
                    style={{
                      background: "rgba(52,211,153,.2)",
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
                        width: "0%",
                        background: "linear-gradient(to right,#059669,#34d399)",
                      }}
                    ></div>
                  </div>
                  <div
                    className="contrib-pct"
                    style={{ color: "var(--green)" }}
                    id="pct3"
                  >
                    0%
                  </div>
                </div>
              </div>
              <div className="metrics-row">
                <div className="metric-box">
                  <div className="metric-val" id="mks">
                    0
                  </div>
                  <div className="metric-lbl">Keystrokes</div>
                </div>
                <div className="metric-box">
                  <div className="metric-val" id="mat">
                    0m
                  </div>
                  <div className="metric-lbl">Active time</div>
                </div>
                <div className="metric-box">
                  <div className="metric-val" id="msc">
                    —
                  </div>
                  <div className="metric-lbl">AI score</div>
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
              style={{ background: "rgba(192,132,252,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c084fc"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            Real-time tracking
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(244,114,182,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f472b6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            AI-powered scoring
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(52,211,153,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#34d399"
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
              style={{ background: "rgba(56,189,248,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#38bdf8"
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
              style={{ background: "rgba(251,191,36,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            Judge0 sandboxed
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(192,132,252,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c084fc"
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
              style={{ background: "rgba(244,114,182,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f472b6"
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
            Fair team evaluation
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(52,211,153,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            FERPA-compliant
          </div>
          {/* Duplicates for scrolling */}
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(192,132,252,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c084fc"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            Real-time tracking
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(244,114,182,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f472b6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            AI-powered scoring
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(52,211,153,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#34d399"
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
              style={{ background: "rgba(56,189,248,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#38bdf8"
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
              style={{ background: "rgba(251,191,36,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            Judge0 sandboxed
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(192,132,252,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c084fc"
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
              style={{ background: "rgba(244,114,182,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f472b6"
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
            Fair team evaluation
          </div>
          <div className="trust-item">
            <div
              className="trust-icon"
              style={{ background: "rgba(52,211,153,.1)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            FERPA-compliant
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
                background: "rgba(192,132,252,.08)",
                borderColor: "rgba(192,132,252,.15)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c084fc"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="feat-title">Real-time contribution tracking</div>
            <p className="feat-desc">
              Silently captures keystrokes, active window focus, and coding time
              per student — zero UI friction, maximum signal fidelity.
            </p>
            <div className="feat-tags">
              <span className="ftag">keystrokes</span>
              <span className="ftag">focus windows</span>
              <span className="ftag">active time</span>
            </div>
          </div>
          <div className="feat-card">
            <div
              className="feat-icon"
              style={{
                background: "rgba(244,114,182,.08)",
                borderColor: "rgba(244,114,182,.15)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f472b6"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="feat-title">AI-generated fair scores</div>
            <p className="feat-desc">
              Raw metrics transformed into readable 0–100 contribution scores
              with qualitative AI summaries for each student — ready to paste
              into a grade sheet.
            </p>
            <div className="feat-tags">
              <span className="ftag">0–100 score</span>
              <span className="ftag">AI narrative</span>
            </div>
          </div>
          <div className="feat-card">
            <div
              className="feat-icon"
              style={{
                background: "rgba(52,211,153,.08)",
                borderColor: "rgba(52,211,153,.15)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#34d399"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <div className="feat-title">Monaco live collaboration</div>
            <p className="feat-desc">
              Teams code together in a VS Code-grade Monaco editor, synchronized
              in real time. No lag, no merge conflicts, no one sitting idle
              undetected.
            </p>
            <div className="feat-tags">
              <span className="ftag">real-time sync</span>
              <span className="ftag">Python · JS · Java</span>
            </div>
          </div>
          <div className="feat-card">
            <div
              className="feat-icon"
              style={{
                background: "rgba(56,189,248,.08)",
                borderColor: "rgba(56,189,248,.15)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#38bdf8"
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
              A single dashboard with every student's effort score, activity
              timeline, and AI narrative. Filter, compare, and export — from
              session end to grade in under 2 minutes.
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
            <div className="step-title">Code together, tracked silently</div>
            <p className="step-desc">
              Teams write and run code in the Monaco editor. TeamFit AI logs
              contributions in the background — students see nothing different.
            </p>
            <div className="step-connector"></div>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <div className="step-title">Professor gets the report</div>
            <p className="step-desc">
              Session ends → AI synthesizes data → professor receives a
              per-student score, summary, and full activity breakdown. Grade
              with confidence.
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
            Try both demo accounts. No sign-up. See exactly what students and
            professors experience.
          </p>
          <div className="demo-cards">
            <div
              className="demo-card"
              onClick={() => navigate("/login?role=student")}
            >
              <div
                className="demo-card-icon"
                style={{ background: "rgba(192,132,252,.12)" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <div className="demo-card-label">Try as a</div>
                <div className="demo-card-title">Student</div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c084fc"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginLeft: "auto" }}
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
            <div
              className="demo-card"
              onClick={() => navigate("/login?role=professor")}
            >
              <div
                className="demo-card-icon"
                style={{ background: "rgba(244,114,182,.12)" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f472b6"
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
                <div className="demo-card-label">Try as a</div>
                <div className="demo-card-title">Professor</div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f472b6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginLeft: "auto" }}
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <footer>
        <div className="footer-logo">
          Team<em>Fit</em> AI
        </div>
        <div className="footer-text">React · Flask · Monaco · Judge0</div>
        <div className="footer-text">© 2025 TeamFit AI</div>
      </footer>
    </>
  );
}
