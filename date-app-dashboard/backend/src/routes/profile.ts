import { Router } from 'express';
import multer from 'multer';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { uploadFile } from '../gcs';
import * as admin from 'firebase-admin';
import logger from '../logger';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

router.post('/upload-avatar', isAuthenticated, upload.single('avatar'), async (req: AuthenticatedRequest, res) => {
  const { file } = req;
  const { uid } = req.user!;

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const publicUrl = await uploadFile(file);
    await admin.firestore().collection('users').doc(uid).update({ avatar: publicUrl });
    res.json({ avatarUrl: publicUrl });
  } catch (error) {
    logger.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Error uploading avatar' });
  }
});

export const profileRouter = router;
