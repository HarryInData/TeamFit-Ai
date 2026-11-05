import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth";
import { login, register } from "../services/api";
import "./LoginPage.css";

/* ── SVG Icons ── */
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

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}


export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginUser, signInWithGoogle, googleConfigured } = useAuth();

  // Screen: "picker" | "student" | "professor"
  const initialRole = searchParams.get("role");
  const [screen, setScreen] = useState(
    initialRole === "student" ? "student" :
    initialRole === "professor" ? "professor" : "picker"
  );

  // Form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Derived role
  const role = screen === "professor" ? "professor" : "student";

  // ── Handlers ──
  function goToScreen(s) {
    setScreen(s);
    setError("");
    setEmail("");
    setPassword("");
    setName("");
    setShowPw(false);
    setIsSignUp(false);
    setSuccess(false);
  }

  function toggleMode() {
    setIsSignUp(!isSignUp);
    setError("");
    setName("");
    setPassword("");
    setSuccess(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSignUp && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (isSignUp && password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      let data;
      if (isSignUp) {
        data = await register(name, email, password, role);
      } else {
        data = await login(email, password, role);
      }
      loginUser(data.user, data.token);
      setSuccess(true);
      setTimeout(() => {
        navigate(data.user.role === "professor" ? "/dashboard" : "/session");
      }, 600);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      const data = await signInWithGoogle(role);
      setSuccess(true);
      setTimeout(() => {
        navigate(data.user.role === "professor" ? "/dashboard" : "/session");
      }, 600);
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        // User closed the popup — not an error
        setGoogleLoading(false);
        return;
      }
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
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
          {/* Floating particles */}
          <div className="login-particles">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className={`login-particle login-particle--${i % 2 === 0 ? 'teal' : 'amber'}`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 8}s`,
                  animationDuration: `${6 + Math.random() * 8}s`,
                }}
              />
            ))}
          </div>
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
                <div className="role-card-glow" />
                <span className="role-corner-badge">LEARNER</span>
                <div className="role-icon">🎓</div>
                <h3>Student</h3>
                <p>Join practical exams, solve coding questions, and review your marks and progress.</p>
                <div className="role-features">
                  <div className="role-feat"><div className="role-feat-dot" /> Browse open practical exams</div>
                  <div className="role-feat"><div className="role-feat-dot" /> Review marks by question</div>
                  <div className="role-feat"><div className="role-feat-dot" /> Code in an exam workspace</div>
                  <div className="role-feat"><div className="role-feat-dot" /> See the live session leaderboard</div>
                </div>
                <button className="role-enter-btn" id="enter-student-btn">Enter as Student →</button>
              </div>

              {/* Professor Card */}
              <div
                className="role-card role-card--professor"
                onClick={() => goToScreen("professor")}
                id="role-card-professor"
              >
                <div className="role-card-glow" />
                <span className="role-corner-badge">EDUCATOR</span>
                <div className="role-icon">🏛</div>
                <h3>Professor</h3>
                <p>Create practical exams, publish questions to students, and review their test-based results.</p>
                <div className="role-features">
                  <div className="role-feat"><div className="role-feat-dot" /> Create exams with hidden test cases</div>
                  <div className="role-feat"><div className="role-feat-dot" /> Publish and close exam sessions</div>
                  <div className="role-feat"><div className="role-feat-dot" /> Review student marks and test outcomes</div>
                  <div className="role-feat"><div className="role-feat-dot" /> Download ranked results as CSV</div>
                </div>
                <button className="role-enter-btn" id="enter-professor-btn">Enter as Professor →</button>
              </div>
            </div>
          </div>
        )}

        {/* ② STUDENT LOGIN / SIGNUP */}
        {screen === "student" && (
          <div className={`login-screen ${success ? 'login-screen--success' : ''}`} key="student">
            <div className="login-wrap">
              <div className="login-side login-brand login-brand--student">
                <div className="brand-top">
                  <span className="brand-tag">🎓 Student Portal</span>
                  <div>
                    <h2 className="brand-heading">
                      Your practical.<br />Your solution.<br />
                      <span className="brand-heading-accent--student">Your progress.</span>
                    </h2>
                  </div>
                  <p className="brand-desc">Join exams from your professor, write and submit code, then review your marks by question.</p>
                  <div className="brand-perks">
                    <div className="brand-perk"><div className="brand-perk-dot" /> Find currently open practical exams</div>
                    <div className="brand-perk"><div className="brand-perk-dot" /> See question results and session rank</div>
                    <div className="brand-perk"><div className="brand-perk-dot" /> Track marks across your exam sessions</div>
                  </div>
                </div>
              </div>

              <form className="login-side login-form-side login-form-side--student" onSubmit={handleSubmit}>
                <button type="button" className="login-back-btn" onClick={() => goToScreen("picker")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  Back to role select
                </button>
                <div className="login-form-header">
                  <h2>{isSignUp ? "Create Student Account" : "Student Sign In"}</h2>
                  <p>{isSignUp ? "Join your team and start collaborating" : "Welcome back — your dashboard awaits"}</p>
                </div>

                {/* Google Sign-in — always visible */}
                <button type="button" className="login-google-btn" onClick={handleGoogle} disabled={googleLoading || loading || !googleConfigured} id="student-google-btn">
                  {googleLoading ? (
                    <div className="login-google-spinner" />
                  ) : (
                    <>
                      <GoogleIcon />
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
                {!googleConfigured && <p className="login-google-note">Google sign-in is not configured for this app yet. Use email and password.</p>}

                <div className="login-or-row"><div className="login-or-line" /><span>or {isSignUp ? "sign up" : "sign in"} with email</span><div className="login-or-line" /></div>

                {/* Name field — sign-up only */}
                <div className={`login-field login-field--animate ${isSignUp ? 'login-field--visible' : 'login-field--hidden'}`}>
                  <label htmlFor="s-name">Full Name</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><UserIcon /></span>
                    <input
                      id="s-name"
                      type="text"
                      placeholder="Alex Johnson"
                      autoComplete="name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      tabIndex={isSignUp ? 0 : -1}
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="s-email">University Email</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><MailIcon /></span>
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
                </div>

                <div className="login-field">
                  <label htmlFor="s-pw">Password</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><LockIcon /></span>
                    <input
                      id="s-pw"
                      type={showPw ? "text" : "password"}
                      placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="login-pw-toggle" onClick={() => setShowPw(!showPw)}>
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {!isSignUp && (
                  <div className="login-extras">
                    <label className="login-chk-label">
                      <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                      Keep me signed in
                    </label>
                    <span className="login-forgot-note">Password resets are handled by your institution.</span>
                  </div>
                )}

                {error && <div className="login-error-msg"><span className="login-error-icon">!</span> {error}</div>}

                <button type="submit" className={`login-submit ${success ? 'login-submit--success' : ''}`} disabled={loading || googleLoading} id="student-login-submit">
                  {loading ? (
                    <div className="login-submit-spinner" />
                  ) : success ? (
                    <span className="login-success-check">✓</span>
                  ) : (
                    isSignUp ? "Create Account" : "Sign In as Student"
                  )}
                </button>

                <div className="login-signup-row">
                  {isSignUp ? "Already have an account?" : "New here?"}{" "}
                  <button type="button" onClick={toggleMode}>
                    {isSignUp ? "Sign in instead" : "Create your student account"}
                  </button>
                </div>

                <div className="login-sec-row">
                  <ShieldIcon />
                  Sign in securely with your account
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ③ PROFESSOR LOGIN / SIGNUP */}
        {screen === "professor" && (
          <div className={`login-screen ${success ? 'login-screen--success' : ''}`} key="professor">
            <div className="login-wrap">
              <div className="login-side login-brand login-brand--professor">
                <div className="brand-top">
                  <span className="brand-tag">🏛 Professor Portal</span>
                  <div>
                    <h2 className="brand-heading">
                      Set the exam.<br />Review results.<br />
                      <span className="brand-heading-accent--professor">Support your class.</span>
                    </h2>
                  </div>
                  <p className="brand-desc">Create question sets, open exam sessions, and review student marks from test-case results.</p>
                  <div className="brand-perks">
                    <div className="brand-perk"><div className="brand-perk-dot" /> Keep questions and hidden tests together</div>
                    <div className="brand-perk"><div className="brand-perk-dot" /> Publish and close practical sessions</div>
                    <div className="brand-perk"><div className="brand-perk-dot" /> Download marks and ranking as CSV</div>
                  </div>
                </div>
              </div>

              <form className="login-side login-form-side login-form-side--professor" onSubmit={handleSubmit}>
                <button type="button" className="login-back-btn" onClick={() => goToScreen("picker")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  Back to role select
                </button>
                <div className="login-form-header">
                  <h2>{isSignUp ? "Create Educator Account" : "Professor Sign In"}</h2>
                  <p>{isSignUp ? "Set up your educator command center" : "Access your educator command center"}</p>
                </div>

                {/* Google Sign-in — always visible */}
                <button type="button" className="login-google-btn" onClick={handleGoogle} disabled={googleLoading || loading || !googleConfigured} id="professor-google-btn">
                  {googleLoading ? (
                    <div className="login-google-spinner" />
                  ) : (
                    <>
                      <GoogleIcon />
                      <span>Continue with Google Workspace</span>
                    </>
                  )}
                </button>
                {!googleConfigured && <p className="login-google-note">Google sign-in is not configured for this app yet. Use email and password.</p>}

                <div className="login-or-row"><div className="login-or-line" /><span>or {isSignUp ? "sign up" : "sign in"} with email</span><div className="login-or-line" /></div>

                {/* Name field — sign-up only */}
                <div className={`login-field login-field--animate ${isSignUp ? 'login-field--visible' : 'login-field--hidden'}`}>
                  <label htmlFor="p-name">Full Name</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><UserIcon /></span>
                    <input
                      id="p-name"
                      type="text"
                      placeholder="Dr. Jane Smith"
                      autoComplete="name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      tabIndex={isSignUp ? 0 : -1}
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="p-email">Institutional Email</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><MailIcon /></span>
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
                </div>

                <div className="login-field">
                  <label htmlFor="p-pw">Password</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon"><LockIcon /></span>
                    <input
                      id="p-pw"
                      type={showPw ? "text" : "password"}
                      placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="login-pw-toggle" onClick={() => setShowPw(!showPw)}>
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {!isSignUp && (
                  <div className="login-extras">
                    <label className="login-chk-label">
                      <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                      Stay signed in
                    </label>
                    <span className="login-forgot-note">Password resets are handled by your institution.</span>
                  </div>
                )}

                {error && <div className="login-error-msg"><span className="login-error-icon">!</span> {error}</div>}

                <button type="submit" className={`login-submit ${success ? 'login-submit--success' : ''}`} disabled={loading || googleLoading} id="professor-login-submit">
                  {loading ? (
                    <div className="login-submit-spinner" />
                  ) : success ? (
                    <span className="login-success-check">✓</span>
                  ) : (
                    isSignUp ? "Create Account" : "Sign In as Professor"
                  )}
                </button>

                <div className="login-signup-row">Professor accounts are provided by your institution.</div>

                <div className="login-sec-row">
                  <ShieldIcon />
                  Sign in securely with your account
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
