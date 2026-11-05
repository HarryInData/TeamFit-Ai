import { useState } from 'react';
import { signInWithPopup, signOut as firebaseSignOut } from '@firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { googleLogin } from '../services/api';
import { AuthContext } from './auth';

function readInitialState() {
  let user = null;
  let token = null;
  try {
    const savedUser = localStorage.getItem('teamfit_user');
    const savedToken = localStorage.getItem('teamfit_token');
    if (savedUser && savedToken) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser && typeof parsedUser === 'object' && typeof savedToken === 'string') {
        user = parsedUser;
        token = savedToken;
      }
    }
  } catch {
    localStorage.removeItem('teamfit_user');
    localStorage.removeItem('teamfit_token');
  }

  let sessionId = null;
  let sessionCode = null;
  if (sessionStorage.getItem('teamfit_tab_active')) {
    sessionId = localStorage.getItem('teamfit_session_id');
    sessionCode = localStorage.getItem('teamfit_session_code');
  } else {
    sessionStorage.setItem('teamfit_tab_active', 'true');
    localStorage.removeItem('teamfit_session_id');
    localStorage.removeItem('teamfit_session_code');
  }
  return { user, token, sessionId, sessionCode };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(readInitialState);
  const { user, token, sessionId, sessionCode } = state;
  const loading = false;
  const googleConfigured = Boolean(auth && googleProvider);

  function loginUser(userData, tokenValue) {
    setState((previous) => ({ ...previous, user: userData, token: tokenValue }));
    localStorage.setItem('teamfit_user', JSON.stringify(userData));
    localStorage.setItem('teamfit_token', tokenValue);
  }

  /**
   * Sign in with Google via Firebase popup.
   * After Firebase auth, sends the ID token to the backend
   * for server-side verification and JWT generation.
   */
  async function signInWithGoogle(role) {
    if (!auth || !googleProvider) {
      throw new Error('Google sign-in is not configured. Use email and password instead.');
    }
    const result = await signInWithPopup(auth, googleProvider);
    if (!result.user.providerData.some((provider) => provider.providerId === 'google.com')) {
      throw new Error('Choose a Google account to continue.');
    }
    const idToken = await result.user.getIdToken(true);
    const data = await googleLogin(idToken, role);
    loginUser(data.user, data.token);
    return data;
  }

  function setSession(id, code) {
    setState((previous) => ({ ...previous, sessionId: id, sessionCode: code }));
    localStorage.setItem('teamfit_session_id', id);
    localStorage.setItem('teamfit_session_code', code);
  }

  function clearSession() {
    setState((previous) => ({ ...previous, sessionId: null, sessionCode: null }));
    localStorage.removeItem('teamfit_session_id');
    localStorage.removeItem('teamfit_session_code');
  }

  function logout() {
    setState({ user: null, token: null, sessionId: null, sessionCode: null });
    localStorage.removeItem('teamfit_user');
    localStorage.removeItem('teamfit_token');
    localStorage.removeItem('teamfit_session_id');
    localStorage.removeItem('teamfit_session_code');
    // Also sign out of Firebase to clear Google session
    if (auth) firebaseSignOut(auth).catch(() => {});
  }

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      googleConfigured,
      sessionId, sessionCode,
      loginUser, logout,
      signInWithGoogle,
      setSession, clearSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
