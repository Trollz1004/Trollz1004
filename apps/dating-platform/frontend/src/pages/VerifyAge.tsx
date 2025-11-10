import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

export const VerifyAge: React.FC = () => {
  const [birthdate, setBirthdate] = useState('');
  const [step, setStep] = useState<'birthdate' | 'phone'>('birthdate');
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const { verifyAge, verifyPhone, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleBirthdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyAge(birthdate);
      setStep('phone');
    } catch (err) {
      // Error handled in context
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyPhone(phone, phoneCode);
      navigate('/accept-tos');
    } catch (err) {
      // Error handled in context
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Verify Your Age</h1>
        <p className="auth-subtitle">You must be 18+ to use Anti-AI Dating</p>

        {step === 'birthdate' ? (
          <form onSubmit={handleBirthdateSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="birthdate">Date of Birth</label>
              <input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                disabled={loading}
                max={new Date(Date.now() - 18*365*24*60*60*1000).toISOString().split('T')[0]}
              />
              <small>We use encryption to protect your birthdate</small>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || !birthdate} 
              className="btn-primary"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePhoneSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1-415-555-0100"
                disabled={loading}
              />
              <small>We'll send a verification code via SMS</small>
            </div>

            <div className="form-group">
              <label htmlFor="phoneCode">Verification Code</label>
              <input
                id="phoneCode"
                type="text"
                maxLength={6}
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || !phone || phoneCode.length !== 6} 
              className="btn-primary"
            >
              {loading ? 'Verifying...' : 'Verify Phone'}
            </button>

            <button 
              type="button"
              onClick={() => setStep('birthdate')}
              className="btn-link"
            >
              Go back
            </button>
          </form>
        )}
      </div>

      <div className="info-box">
        <h3>Why we verify age:</h3>
        <ul>
          <li>✓ Protect minors (18+ requirement)</li>
          <li>✓ Legal requirement for dating apps</li>
          <li>✓ Your data is encrypted and secure</li>
          <li>✓ We never share your birthdate</li>
        </ul>
      </div>
    </div>
  );
};
