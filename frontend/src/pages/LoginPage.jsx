import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login, register, googleLogin } from "../services/api";
import "./LoginPage.css";

/* ── Google SVG Icon ── */
function GoogleIcon() {
  return (
    <svg className="login-google-icon" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  // Screen: "picker" | "student" | "professor"
  const initialRole = searchParams.get("role");
  const [screen, setScreen] = useState(
    initialRole === "student" ? "student" :
    initialRole === "professor" ? "professor" : "picker"
  );

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Derived role
  const role = screen === "professor" ? "professor" : "student";
  const isStudent = role === "student";

  // ── Handlers ──
  function goToScreen(s) {
    setScreen(s);
    setError("");
    setEmail("");
    setPassword("");
    setShowPw(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password, role);
      loginUser(data.user, data.token);
      navigate(data.user.role === "professor" ? "/dashboard" : "/session");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      const data = await googleLogin(role);
      loginUser(data.user, data.token);
      navigate(data.user.role === "professor" ? "/dashboard" : "/session");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ═══════════════════════
  // RENDER
  // ═══════════════════════
  return (
    <div className="login-page">
      <div className="login-scene">
        {/* Background */}
        <div className="login-bg">
          <div className="login-grid" />
          <div className="login-orb login-orb--student" />
          <div className="login-orb login-orb--prof" />
          <div className="login-corner login-corner--tl" />
          <div className="login-corner login-corner--br" />
        </div>

        {/* ① ROLE PICKER */}
        {screen === "picker" && (
          <div className="login-screen" key="picker">
            <div className="picker-header">
              <div className="picker-logo-row">
                <div className="picker-logo-box">
                  <svg viewBox="0 0 24 24">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <span className="picker-logo-name">TeamFit <span>AI</span></span>
              </div>
              <h1 className="picker-title">Who are you signing in as?</h1>
              <p className="picker-sub">Choose your role to get the right experience</p>
            </div>

            <div className="role-cards">
              {/* Student Card */}
              <div
                className="role-card role-card--student"
                onClick={() => goToScreen("student")}
                id="role-card-student"
              >
                <span className="role-corner-badge">LEARNER</span>
                <div className="role-icon">🎓</div>
                <h3>Student</h3>
                <p>Track your contributions, view team analytics, and get AI-powered feedback on your collaboration.</p>
                <div className="role-features">
                  <div className="role-feat"><div className="role-feat-dot" /> Real-time contribution dashboard</div>
                  <div className="role-feat"><div className="role-feat-dot" /> Peer evaluation & self-assessment</div>
                  <div className="role-feat"><div className="role-feat-dot" /> Team health insights</div>
                  <div className="role-feat"><div className="role-feat-dot" /> AI-generated progress reports</div>
                </div>
                <button className="role-enter-btn" id="enter-student-btn">Enter as Student →</button>
              </div>

              {/* Professor Card */}
              <div
                className="role-card role-card--professor"
                onClick={() => goToScreen("professor")}
                id="role-card-professor"
              >
                <span className="role-corner-badge">EDUCATOR</span>
                <div className="role-icon">🏛</div>
                <h3>Professor</h3>
                <p>Manage cohorts, evaluate teams fairly, and get deep AI insights on individual contribution patterns.</p>
                <div className="role-features">
                  <div className="role-feat"><div className="role-feat-dot" /> Class & cohort management</div>
                  <div className="role-feat"><div className="role-feat-dot" /> AI-driven grading recommendations</div>
                  <div className="role-feat"><div className="role-feat-dot" /> Individual contribution heatmaps</div>
                  <div className="role-feat"><div className="role-feat-dot" /> Export reports for administration</div>
                </div>
                <button className="role-enter-btn" id="enter-professor-btn">Enter as Professor →</button>
              </div>
            </div>
          </div>
        )}

        {/* ② STUDENT LOGIN */}
        {screen === "student" && (
          <div className="login-screen" key="student">
            <div className="login-wrap">
              <div className="login-side login-brand login-brand--student">
                <div className="brand-top">
                  <span className="brand-tag">🎓 Student Portal</span>
                  <div>
                    <h2 className="brand-heading">
                      Your team.<br />Your contribution.<br />
                      <span className="brand-heading-accent--student">Your grade.</span>
                    </h2>
                  </div>
                  <p className="brand-desc">Get a transparent view of how you and your teammates are performing — powered by AI, not guesswork.</p>
                  <div className="brand-stats">
                    <div className="brand-stat"><span className="brand-stat-num">12k+</span><span className="brand-stat-lbl">Students</span></div>
                    <div className="brand-stat"><span className="brand-stat-num">98%</span><span className="brand-stat-lbl">Accuracy</span></div>
                    <div className="brand-stat"><span className="brand-stat-num">4.9★</span><span className="brand-stat-lbl">Rating</span></div>
                  </div>
                  <div className="brand-perks">
                    <div className="brand-perk"><div className="brand-perk-dot" /> Submit peer evaluations in seconds</div>
                    <div className="brand-perk"><div className="brand-perk-dot" /> See your AI-generated contribution score</div>
                    <div className="brand-perk"><div className="brand-perk-dot" /> Get notified when grades update</div>
                  </div>
                </div>
              </div>

              <form className="login-side login-form-side login-form-side--student" onSubmit={handleSubmit}>
                <button type="button" className="login-back-btn" onClick={() => goToScreen("picker")}>← Back to role select</button>
                <div className="login-form-header">
                  <h2>Student Sign In</h2>
                  <p>Welcome back — your dashboard awaits</p>
                </div>

                <div className="login-field">
                  <label htmlFor="s-email">University Email</label>
                  <input
                    id="s-email"
                    type="email"
                    placeholder="you@university.edu"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="s-pw">Password</label>
                  <div className="login-field-row">
                    <input
                      id="s-pw"
                      type={showPw ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="login-pw-toggle" onClick={() => setShowPw(!showPw)}>
                      {showPw ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                <div className="login-extras">
                  <label className="login-chk-label">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                    Keep me signed in
                  </label>
                  <button type="button" className="login-forgot-link" onClick={e => e.preventDefault()}>Forgot password?</button>
                </div>

                {error && <div className="login-error-msg">{error}</div>}

                <button type="submit" className="login-submit" disabled={loading} id="student-login-submit">
                  {loading ? <div className="login-submit-spinner" /> : "Sign In as Student"}
                </button>

                <div className="login-or-row"><div className="login-or-line" /><span>or</span><div className="login-or-line" /></div>
                <button type="button" className="login-google-btn" onClick={handleGoogle} disabled={loading}>
                  <GoogleIcon /> Continue with Google
                </button>

                <div className="login-signup-row">
                  New here?{" "}
                  <button type="button" onClick={() => alert("Registration coming soon!")}>Create your student account</button>
                </div>

                <div className="login-sec-row">
                  <div className="login-sec-dot" />
                  Encrypted · FERPA Compliant
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ③ PROFESSOR LOGIN */}
        {screen === "professor" && (
          <div className="login-screen" key="professor">
            <div className="login-wrap">
              <div className="login-side login-brand login-brand--professor">
                <div className="brand-top">
                  <span className="brand-tag">🏛 Professor Portal</span>
                  <div>
                    <h2 className="brand-heading">
                      Grade fairly.<br />Every time.<br />
                      <span className="brand-heading-accent--professor">AI-guaranteed.</span>
                    </h2>
                  </div>
                  <p className="brand-desc">Access contribution heatmaps, peer review data, and AI recommendations — all in one command center.</p>
                  <div className="brand-stats">
                    <div className="brand-stat"><span className="brand-stat-num">340+</span><span className="brand-stat-lbl">Educators</span></div>
                    <div className="brand-stat"><span className="brand-stat-num">50k+</span><span className="brand-stat-lbl">Evaluations</span></div>
                    <div className="brand-stat"><span className="brand-stat-num">99.2%</span><span className="brand-stat-lbl">Uptime</span></div>
                  </div>
                  <div className="brand-perks">
                    <div className="brand-perk"><div className="brand-perk-dot" /> Manage all your class cohorts</div>
                    <div className="brand-perk"><div className="brand-perk-dot" /> AI flags free-riders automatically</div>
                    <div className="brand-perk"><div className="brand-perk-dot" /> Export to LMS with one click</div>
                  </div>
                </div>
              </div>

              <form className="login-side login-form-side login-form-side--professor" onSubmit={handleSubmit}>
                <button type="button" className="login-back-btn" onClick={() => goToScreen("picker")}>← Back to role select</button>
                <div className="login-form-header">
                  <h2>Professor Sign In</h2>
                  <p>Access your educator command center</p>
                </div>

                <div className="login-field">
                  <label htmlFor="p-email">Institutional Email</label>
                  <input
                    id="p-email"
                    type="email"
                    placeholder="prof@institution.edu"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="p-pw">Password</label>
                  <div className="login-field-row">
                    <input
                      id="p-pw"
                      type={showPw ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="login-pw-toggle" onClick={() => setShowPw(!showPw)}>
                      {showPw ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                <div className="login-extras">
                  <label className="login-chk-label">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                    Stay signed in
                  </label>
                  <button type="button" className="login-forgot-link" onClick={e => e.preventDefault()}>Reset password</button>
                </div>

                {error && <div className="login-error-msg">{error}</div>}

                <button type="submit" className="login-submit" disabled={loading} id="professor-login-submit">
                  {loading ? <div className="login-submit-spinner" /> : "Sign In as Professor"}
                </button>

                <div className="login-or-row"><div className="login-or-line" /><span>or</span><div className="login-or-line" /></div>
                <button type="button" className="login-google-btn" onClick={handleGoogle} disabled={loading}>
                  <GoogleIcon /> Continue with Google Workspace
                </button>

                <div className="login-signup-row">
                  New educator?{" "}
                  <button type="button" onClick={() => alert("Institutional access request coming soon!")}>Request institutional access</button>
                </div>

                <div className="login-sec-row">
                  <div className="login-sec-dot" />
                  SSO Ready · SOC 2 Compliant
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
