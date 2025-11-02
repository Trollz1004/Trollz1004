import React, { useEffect, useState } from 'react';
import AdminDashboard from './components/AdminDashboard';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const { user } = useAuthStore();
  const [notification, setNotification] = useState<{ title: string; message: string } | null>(null);

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
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                Date App DAO
              </Link>
            </Typography>
            {user && (
              <>
                {user.role === 'admin' && (
                  <Button color="inherit" component={Link} to="/admin">
                    Admin
                  </Button>
                )}
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
            <Route path="/create-fundraiser" element={<CreateFundraiser />} />
            <Route path="/admin" element={<AdminDashboard />} />
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