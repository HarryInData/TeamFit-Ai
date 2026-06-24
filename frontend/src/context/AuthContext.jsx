import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { googleLogin } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sessionCode, setSessionCode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore login from localStorage
    const savedUser = localStorage.getItem('teamfit_user');
    const savedToken = localStorage.getItem('teamfit_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }

    // Only restore session if this is the SAME tab (not a new one)
    // sessionStorage is unique per tab and clears on close
    const isReturningTab = sessionStorage.getItem('teamfit_tab_active');
    if (isReturningTab) {
      const savedSession = localStorage.getItem('teamfit_session_id');
      const savedCode = localStorage.getItem('teamfit_session_code');
      if (savedSession) setSessionId(savedSession);
      if (savedCode) setSessionCode(savedCode);
    } else {
      // New tab — clear old session so user starts fresh at lobby
      sessionStorage.setItem('teamfit_tab_active', 'true');
      localStorage.removeItem('teamfit_session_id');
      localStorage.removeItem('teamfit_session_code');
    }

    setLoading(false);
  }, []);

  function loginUser(userData, tokenValue) {
    setUser(userData);
    setToken(tokenValue);
    localStorage.setItem('teamfit_user', JSON.stringify(userData));
    localStorage.setItem('teamfit_token', tokenValue);
  }

  /**
   * Sign in with Google via Firebase popup.
   * After Firebase auth, sends the ID token to the backend
   * for server-side verification and JWT generation.
   */
  async function signInWithGoogle(role) {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    const data = await googleLogin(idToken, role);
    loginUser(data.user, data.token);
    return data;
  }

  function setSession(id, code) {
    setSessionId(id);
    setSessionCode(code);
    localStorage.setItem('teamfit_session_id', id);
    localStorage.setItem('teamfit_session_code', code);
  }

  function clearSession() {
    setSessionId(null);
    setSessionCode(null);
    localStorage.removeItem('teamfit_session_id');
    localStorage.removeItem('teamfit_session_code');
  }

  function logout() {
    setUser(null);
    setToken(null);
    setSessionId(null);
    setSessionCode(null);
    localStorage.removeItem('teamfit_user');
    localStorage.removeItem('teamfit_token');
    localStorage.removeItem('teamfit_session_id');
    localStorage.removeItem('teamfit_session_code');
    // Also sign out of Firebase to clear Google session
    firebaseSignOut(auth).catch(() => {});
  }

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      sessionId, sessionCode,
      loginUser, logout,
      signInWithGoogle,
      setSession, clearSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
