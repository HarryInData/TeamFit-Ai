import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login, googleLogin } from "../services/api";
import "./LoginPage.css";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get("role") || "student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
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

  return (
    <div className="login-page">
      {/* Background glow effects */}
      <div className="login-bg-glow login-bg-glow--left" />
      <div className="login-bg-glow login-bg-glow--right" />

      {/* Floating programming language icons */}
      <div className="login-float-icons">
        <img
          className="login-float-icon"
          src="/langicons/python-svgrepo-com.svg"
          alt="Python"
          style={{ "--delay": "0s", "--x": "8%", "--y": "18%" }}
        />
        <img
          className="login-float-icon"
          src="/langicons/js-svgrepo-com.svg"
          alt="JavaScript"
          style={{ "--delay": "1.2s", "--x": "85%", "--y": "12%" }}
        />
        <img
          className="login-float-icon"
          src="/langicons/java-svgrepo-com.svg"
          alt="Java"
          style={{ "--delay": "0.6s", "--x": "78%", "--y": "72%" }}
        />
        <img
          className="login-float-icon"
          src="/langicons/python-svgrepo-com.svg"
          alt="Python"
          style={{ "--delay": "1.8s", "--x": "12%", "--y": "75%" }}
        />
        <img
          className="login-float-icon"
          src="/langicons/js-svgrepo-com.svg"
          alt="JS"
          style={{ "--delay": "0.3s", "--x": "50%", "--y": "8%" }}
        />
        <img
          className="login-float-icon"
          src="/langicons/java-svgrepo-com.svg"
          alt="Java"
          style={{ "--delay": "2.1s", "--x": "88%", "--y": "45%" }}
        />
        <img
          className="login-float-icon"
          src="/langicons/python-svgrepo-com.svg"
          alt="Python"
          style={{ "--delay": "1.5s", "--x": "6%", "--y": "45%" }}
        />
      </div>

      <div className="login-container">
        {/* Logo */}
        <div className="login-logo">
          <svg className="login-logo-icon" viewBox="0 0 32 32" fill="none">
            <path
              d="M4 24L10 12L16 18L22 8L28 16"
              stroke="#6C5CE7"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 28L10 20L16 24L22 14L28 22"
              stroke="#A855F7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
          </svg>
          <span className="login-logo-text">TeamFit AI</span>
        </div>

        <h1 className="login-title">Welcome to TeamFit AI</h1>
        <p className="login-subtitle">
          AI-powered insights for smarter student collaboration
        </p>

        {/* Login Card */}
        <form className="login-card" onSubmit={handleSubmit}>
          {/* Role Toggle */}
          <label className="login-label">LOGIN AS</label>
          <div className="login-role-toggle">
            <button
              type="button"
              className={`login-role-btn ${role === "student" ? "login-role-btn--active" : ""}`}
              onClick={() => setRole("student")}
            >
              Student
            </button>
            <button
              type="button"
              className={`login-role-btn ${role === "professor" ? "login-role-btn--active" : ""}`}
              onClick={() => setRole("professor")}
            >
              Professor
            </button>
          </div>

          {/* Email */}
          <label className="login-label" htmlFor="login-email">
            EMAIL ADDRESS
          </label>
          <input
            id="login-email"
            className="login-input"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          {/* Password */}
          <label className="login-label" htmlFor="login-password">
            PASSWORD
          </label>
          <input
            id="login-password"
            className="login-input"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {/* Remember + Forgot */}
          <div className="login-options">
            <label className="login-checkbox-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="login-checkbox"
              />
              Remember Me
            </label>
            <a
              href="#"
              className="login-forgot"
              onClick={(e) => e.preventDefault()}
            >
              Forgot Password?
            </a>
          </div>

          {/* Error */}
          {error && <div className="login-error">{error}</div>}

          {/* Login Button */}
          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          {/* Google auth removed — mock feature caused confusion */}

          {/* Sign Up */}
          <p className="login-signup">
            Don't have an account?{" "}
            <a href="#" onClick={(e) => e.preventDefault()}>
              Sign up
            </a>
          </p>
        </form>

        {/* Security Badge */}
        <div className="login-security">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          YOUR DATA IS SECURE AND ENCRYPTED
        </div>
      </div>

      {/* Footer */}
      <footer className="login-footer">
        <p className="login-footer-desc">
          This platform helps professors evaluate students fairly using
          AI-driven insights. Precision engineered for academic excellence.
        </p>
        <div className="login-footer-bar">
          <div className="login-footer-brand">
            <span className="login-footer-logo">TeamFit AI</span>
            <span className="login-footer-status">
              <span className="login-status-dot" />
              SYSTEM OPERATIONAL
            </span>
          </div>
          <div className="login-footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
          </div>
          <span className="login-footer-copy">© 2024 TEAMFIT AI</span>
        </div>
      </footer>
    </div>
  );
}
