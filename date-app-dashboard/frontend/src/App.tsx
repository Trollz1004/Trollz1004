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

      socket.on('notification', (data) => {
        setNotification(data);
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleCloseNotification = () => {
    setNotification(null);
  };

  return (
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                Date App DAO
              </Link>
            </Typography>
            <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 2 }}>
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
            {user && (
              <>
                {user.role === 'admin' && (
                  <>
                    <Button color="inherit" component={Link} to="/admin">
                      Admin
                    </Button>
                    <Button color="inherit" component={Link} to="/analytics">
                      Analytics
                    </Button>
                  </>
                )}
                <Button color="inherit" component={Link} to="/search">
                  Search
                </Button>
                <Button color="inherit" component={Link} to="/activity">
                  Activity
                </Button>
                <Button color="inherit" component={Link} to="/create-fundraiser">
                  Create Fundraiser
                </Button>
                <Button color="inherit" component={Link} to="/chat">
                  Chat
                </Button>
                <Button color="inherit" component={Link} to="/profile">
                  Profile
                </Button>
              </>
            )}
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/search" element={<Search />} />
            <Route path="/activity" element={<ActivityFeed />} />
            <Route path="/create-fundraiser" element={<CreateFundraiser />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </Container>
        <Snackbar open={!!notification} autoHideDuration={6000} onClose={handleCloseNotification}>
          <Alert onClose={handleCloseNotification} severity="info" sx={{ width: '100%' }}>
            {notification?.title}: {notification?.message}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    </Router>
  );
}

export default App;