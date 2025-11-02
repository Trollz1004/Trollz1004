import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Box,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { Security, Check } from '@mui/icons-material';
import apiClient from '../api/axios';

export default function TwoFactorAuth() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data } = await apiClient.get('/api/2fa/status');
      setEnabled(data.enabled);
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.post('/api/2fa/setup');
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setActiveStep(1);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error setting up 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/api/2fa/verify', { token });
      setSuccess('2FA enabled successfully!');
      setEnabled(true);
      setActiveStep(0);
      setQrCode('');
      setSecret('');
      setToken('');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Invalid token');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/api/2fa/disable', { token });
      setSuccess('2FA disabled successfully!');
      setEnabled(false);
      setToken('');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error disabling 2FA');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Setup 2FA', 'Verify Token'];

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Security sx={{ mr: 1 }} />
          <Typography variant="h5">Two-Factor Authentication</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {enabled ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Check sx={{ mr: 1 }} />
                Two-factor authentication is enabled
              </Box>
            </Alert>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Your account is protected with two-factor authentication.
            </Typography>
            <TextField
              label="Enter 6-digit code to disable"
              variant="outlined"
              fullWidth
              value={token}
              onChange={(e) => setToken(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              color="error"
              onClick={handleDisable}
              disabled={loading || token.length !== 6}
            >
              Disable 2FA
            </Button>
          </Box>
        ) : activeStep === 0 ? (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Add an extra layer of security to your account by enabling two-factor authentication.
            </Typography>
            <Button variant="contained" onClick={handleSetup} disabled={loading}>
              Enable 2FA
            </Button>
          </Box>
        ) : (
          <Box>
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Typography variant="h6" gutterBottom>
              Step 1: Scan QR Code
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </Typography>
            {qrCode && (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <img src={qrCode} alt="QR Code" style={{ maxWidth: '200px' }} />
              </Box>
            )}

            <Typography variant="body2" sx={{ mb: 2 }}>
              Or manually enter this secret: <strong>{secret}</strong>
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Step 2: Verify Token
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Enter the 6-digit code from your authenticator app:
            </Typography>
            <TextField
              label="6-digit code"
              variant="outlined"
              fullWidth
              value={token}
              onChange={(e) => setToken(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setActiveStep(0);
                  setQrCode('');
                  setSecret('');
                  setToken('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleVerify}
                disabled={loading || token.length !== 6}
              >
                Verify and Enable
              </Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
