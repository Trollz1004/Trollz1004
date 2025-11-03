import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../database';
import logger from '../logger';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import smsService from '../automations/sms/smsService';

const router = Router();

/**
 * POST /api/sms/send-verification
 * Send SMS verification code to phone number
 */
router.post(
  '/send-verification',
  authenticate,
  [
    body('phoneNumber')
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Invalid phone number format (use E.164 format)'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { phoneNumber } = req.body;
      const userId = (req as any).user.id;

      // Check if phone number is already verified by another user
      const existingPhone = await pool.query(
        `SELECT id FROM users 
         WHERE phone = $1 AND phone_verified = TRUE AND id != $2`,
        [phoneNumber, userId]
      );

      if (existingPhone.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered',
        });
      }

      // Rate limiting: Check if code was sent recently
      const recentCode = await pool.query(
        `SELECT created_at FROM sms_verification_codes
         WHERE phone_number = $1
           AND created_at > NOW() - INTERVAL '1 minute'
         ORDER BY created_at DESC
         LIMIT 1`,
        [phoneNumber]
      );

      if (recentCode.rows.length > 0) {
        const secondsToWait = Math.ceil(
          60 - (Date.now() - new Date(recentCode.rows[0].created_at).getTime()) / 1000
        );
        return res.status(429).json({
          success: false,
          message: `Please wait ${secondsToWait} seconds before requesting another code`,
        });
      }

      // Send verification code
      const result = await smsService.sendVerificationCode(phoneNumber);

      if (result.success) {
        // Update user's phone number (not yet verified)
        await pool.query(
          `UPDATE users SET phone = $1 WHERE id = $2`,
          [phoneNumber, userId]
        );

        res.json({
          success: true,
          message: 'Verification code sent',
          expiresAt: result.expiresAt,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to send verification code',
        });
      }
    } catch (error: any) {
      logger.error('Error sending verification code', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/sms/verify-code
 * Verify SMS code
 */
router.post(
  '/verify-code',
  authenticate,
  [
    body('phoneNumber')
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Invalid phone number format'),
    body('code')
      .isLength({ min: 6, max: 6 })
      .withMessage('Code must be 6 digits'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { phoneNumber, code } = req.body;
      const userId = (req as any).user.id;

      // Verify the user owns this phone number
      const userPhone = await pool.query(
        `SELECT phone FROM users WHERE id = $1`,
        [userId]
      );

      if (userPhone.rows.length === 0 || userPhone.rows[0].phone !== phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number does not match user account',
        });
      }

      // Verify code
      const result = await smsService.verifyCode(phoneNumber, code);

      if (result.success) {
        res.json({
          success: true,
          message: 'Phone number verified successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Invalid verification code',
        });
      }
    } catch (error: any) {
      logger.error('Error verifying code', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/sms/send (Admin only)
 * Send SMS to specific user or phone number
 */
router.post(
  '/send',
  authenticate,
  requireAdmin,
  [
    body('phoneNumber').optional().matches(/^\+?[1-9]\d{1,14}$/),
    body('userId').optional().isUUID(),
    body('message').notEmpty().withMessage('Message is required'),
    body('template').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { phoneNumber, userId, message, template } = req.body;
      let targetPhone = phoneNumber;

      // If userId provided, get phone from user
      if (userId && !phoneNumber) {
        const userResult = await pool.query(
          `SELECT phone FROM users WHERE id = $1 AND phone_verified = TRUE`,
          [userId]
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found or phone not verified',
          });
        }

        targetPhone = userResult.rows[0].phone;
      }

      if (!targetPhone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number or userId required',
        });
      }

      // Queue or send SMS
      if (template) {
        const queueResult = await smsService.queueSMS(
          userId || null,
          targetPhone,
          template,
          { message }
        );

        if (queueResult.success) {
          res.json({
            success: true,
            message: 'SMS queued successfully',
            queueId: queueResult.queueId,
          });
        } else {
          res.status(500).json({
            success: false,
            message: queueResult.error || 'Failed to queue SMS',
          });
        }
      } else {
        const sendResult = await smsService.sendSMS(targetPhone, message);

        if (sendResult.success) {
          res.json({
            success: true,
            message: 'SMS sent successfully',
            sid: sendResult.sid,
          });
        } else {
          res.status(500).json({
            success: false,
            message: sendResult.error || 'Failed to send SMS',
          });
        }
      }
    } catch (error: any) {
      logger.error('Error sending SMS', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/sms/queue (Admin only)
 * Get SMS queue status
 */
router.get(
  '/queue',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      let query = 'SELECT * FROM sms_queue WHERE 1=1';
      const params: any[] = [];

      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }

      query += ' ORDER BY created_at DESC';

      params.push(limit);
      query += ` LIMIT $${params.length}`;

      params.push(offset);
      query += ` OFFSET $${params.length}`;

      const result = await pool.query(query, params);

      // Get queue stats
      const stats = await pool.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM sms_queue
        GROUP BY status
      `);

      res.json({
        success: true,
        queue: result.rows,
        stats: stats.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {} as Record<string, number>),
      });
    } catch (error: any) {
      logger.error('Error fetching SMS queue', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/sms/stats (Admin only)
 * Get SMS statistics
 */
router.get(
  '/stats',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      let query = `
        SELECT 
          DATE(created_at) as date,
          status,
          COUNT(*) as count
        FROM sms_queue
        WHERE 1=1
      `;
      const params: any[] = [];

      if (startDate) {
        params.push(startDate);
        query += ` AND created_at >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        query += ` AND created_at <= $${params.length}`;
      }

      query += ' GROUP BY DATE(created_at), status ORDER BY date DESC';

      const result = await pool.query(query, params);

      // Get verification stats
      const verificationStats = await pool.query(`
        SELECT 
          COUNT(*) as total_codes,
          COUNT(*) FILTER (WHERE verified = TRUE) as verified_codes,
          AVG(attempts) FILTER (WHERE verified = TRUE) as avg_attempts
        FROM sms_verification_codes
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      res.json({
        success: true,
        dailyStats: result.rows,
        verificationStats: verificationStats.rows[0],
      });
    } catch (error: any) {
      logger.error('Error fetching SMS stats', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/sms/retry/:id (Admin only)
 * Retry failed SMS
 */
router.post(
  '/retry/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Update status to pending
      const result = await pool.query(
        `UPDATE sms_queue
         SET status = 'pending', error_message = NULL
         WHERE id = $1 AND status = 'failed'
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'SMS not found or not in failed status',
        });
      }

      res.json({
        success: true,
        message: 'SMS queued for retry',
        sms: result.rows[0],
      });
    } catch (error: any) {
      logger.error('Error retrying SMS', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

export default router;
