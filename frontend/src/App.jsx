import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/auth";
import HeroSection from "./pages/HeroSection";
import LoginPage from "./pages/LoginPage";
import SessionLobby from "./pages/SessionLobby";
import Workspace from "./pages/Workspace";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";

function ProtectedRoute({ children, allowedRole, requireSession = false }) {
  const { user, loading, sessionId } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (requireSession && user.role === 'student' && !sessionId) return <Navigate to="/session" replace />;
  if (allowedRole && user.role !== allowedRole) {
    return (
      <Navigate
        to={user.role === "professor" ? "/dashboard" : "/session"}
        replace
      />
    );
  }
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      {/* Public: Hero landing page */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate
              to={user.role === "professor" ? "/dashboard" : "/session"}
              replace
            />
          ) : (
            <LandingPage />
          )
        }
      />
      {/* Public: Login page */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate
              to={user.role === "professor" ? "/dashboard" : "/session"}
              replace
            />
          ) : (
            <LoginPage />
          )
        }
      />
      {/* Protected: Student routes */}
      <Route
        path="/session"
        element={
          <ProtectedRoute allowedRole="student">
            <SessionLobby />
          </ProtectedRoute>
        }
      />
      <Route
        path="/join/:code"
        element={
          user ? (
            <ProtectedRoute allowedRole="student">
              <SessionLobby />
            </ProtectedRoute>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/workspace"
        element={
          <ProtectedRoute allowedRole="student" requireSession>
            <Workspace />
          </ProtectedRoute>
        }
      />
      {/* Protected: Professor route */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRole="professor">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
