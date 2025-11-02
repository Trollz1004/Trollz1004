import { Router } from 'express';
import * as admin from 'firebase-admin';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { registerSchema } from '../validation/auth';
import logger from '../logger';

import { getIO } from '../socket';

import { sendEmail } from '../email';

const router = Router();

// Register a new user
router.post('/register', validate(registerSchema), async (req, res) => {
  const { email, password, displayName } = req.body;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });

    // Create user profile in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Emit a welcome notification
    getIO().to(userRecord.uid).emit('notification', {
      title: 'Welcome!',
      message: `Welcome to the Date App DAO, ${displayName}!`,
    });

    // Send a welcome email
    await sendEmail(
      email,
      'Welcome to the Date App DAO',
      `<h1>Welcome, ${displayName}!</h1><p>Thank you for joining the Date App DAO.</p>`
    );

    logger.info(`User created successfully: ${userRecord.uid}`);
    res.status(201).json({ message: 'User created successfully', uid: userRecord.uid });
  } catch (error) {
    logger.error('Error creating new user:', error);
    res.status(500).json({ message: 'Error creating new user' });
  }
});

// Get current user's profile
router.get('/me', isAuthenticated, async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;

  try {
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(userDoc.data());
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

import { requestPasswordResetSchema, resetPasswordSchema } from '../validation/auth';
import { v4 as uuidv4 } from 'uuid';

// ... (existing code)

// Request password reset
router.post('/request-password-reset', validate(requestPasswordResetSchema), async (req, res) => {
  const { email } = req.body;

  try {
    const user = await admin.auth().getUserByEmail(email);
    const token = uuidv4();

    await admin.firestore().collection('passwordResetTokens').doc(token).set({
      uid: user.uid,
      expires: Date.now() + 3600000, // 1 hour
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendEmail(
      email,
      'Password Reset Request',
      `<h1>Password Reset</h1><p>Click <a href="${resetLink}">here</a> to reset your password.</p>`
    );

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    logger.error('Error requesting password reset:', error);
    res.status(500).json({ message: 'Error requesting password reset' });
  }
});

// Reset password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  const { token, password } = req.body;

  try {
    const tokenDoc = await admin.firestore().collection('passwordResetTokens').doc(token).get();

    if (!tokenDoc.exists) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const { uid, expires } = tokenDoc.data()!;

    if (Date.now() > expires) {
      await tokenDoc.ref.delete();
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    await admin.auth().updateUser(uid, { password });
    await tokenDoc.ref.delete();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

export const authRouter = router;