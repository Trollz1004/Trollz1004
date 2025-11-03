import { Router, Request, Response } from 'express';
import multer from 'multer';
import pool from '../database';
import { requireAuth, AuthRequest } from '../middleware/auth';
import logger from '../logger';

export const profileRouter = Router();
const upload = multer({ dest: 'uploads/' });

// CREATE PROFILE
profileRouter.post('/', requireAuth, upload.array('photos', 6), async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, bio, gender, interestedIn, location, interests } = req.body;
  const userId = req.userId;

  if (!firstName || !lastName || !bio || !gender || !interestedIn || !location) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Save photos (TODO: upload to S3/GCS)
    const photos = req.files?.map((f: any) => f.path) || [];

    const result = await pool.query(
      `INSERT INTO profiles (user_id, first_name, last_name, bio, gender, interested_in, location, photos, interests)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, firstName, lastName, bio, gender, interestedIn, location, JSON.stringify(photos), JSON.stringify(interests.split(','))]
    );

    logger.info(`Profile created for user: ${userId}`);
    res.status(201).json({ message: 'Profile created', profile: result.rows[0] });
  } catch (error) {
    logger.error('Profile creation error:', error);
    res.status(500).json({ message: 'Profile creation failed' });
  }
});

// GET DISCOVER PROFILES (next profile to swipe)
profileRouter.get('/discover', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    // Get current user's profile
    const userProfile = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    if (userProfile.rows.length === 0) {
      return res.status(404).json({ message: 'Complete your profile first' });
    }

    const user = userProfile.rows[0];
    const limit = req.query.limit || 1;

    // Get profiles not yet seen
    const result = await pool.query(
      `SELECT p.*, u.id as user_id, u.email 
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id != $1
       AND p.user_id NOT IN (
         SELECT target_user_id FROM interactions WHERE user_id = $1
       )
       AND u.age_verified = true AND u.phone_verified = true AND u.tos_accepted_at IS NOT NULL
       LIMIT $2`,
      [userId, limit]
    );

    if (result.rows.length === 0) {
      return res.json({ profile: null, message: 'No more profiles' });
    }

    const profile = result.rows[0];
    res.json({ profile });
  } catch (error) {
    logger.error('Discover error:', error);
    res.status(500).json({ message: 'Failed to load profiles' });
  }
});

// GET USER PROFILE
profileRouter.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const result = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// UPDATE PROFILE
profileRouter.put('/', requireAuth, upload.array('photos', 6), async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, bio, interests } = req.body;
  const userId = req.userId;

  try {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (firstName) {
      updateFields.push(`first_name = $${paramCount++}`);
      values.push(firstName);
    }
    if (lastName) {
      updateFields.push(`last_name = $${paramCount++}`);
      values.push(lastName);
    }
    if (bio) {
      updateFields.push(`bio = $${paramCount++}`);
      values.push(bio);
    }
    if (interests) {
      updateFields.push(`interests = $${paramCount++}`);
      values.push(JSON.stringify(interests.split(',')));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `UPDATE profiles SET ${updateFields.join(', ')} WHERE user_id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    logger.info(`Profile updated for user: ${userId}`);
    res.json({ message: 'Profile updated', profile: result.rows[0] });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ message: 'Profile update failed' });
  }
});

export default profileRouter;
