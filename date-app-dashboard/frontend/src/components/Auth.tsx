import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/axios';
import { Button, TextField, Card, CardContent, Typography, Box } from '@mui/material';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { setToken, setUser, user, logout } = useAuthStore();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const token = await userCredential.user.getIdToken();
        setToken(token);
        const { data } = await apiClient.get('/api/auth/me');
        setUser(data);
      } catch (error) {
        console.error('Error signing in:', error);
      }
    } else {
      try {
        await apiClient.post('/api/auth/register', { email, password, displayName });
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const token = await userCredential.user.getIdToken();
        setToken(token);
        const { data } = await apiClient.get('/api/auth/me');
        setUser(data);
      } catch (error) {
        console.error('Error signing up:', error);
      }
    }
  };

  if (user) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h5">Welcome, {user.displayName}</Typography>
          <Button variant="contained" onClick={logout} sx={{ mt: 2 }}>
            Logout
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5">{isLogin ? 'Login' : 'Register'}</Typography>
        <Box component="form" onSubmit={handleAuth} sx={{ mt: 2 }}>
          {!isLogin && (
            <TextField
              label="Display Name"
              variant="outlined"
              fullWidth
              margin="normal"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}
          <TextField
            label="Email"
            type="email"
            variant="outlined"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            {isLogin ? 'Login' : 'Register'}
          </Button>
        </Box>
        <Button onClick={() => setIsLogin(!isLogin)} sx={{ mt: 2 }}>
          {isLogin ? 'Need to register?' : 'Already have an account?'}
        </Button>
      </CardContent>
    </Card>
  );
}