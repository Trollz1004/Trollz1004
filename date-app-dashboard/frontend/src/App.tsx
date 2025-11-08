import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Signup } from './pages/Signup';
import { Login } from './pages/Login';
import { VerifyEmail } from './pages/VerifyEmail';
import { VerifyAge } from './pages/VerifyAge';
import { AcceptTOS } from './pages/AcceptTOS';
import { CreateProfile } from './pages/CreateProfile';
import { Dashboard } from './pages/Dashboard';
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-page">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route
        path="/signup"
        element={
          <AuthRoute>
            <Signup />
          </AuthRoute>
        }
      />
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />
      <Route
        path="/verify-email"
        element={
          <AuthRoute>
            <VerifyEmail />
          </AuthRoute>
        }
      />
      <Route
        path="/verify-age"
        element={
          <AuthRoute>
            <VerifyAge />
          </AuthRoute>
        }
      />
      <Route
        path="/accept-tos"
        element={
          <AuthRoute>
            <AcceptTOS />
          </AuthRoute>
        }
      />
      <Route
        path="/complete-profile"
        element={
          <AuthRoute>
            <CreateProfile />
          </AuthRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;