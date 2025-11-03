import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Auth.css';

export const VerifyEmail: React.FC = () => {
  const [code, setCode] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const { verifyEmail, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      return;
    }

    try {
      await verifyEmail(email, code);
      navigate('/verify-age');
    } catch (err) {
      // Error handled in context
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      // Backend will send new code
      // await api.post('/auth/resend-verification-code', { email });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Verify Email</h1>
        <p className="auth-subtitle">We sent a 6-digit code to {email}</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="code">Verification Code</label>
            <input
              id="code"
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              disabled={loading}
              className="code-input"
            />
            <small>Enter the 6-digit code sent to your email</small>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || code.length !== 6} 
            className="btn-primary"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <button 
          onClick={handleResend}
          disabled={resendLoading}
          className="btn-link"
        >
          {resendLoading ? 'Sending...' : "Didn't receive code? Send again"}
        </button>
      </div>
    </div>
  );
};
