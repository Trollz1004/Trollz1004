import { Router } from 'express';
import * as admin from 'firebase-admin';
import { isAuthenticated } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { sendNewsletterSchema } from '../validation/marketing';
import { sendEmail } from '../email';
import logger from '../logger';

const router = Router();

// Send a newsletter to all users
router.post('/send-newsletter', isAuthenticated, validate(sendNewsletterSchema), async (req, res) => {
  // Add admin role check here in a real application
  const { subject, body } = req.body;

  try {
    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = usersSnapshot.docs.map((doc) => doc.data());

    for (const user of users) {
      await sendEmail(user.email, subject, body);
    }

    logger.info('Newsletter sent successfully');
    res.json({ message: 'Newsletter sent successfully' });
  } catch (error) {
    logger.error('Error sending newsletter:', error);
    res.status(500).json({ message: 'Error sending newsletter' });
  }
});

export const marketingRouter = router;