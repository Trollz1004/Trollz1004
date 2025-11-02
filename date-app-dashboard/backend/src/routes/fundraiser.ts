import { Router } from 'express';
import * as admin from 'firebase-admin';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createFundraiserSchema } from '../validation/fundraiser';
import logger from '../logger';

const router = Router();

// Get all fundraisers
router.get('/', async (req, res) => {
  try {
    const fundraisersSnapshot = await admin.firestore().collection('fundraisers').get();
    const fundraisers = fundraisersSnapshot.docs.map((doc) => doc.data());
    res.json(fundraisers);
  } catch (error) {
    logger.error('Error fetching fundraisers:', error);
    res.status(500).json({ message: 'Error fetching fundraisers' });
  }
});

// Create a new fundraiser
router.post('/create', isAuthenticated, validate(createFundraiserSchema), async (req: AuthenticatedRequest, res) => {
  const { uid } = req.user!;
  const { title, description, goal } = req.body;

  try {
    const newFundraiser = {
      title,
      description,
      goal,
      raised: 0,
      creator: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await admin.firestore().collection('fundraisers').add(newFundraiser);

    logger.info(`Fundraiser created successfully: ${docRef.id}`);
    res.status(201).json({ message: 'Fundraiser created successfully', id: docRef.id });
  } catch (error) {
    logger.error('Error creating fundraiser:', error);
    res.status(500).json({ message: 'Error creating fundraiser' });
  }
});

export const fundraiserRouter = router;