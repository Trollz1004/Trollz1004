import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

export const AcceptTOS: React.FC = () => {
  const [agreed, setAgreed] = useState(false);
  const { acceptTOS, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await acceptTOS();
      navigate('/complete-profile');
    } catch (err) {
      // Error handled in context
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Terms of Service</h1>
        
        <div className="tos-container">
          <div className="tos-content">
            <h3>Anti-AI Dating Platform - Terms of Service</h3>
            
            <h4>1. Age Requirement (MANDATORY)</h4>
            <p>
              You confirm that you are 18 years or older. Providing false age 
              information is a violation of these terms and may result in permanent ban.
            </p>

            <h4>2. User Responsibility</h4>
            <p>
              This platform connects real humans for genuine relationships. We are not 
              responsible for user-to-user interactions off-platform. You engage at your 
              own risk. We recommend:
            </p>
            <ul>
              <li>Meet in public places</li>
              <li>Tell someone where you're going</li>
              <li>Trust your instincts</li>
              <li>Report suspicious behavior</li>
            </ul>

            <h4>3. Prohibited Content</h4>
            <p>
              You agree not to share:
            </p>
            <ul>
              <li>Explicit/sexual content in profiles</li>
              <li>External links or contact info</li>
              <li>Hate speech or discrimination</li>
              <li>Scams or misleading information</li>
            </ul>

            <h4>4. Privacy & Data Protection</h4>
            <p>
              Your data is encrypted and protected:
            </p>
            <ul>
              <li>Birthdate: Encrypted (AES-256)</li>
              <li>Phone: Hashed (one-way, cannot be reversed)</li>
              <li>Location: Approximate (buffered for privacy)</li>
              <li>Payments: Never stored (Square handles securely)</li>
            </ul>

            <h4>5. Liability Waiver</h4>
            <p>
              Anti-AI Dating is provided "as-is". We are not liable for:
            </p>
            <ul>
              <li>User behavior or safety incidents</li>
              <li>Data accuracy (verify profile info)</li>
              <li>Service interruptions or data loss</li>
              <li>Actions of third-party services</li>
            </ul>

            <h4>6. Enforcement</h4>
            <p>
              Violations may result in:
            </p>
            <ul>
              <li>Profile suspension (7 days)</li>
              <li>Permanent ban (repeated violations)</li>
              <li>Account deletion with no refund</li>
            </ul>

            <h4>7. GDPR & CCPA Compliance</h4>
            <p>
              You have the right to:
            </p>
            <ul>
              <li>Access your data (export within 30 days)</li>
              <li>Delete your account (removes all data)</li>
              <li>Opt-out of marketing emails</li>
            </ul>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group checkbox">
            <input
              id="agree"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="agree">
              I agree to all terms of service, privacy policy, and liability waiver
            </label>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !agreed} 
            className="btn-primary"
          >
            {loading ? 'Accepting...' : 'Accept & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};
