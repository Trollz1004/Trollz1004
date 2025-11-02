import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Button,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { socket } from './socket';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import Profile from './components/Profile';
import Chat from './components/Chat';
import CreateFundraiser from './components/CreateFundraiser';
import Search from './components/Search';
import Analytics from './components/Analytics';
import ActivityFeed from './components/ActivityFeed';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const lightTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

function App() {
  const { user } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();
  const [notification, setNotification] = useState<{ title: string; message: string } | null>(null);

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    if (user) {
      socket.connect();

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