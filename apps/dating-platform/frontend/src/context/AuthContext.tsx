import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios, { AxiosInstance } from 'axios';

interface User {
  id: string;
  email: string;
  ageVerified: boolean;
  tosAccepted: boolean;
  subscriptionStatus: 'none' | 'premium' | 'premium_plus';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  verifyAge: (birthdate: string) => Promise<void>;
  verifyPhone: (phone: string, code: string) => Promise<void>;
  acceptTOS: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isFullyVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize API client
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add token to requests
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  const signup = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/signup', { email, password, confirmPassword: password });
      setError(null);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Signup failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/verify-email', { email, code });
      setError(null);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Email verification failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyAge = useCallback(async (birthdate: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/verify-age', { birthdate });
      setError(null);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Age verification failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyPhone = useCallback(async (phone: string, code: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/verify-phone', { phone, phoneCode: code });
      setError(null);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Phone verification failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptTOS = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/tos/accept', {
        tosVersion: '1.0.0',
        userAgreesFullTerms: true,
        userAgreesPrivacyPolicy: true,
        userAgreesLiabilityWaiver: true
      });
      
      if (user) {
        setUser({ ...user, tosAccepted: true });
      }
      setError(null);
    } catch (err: any) {
      const message = err.response?.data?.error || 'TOS acceptance failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('authToken', newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      setError(null);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    delete api.defaults.headers.common['Authorization'];
  }, []);

  const isFullyVerified = user?.ageVerified && user?.tosAccepted ? true : false;

  const value: AuthContextType = {
    user,
    token,
    loading,
    error,
    signup,
    verifyEmail,
    verifyAge,
    verifyPhone,
    acceptTOS,
    login,
    logout,
    isFullyVerified
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
