import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export const Signup: React.FC = () => {
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [formError, setFormError] = useState<string | null>(null);
  const { signup, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setFormError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.email) {
      setFormError('Email is required');
      return false;
    }
    if (!formData.email.includes('@')) {
      setFormError('Invalid email format');
      return false;
    }
    if (!formData.password) {
      setFormError('Password is required');
      return false;
    }
    if (formData.password.length < 12) {
      setFormError('Password must be at least 12 characters');
      return false;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setFormError('Password must contain uppercase letter');
      return false;
    }
    if (!/[0-9]/.test(formData.password)) {
      setFormError('Password must contain number');
      return false;
    }
    if (!/[!@#$%^&*]/.test(formData.password)) {
      setFormError('Password must contain special character (!@#$%^&*)');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await signup(formData.email, formData.password);
      navigate('/verify-email', { state: { email: formData.email } });
    } catch (err) {
      // Error is handled in context
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="auth-subtitle">Keep it real. No bots allowed.</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 12 chars, uppercase, number, special char"
              disabled={loading}
            />
            <small className="password-hint">
              ✓ Min 12 characters
              {formData.password.length >= 12 && ' ✓'}
              <br />
              ✓ 1 uppercase letter
              {/[A-Z]/.test(formData.password) && ' ✓'}
              <br />
              ✓ 1 number
              {/[0-9]/.test(formData.password) && ' ✓'}
              <br />
              ✓ 1 special character
              {/[!@#$%^&*]/.test(formData.password) && ' ✓'}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              disabled={loading}
            />
          </div>

          {(formError || error) && (
            <div className="error-message">
              {formError || error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <a href="/login">Log in</a>
        </p>
      </div>
    </div>
  );
};
