import { Router } from 'express';
import * as admin from 'firebase-admin';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { registerSchema } from '../validation/auth';
import logger from '../logger';

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

export const authRouter = router;