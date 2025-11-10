import crypto from 'crypto';
import pool from '../../database';
import logger from '../../logger';
import { logAutomation } from '../utils/automationLogger';

/**
 * Configuration for referral code generation
 */
const REFERRAL_CODE_LENGTH = parseInt(process.env.REFERRAL_CODE_LENGTH || '8', 10);
const REFERRAL_EXPIRATION_DAYS = parseInt(process.env.REFERRAL_EXPIRATION_DAYS || '90', 10);
const MAX_GENERATION_ATTEMPTS = 5;

/**
 * Character set for referral codes (alphanumeric, excluding ambiguous characters)
 * Excludes: 0, O, I, 1, l to avoid confusion
 */
const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random alphanumeric referral code
 * @param length - Length of the code to generate
 * @returns Random alphanumeric string
 */
const generateRandomCode = (length: number): string => {
  let code = '';
  const charsetLength = CODE_CHARSET.length;
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % charsetLength;
    code += CODE_CHARSET[randomIndex];
  }

  return code;
};

/**
 * Check if a referral code already exists in the database
 * @param code - The code to check
 * @returns True if code exists, false otherwise
 */
const codeExists = async (code: string): Promise<boolean> => {
  try {
    const result = await pool.query(
      'SELECT id FROM referral_codes WHERE code = $1',
      [code]
    );
    return result.rows.length > 0;
  } catch (error: any) {
    logger.error('Error checking code existence', { error: error.message, code });
    throw error;
  }
};

/**
 * Generate a unique referral code for a user
 * Uses collision detection to ensure uniqueness
 * 
 * @param userId - The user ID to generate a code for
 * @returns The generated referral code object
 * @throws Error if unable to generate unique code after max attempts
 */
export const generateReferralCode = async (userId: string): Promise<{
  id: string;
  code: string;
  expiresAt: Date;
  shareUrl: string;
}> => {
  const startTime = Date.now();

  try {
    // Check if user already has an active referral code
    const existingCode = await pool.query(
      `SELECT id, code, expires_at 
       FROM referral_codes 
       WHERE user_id = $1 AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [userId]
    );

    if (existingCode.rows.length > 0) {
      const existing = existingCode.rows[0];
      logger.info('User already has active referral code', { userId, code: existing.code });

      await logAutomation({
        service: 'referral',
        action: 'generate_code_skipped',
        status: 'success',
        details: { userId, existingCode: existing.code, reason: 'already_exists' },
      });

      return {
        id: existing.id,
        code: existing.code,
        expiresAt: existing.expires_at,
        shareUrl: `${process.env.FRONTEND_URL || 'https://app.trollz1004.com'}/signup?ref=${existing.code}`,
      };
    }

    // Generate unique code with collision detection
    let code: string = '';
    let attempts = 0;
    let isUnique = false;

    while (!isUnique && attempts < MAX_GENERATION_ATTEMPTS) {
      code = generateRandomCode(REFERRAL_CODE_LENGTH);
      const exists = await codeExists(code);

      if (!exists) {
        isUnique = true;
      } else {
        attempts++;
        logger.warn('Referral code collision detected, retrying', { code, attempts });
      }
    }

    if (!isUnique) {
      throw new Error(`Failed to generate unique referral code after ${MAX_GENERATION_ATTEMPTS} attempts`);
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFERRAL_EXPIRATION_DAYS);

    // Insert into database
    const result = await pool.query(
      `INSERT INTO referral_codes (user_id, code, expires_at, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, code, expires_at`,
      [userId, code, expiresAt]
    );

    const generatedCode = result.rows[0];
    const duration = Date.now() - startTime;

    logger.info('Referral code generated successfully', {
      userId,
      code: generatedCode.code,
      expiresAt: generatedCode.expires_at,
      duration,
    });

    await logAutomation({
      service: 'referral',
      action: 'generate_code',
      status: 'success',
      details: {
        userId,
        code: generatedCode.code,
        expiresAt: generatedCode.expires_at,
        attempts,
        duration,
      },
    });

    return {
      id: generatedCode.id,
      code: generatedCode.code,
      expiresAt: generatedCode.expires_at,
      shareUrl: `${process.env.FRONTEND_URL || 'https://app.trollz1004.com'}/signup?ref=${generatedCode.code}`,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('Failed to generate referral code', {
      error: error.message,
      userId,
      duration,
    });

    await logAutomation({
      service: 'referral',
      action: 'generate_code',
      status: 'failed',
      details: { userId, duration },
      errorMessage: error.message,
    });

    throw error;
  }
};

/**
 * Deactivate expired referral codes (cron job helper)
 * Should be run daily to clean up expired codes
 * 
 * @returns Number of codes deactivated
 */
export const deactivateExpiredCodes = async (): Promise<number> => {
  try {
    const result = await pool.query(
      `UPDATE referral_codes 
       SET is_active = FALSE 
       WHERE is_active = TRUE AND expires_at < NOW()
       RETURNING id`
    );

    const deactivatedCount = result.rows.length;

    logger.info('Deactivated expired referral codes', { count: deactivatedCount });

    await logAutomation({
      service: 'referral',
      action: 'deactivate_expired_codes',
      status: 'success',
      details: { deactivatedCount },
    });

    return deactivatedCount;
  } catch (error: any) {
    logger.error('Failed to deactivate expired codes', { error: error.message });

    await logAutomation({
      service: 'referral',
      action: 'deactivate_expired_codes',
      status: 'failed',
      errorMessage: error.message,
    });

    throw error;
  }
};

/**
 * Get referral code details by code string
 * @param code - The referral code to look up
 * @returns Referral code details or null if not found
 */
export const getReferralCodeDetails = async (code: string): Promise<{
  id: string;
  userId: string;
  code: string;
  isActive: boolean;
  expiresAt: Date | null;
} | null> => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, code, is_active, expires_at 
       FROM referral_codes 
       WHERE code = $1`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      code: row.code,
      isActive: row.is_active,
      expiresAt: row.expires_at,
    };
  } catch (error: any) {
    logger.error('Failed to get referral code details', {
      error: error.message,
      code,
    });
    throw error;
  }
};
