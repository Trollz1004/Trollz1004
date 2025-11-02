import { Router } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import * as admin from 'firebase-admin';
import logger from '../logger';

const router = Router();

// Generate 2FA secret and QR code
router.post('/setup', isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { uid, email } = req.user!;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Date App DAO (${email})`,
      length: 20,
    });

    // Store secret temporarily (user must verify before enabling)
    await admin.firestore().collection('users').doc(uid).update({
      twoFactorTempSecret: secret.base32,
      twoFactorEnabled: false,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    res.json({
      secret: secret.base32,
      qrCode,
    });
  } catch (error) {
    logger.error('Error setting up 2FA:', error);
    res.status(500).json({ message: 'Error setting up 2FA' });
  }
});

// Verify and enable 2FA
router.post('/verify', isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { uid } = req.user!;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Get temp secret
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (!userData?.twoFactorTempSecret) {
      return res.status(400).json({ message: 'No 2FA setup in progress' });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: userData.twoFactorTempSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    // Enable 2FA and move temp secret to permanent
    await admin.firestore().collection('users').doc(uid).update({
      twoFactorSecret: userData.twoFactorTempSecret,
      twoFactorEnabled: true,
      twoFactorTempSecret: admin.firestore.FieldValue.delete(),
    });

    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    logger.error('Error verifying 2FA:', error);
    res.status(500).json({ message: 'Error verifying 2FA' });
  }
});

// Disable 2FA
router.post('/disable', isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { uid } = req.user!;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Get user data
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (!userData?.twoFactorEnabled || !userData?.twoFactorSecret) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }

    // Verify token before disabling
    const verified = speakeasy.totp.verify({
      secret: userData.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    // Disable 2FA
    await admin.firestore().collection('users').doc(uid).update({
      twoFactorSecret: admin.firestore.FieldValue.delete(),
      twoFactorEnabled: false,
    });

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    logger.error('Error disabling 2FA:', error);
    res.status(500).json({ message: 'Error disabling 2FA' });
  }
});

// Check 2FA status
router.get('/status', isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { uid } = req.user!;
    
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const userData = userDoc.data();

    res.json({
      enabled: userData?.twoFactorEnabled || false,
    });
  } catch (error) {
    logger.error('Error checking 2FA status:', error);
    res.status(500).json({ message: 'Error checking 2FA status' });
  }
});

export const twoFactorRouter = router;
