import { Router, Request, Response } from 'express';
import pool from '../database';
import { requireAuth, AuthRequest } from '../middleware/auth';
import logger from '../logger';

export const matchesRouter = Router();

// LIKE PROFILE
matchesRouter.post('/like/:targetUserId', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { targetUserId } = (req as any).params;

  if (userId === targetUserId) {
    return res.status(400).json({ message: 'Cannot like your own profile' });
  }

  try {
    // Record the interaction
    await pool.query(
      `INSERT INTO interactions (user_id, target_user_id, interaction_type) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, target_user_id) DO UPDATE SET interaction_type = $3`,
      [userId, targetUserId, 'like']
    );

    // Check if it's a mutual like (match)
    const mutualLike = await pool.query(
      `SELECT * FROM interactions WHERE user_id = $1 AND target_user_id = $2 AND interaction_type = 'like'`,
      [targetUserId, userId]
    );

    let isMatch = false;
    if (mutualLike.rows.length > 0) {
      // Create match
      const user1 = userId! < targetUserId ? userId! : targetUserId;
      const user2 = userId! < targetUserId ? targetUserId : userId!;
      await pool.query(
        `INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2)
         ON CONFLICT (user1_id, user2_id) DO NOTHING`,
        [user1, user2]
      );
      isMatch = true;
      logger.info(`Match created between ${userId} and ${targetUserId}`);
    }

    res.json({ message: 'Profile liked', match: isMatch });
  } catch (error) {
    logger.error('Like error:', error);
    res.status(500).json({ message: 'Failed to like profile' });
  }
});

// PASS PROFILE
matchesRouter.post('/pass/:targetUserId', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { targetUserId } = (req as any).params;

  try {
    await pool.query(
      `INSERT INTO interactions (user_id, target_user_id, interaction_type) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, target_user_id) DO UPDATE SET interaction_type = $3`,
      [userId, targetUserId, 'pass']
    );

    logger.info(`Profile passed by ${userId}`);
    res.json({ message: 'Profile passed' });
  } catch (error) {
    logger.error('Pass error:', error);
    res.status(500).json({ message: 'Failed to pass profile' });
  }
});

// GET ALL MATCHES
matchesRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    const result = await pool.query(
      `SELECT m.id, 
              CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END as other_user_id,
              m.matched_at
       FROM matches m
       WHERE m.user1_id = $1 OR m.user2_id = $1
       ORDER BY m.matched_at DESC`,
      [userId]
    );

    const matches = [];
    for (const match of result.rows) {
      const profile = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [match.other_user_id]);
      matches.push({
        id: match.id,
        profile: profile.rows[0],
        matchedAt: match.matched_at,
      });
    }

    res.json({ matches });
  } catch (error) {
    logger.error('Get matches error:', error);
    res.status(500).json({ message: 'Failed to fetch matches' });
  }
});

// SEND MESSAGE
matchesRouter.post('/:matchId/message', requireAuth, async (req: AuthRequest, res: Response) => {
  const { matchId } = (req as any).params;
  const { content } = (req as any).body;
  const senderId = req.userId;

  if (!content) {
    return res.status(400).json({ message: 'Message content is required' });
  }

  try {
    // Verify user is part of this match
    const match = await pool.query('SELECT * FROM matches WHERE id = $1', [matchId]);
    if (match.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const matchData = match.rows[0];
    if (matchData.user1_id !== senderId && matchData.user2_id !== senderId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Save message
    const result = await pool.query(
      `INSERT INTO messages (match_id, sender_id, content) 
       VALUES ($1, $2, $3)
       RETURNING *`,
      [matchId, senderId, content]
    );

    // Update match's last_message_at
    await pool.query('UPDATE matches SET last_message_at = NOW() WHERE id = $1', [matchId]);

    logger.info(`Message sent in match: ${matchId}`);
    res.status(201).json({ message: 'Message sent', data: result.rows[0] });
  } catch (error) {
    logger.error('Send message error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// GET MESSAGES
matchesRouter.get('/:matchId/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  const { matchId } = (req as any).params;
  const userId = req.userId;

  try {
    // Verify user is part of this match
    const match = await pool.query('SELECT * FROM matches WHERE id = $1', [matchId]);
    if (match.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const matchData = match.rows[0];
    if (matchData.user1_id !== userId && matchData.user2_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC`,
      [matchId]
    );

    // Mark messages as read
    await pool.query(
      `UPDATE messages SET is_read = true WHERE match_id = $1 AND sender_id != $2`,
      [matchId, userId]
    );

    res.json({ messages: result.rows });
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

export default matchesRouter;
