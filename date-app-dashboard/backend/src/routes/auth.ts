import { Router, Request, Response, CookieOptions } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import pool from '../database';
import { requireAuth, AuthRequest } from '../middleware/auth';
import logger from '../logger';
import config from '../config';
import {
  sendVerificationEmail,
  sendNewDeviceAlertEmail,
  sendAccountLockedEmail,
  sendPasswordChangedEmail,
} from '../services/emailService';
import { logSecurityEvent, getSecurityEventsForUser } from '../services/securityEventService';
import { generateRefreshToken, signAccessToken } from '../utils/token';
import { hashRefreshToken, hashVerificationCode, hashPhoneValue } from '../utils/hash';
import { getCookie } from '../utils/cookies';
import { sendWelcomeSequence } from '../automations/email/emailTriggerService';

export const authRouter = Router();

const REFRESH_COOKIE_NAME = 'refreshToken';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'strict',
  path: '/api/auth',
};

type SessionRow = {
  id: string;
  created_at: Date;
  expires_at: Date;
  revoked: boolean;
  revoked_at: Date | null;
  user_agent: string | null;
  ip_address: string | null;
};

type UserRow = {
  id: string;
  email: string;
  email_verified: boolean;
  phone_verified: boolean;
  age_verified: boolean;
  tos_accepted_at: Date | null;
  subscription_tier: string | null;
  failed_login_attempts: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  last_login_ip: string | null;
  last_login_user_agent: string | null;
  created_at: Date;
  updated_at: Date;
};

type UserWithSecretsRow = UserRow & {
  password_hash: string;
};

const LOGIN_LOCK_THRESHOLD = 5;
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000;
const SECURITY_EVENTS_DEFAULT_LIMIT = 20;
const SECURITY_EVENTS_MAX_LIMIT = 100;

const mapUserRowToResponse = (user: UserRow) => ({
  id: user.id,
  email: user.email,
  emailVerified: user.email_verified,
  phoneVerified: user.phone_verified,
  ageVerified: user.age_verified,
  tosAcceptedAt: user.tos_accepted_at,
  subscriptionTier: user.subscription_tier,
  failedLoginAttempts: user.failed_login_attempts ?? 0,
  lockedUntil: user.locked_until,
  lastLoginAt: user.last_login_at,
  lastLoginIp: user.last_login_ip,
  lastLoginUserAgent: user.last_login_user_agent,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

const scrubUserSecrets = (user: UserWithSecretsRow): UserRow => ({
  id: user.id,
  email: user.email,
  email_verified: user.email_verified,
  phone_verified: user.phone_verified,
  age_verified: user.age_verified,
  tos_accepted_at: user.tos_accepted_at,
  subscription_tier: user.subscription_tier,
  failed_login_attempts: user.failed_login_attempts,
  locked_until: user.locked_until,
  last_login_at: user.last_login_at,
  last_login_ip: user.last_login_ip,
  last_login_user_agent: user.last_login_user_agent,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: config.auth.refreshTokenTtlMs,
  });
};

const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions);
};

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again later.',
});

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many verification requests. Please wait before retrying.',
});

const verifyAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many attempts. Please request a new code.',
});

const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const generateVerificationCode = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashPassword = (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

const encryptBirthdate = (birthdate: string): string => {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(config.security.encryptionSecret).digest().subarray(0, 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(birthdate), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

const sanitizeUserAgent = (userAgent?: string): string | undefined => {
  if (!userAgent) {
    return undefined;
  }
  return userAgent.substring(0, 255);
};

const getClientIp = (req: Request): string => {
  const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  const fallback = req.ip || '0.0.0.0';
  return (forwarded || fallback).substring(0, 45);
};

const createSession = async (userId: string, req: Request, res: Response) => {
  const refreshToken = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + config.auth.refreshTokenTtlMs);

  const session = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id` ,
    [
      userId,
      refreshHash,
      sanitizeUserAgent(req.headers['user-agent']) ?? null,
      getClientIp(req),
      expiresAt,
    ]
  );

  setRefreshTokenCookie(res, refreshToken);
  const sessionId = session.rows[0].id;
  const accessToken = signAccessToken(userId, sessionId);

  await logSecurityEvent({
    userId,
    eventType: 'auth.session.created',
    ipAddress: getClientIp(req),
    userAgent: sanitizeUserAgent(req.headers['user-agent']),
    metadata: { sessionId, expiresAt },
  });

  return { accessToken, sessionId, refreshTokenExpiresAt: expiresAt };
};

const isFullyVerified = (user: any): boolean => {
  return Boolean(user.email_verified && user.age_verified && user.phone_verified && user.tos_accepted_at);
};

authRouter.post('/signup', async (req: Request, res: Response) => {
  const { email, password } = (req.body || {}) as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (password.length < 12) {
    return res.status(400).json({ message: 'Password must be at least 12 characters' });
  }

  try {
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email`,
      [email, passwordHash]
    );

    const user = result.rows[0];
    logger.info('User registered', { userId: user.id });

    await logSecurityEvent({
      userId: user.id,
      eventType: 'account.signup',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
      metadata: { email },
    });

    // Trigger welcome email sequence
    try {
      await sendWelcomeSequence(user.id);
    } catch (emailError: any) {
      // Log email error but don't fail signup
      logger.warn('Failed to send welcome sequence', {
        userId: user.id,
        error: emailError.message,
      });
    }

    res.status(201).json({
      message: 'Signup successful',
      userId: user.id,
      email: user.email,
    });
  } catch (error: any) {
    logger.error('Signup error', { error: error.message });
    await logSecurityEvent({
      eventType: 'account.signup.failure',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
      metadata: { email, reason: error.message },
    });
    res.status(500).json({ message: 'Signup failed' });
  }
});

authRouter.post('/verify-email/send', verificationLimiter, async (req: Request, res: Response) => {
  const { email } = (req.body || {}) as { email?: string };

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userId = user.rows[0].id;
    const code = generateVerificationCode();
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `INSERT INTO verification_codes (user_id, code, code_type, expires_at, attempts, is_used)
       VALUES ($1, $2, 'email', $3, 0, false)
       ON CONFLICT (user_id, code_type) DO UPDATE SET
         code = $2,
         expires_at = EXCLUDED.expires_at,
         attempts = 0,
         is_used = false`,
      [userId, codeHash, expiresAt]
    );

    await sendVerificationEmail(email, code);

    logger.info('Email verification code issued', { userId });
    await logSecurityEvent({
      userId,
      eventType: 'verification.email.sent',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
    });
    res.json({ message: 'Verification code sent' });
  } catch (error: any) {
    logger.error('Email verification send error', { error: error.message });
    await logSecurityEvent({
      userId: undefined,
      eventType: 'verification.email.failure',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
      metadata: { email, reason: error.message },
    });
    res.status(500).json({ message: 'Failed to send verification code' });
  }
});

authRouter.post('/verify-email', verifyAttemptLimiter, async (req: Request, res: Response) => {
  const { email, code } = (req.body || {}) as { email?: string; code?: string };

  if (!email || !code) {
    return res.status(400).json({ message: 'Email and code are required' });
  }

  try {
    const user = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userId = user.rows[0].id;
    const { rows } = await pool.query(
      `SELECT id, code, attempts, expires_at FROM verification_codes
       WHERE user_id = $1 AND code_type = 'email' AND is_used = false`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'No verification code found' });
    }

    const verification = rows[0];

    if (new Date(verification.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Verification code expired' });
    }

    const hashedInput = hashVerificationCode(code);

    if (verification.code !== hashedInput) {
      const attemptUpdate = await pool.query(
        'UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts',
        [verification.id]
      );
      const attempts = attemptUpdate.rows[0]?.attempts ?? verification.attempts + 1;
      if (attempts >= 5) {
        return res.status(429).json({ message: 'Too many attempts. Please request a new code' });
      }
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [userId]);
    await pool.query(
      'UPDATE verification_codes SET is_used = true, attempts = 0 WHERE id = $1',
      [verification.id]
    );

    logger.info('Email verified', { userId });
    await logSecurityEvent({
      userId,
      eventType: 'verification.email.success',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
    });
    res.json({ message: 'Email verified successfully' });
  } catch (error: any) {
    logger.error('Email verification error', { error: error.message });
    await logSecurityEvent({
      userId: undefined,
      eventType: 'verification.email.error',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
      metadata: { email, reason: error.message },
    });
    res.status(500).json({ message: 'Verification failed' });
  }
});

authRouter.post('/verify-age', requireAuth, async (req: AuthRequest, res: Response) => {
  const { birthdate } = (req.body || {}) as { birthdate?: string };

  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!birthdate) {
    return res.status(400).json({ message: 'Birthdate is required' });
  }

  try {
    const birth = new Date(birthdate);
    const age = new Date().getFullYear() - birth.getFullYear();
    if (age < 18) {
      return res.status(400).json({ message: 'Must be 18 years or older' });
    }

    const encrypted = encryptBirthdate(birthdate);

    await pool.query(
      'UPDATE users SET birthdate_encrypted = $1, age_verified = true WHERE id = $2',
      [encrypted, req.userId]
    );

    logger.info('Age verified', { userId: req.userId });
    await logSecurityEvent({
      userId: req.userId,
      eventType: 'verification.age.success',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
    });
    res.json({ message: 'Age verified successfully' });
  } catch (error: any) {
    logger.error('Age verification error', { error: error.message });
    await logSecurityEvent({
      userId: req.userId,
      eventType: 'verification.age.error',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
      metadata: { reason: error.message },
    });
    res.status(500).json({ message: 'Age verification failed' });
  }
});

authRouter.post('/verify-phone/send', [verificationLimiter, requireAuth], async (req: AuthRequest, res: Response) => {
  const { phone } = (req.body || {}) as { phone?: string };

  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!phone) {
    return res.status(400).json({ message: 'Phone is required' });
  }

  try {
    const code = generateVerificationCode();
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `INSERT INTO verification_codes (user_id, code, code_type, expires_at, attempts, is_used)
       VALUES ($1, $2, 'phone', $3, 0, false)
       ON CONFLICT (user_id, code_type) DO UPDATE SET
         code = $2,
         expires_at = EXCLUDED.expires_at,
         attempts = 0,
         is_used = false`,
      [req.userId, codeHash, expiresAt]
    );

    logger.info('Phone verification code generated', { userId: req.userId, phoneTail: phone.slice(-4) });
    await logSecurityEvent({
      userId: req.userId,
      eventType: 'verification.phone.sent',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
      metadata: { phoneTail: phone.slice(-4) },
    });
    res.status(202).json({ message: 'SMS verification initiated' });
  } catch (error: any) {
    logger.error('Phone verification send error', { error: error.message });
    await logSecurityEvent({
      userId: req.userId,
      eventType: 'verification.phone.failure',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
      metadata: { reason: error.message },
    });
    res.status(500).json({ message: 'Failed to send SMS' });
  }
});

authRouter.post('/verify-phone', [verifyAttemptLimiter, requireAuth], async (req: AuthRequest, res: Response) => {
  const { phone, code } = (req.body || {}) as { phone?: string; code?: string };

  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!phone || !code) {
    return res.status(400).json({ message: 'Phone and code are required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, code, attempts, expires_at FROM verification_codes
       WHERE user_id = $1 AND code_type = 'phone' AND is_used = false`,
      [req.userId]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    const verification = rows[0];

    if (new Date(verification.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Verification code expired' });
    }

    const hashedInput = hashVerificationCode(code);

    if (verification.code !== hashedInput) {
      const attemptUpdate = await pool.query(
        'UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts',
        [verification.id]
      );
      const attempts = attemptUpdate.rows[0]?.attempts ?? verification.attempts + 1;
      if (attempts >= 5) {
        return res.status(429).json({ message: 'Too many attempts. Please request a new code' });
      }
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    const phoneHash = hashPhoneValue(phone);

    await pool.query(
      'UPDATE users SET phone = $1, phone_hash = $2, phone_verified = true WHERE id = $3',
      [phone, phoneHash, req.userId]
    );
    await pool.query(
      'UPDATE verification_codes SET is_used = true, attempts = 0 WHERE id = $1',
      [verification.id]
    );

    logger.info('Phone verified', { userId: req.userId });
    await logSecurityEvent({
      userId: req.userId,
      eventType: 'verification.phone.success',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
    });
    res.json({ message: 'Phone verified successfully' });
  } catch (error: any) {
    logger.error('Phone verification error', { error: error.message });
    await logSecurityEvent({
      userId: req.userId,
      eventType: 'verification.phone.error',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
      metadata: { reason: error.message },
    });
    res.status(500).json({ message: 'Phone verification failed' });
  }
});

authRouter.post('/accept-tos', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const ipAddress = getClientIp(req);
  const userAgent = sanitizeUserAgent(req.headers['user-agent']);

  try {
    const tosVersion = '1.0.0';

    await pool.query('UPDATE users SET tos_accepted_at = NOW() WHERE id = $1', [req.userId]);
    await pool.query(
      `INSERT INTO tos_acceptance (user_id, tos_version, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [req.userId, tosVersion, ipAddress, userAgent]
    );

    logger.info('TOS accepted', { userId: req.userId, tosVersion });
    await logSecurityEvent({
      userId: req.userId,
      eventType: 'compliance.tos.accepted',
      ipAddress,
      userAgent,
      metadata: { tosVersion },
    });
    res.json({ message: 'Terms of Service accepted' });
  } catch (error: any) {
    logger.error('TOS acceptance error', { error: error.message });
    await logSecurityEvent({
      userId: req.userId,
      eventType: 'compliance.tos.error',
      ipAddress,
      userAgent,
      metadata: { reason: error.message },
    });
    res.status(500).json({ message: 'Failed to accept TOS' });
  }
});

authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { email, password } = (req.body || {}) as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const ipAddress = getClientIp(req);
  const userAgent = sanitizeUserAgent(req.headers['user-agent']);
  const now = new Date();

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      await logSecurityEvent({
        eventType: 'auth.login.failure',
        ipAddress,
        userAgent,
        metadata: { email, reason: 'user_not_found' },
      });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const userRecord = result.rows[0] as UserWithSecretsRow;
    let activeUser = scrubUserSecrets(userRecord);

    if (userRecord.locked_until) {
      const lockedUntilDate = new Date(userRecord.locked_until);
      if (lockedUntilDate > now) {
        await logSecurityEvent({
          userId: userRecord.id,
          eventType: 'auth.login.locked',
          ipAddress,
          userAgent,
          metadata: { lockedUntil: lockedUntilDate },
        });
        return res.status(423).json({
          message: 'Account temporarily locked. Please try again later.',
          lockExpiresAt: lockedUntilDate.toISOString(),
        });
      }

      const resetResult = await pool.query(
        `UPDATE users
         SET locked_until = NULL,
             failed_login_attempts = 0,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, email_verified, phone_verified, age_verified, tos_accepted_at, subscription_tier,
                   failed_login_attempts, locked_until, last_login_at, last_login_ip, last_login_user_agent,
                   created_at, updated_at`,
        [userRecord.id]
      );

      if (resetResult.rows.length > 0) {
        activeUser = resetResult.rows[0] as UserRow;
      } else {
        activeUser = { ...activeUser, failed_login_attempts: 0, locked_until: null };
      }
    }

    const previousIp = activeUser.last_login_ip ?? undefined;
    const previousUserAgent = activeUser.last_login_user_agent ?? undefined;

    const isPasswordValid = await bcrypt.compare(password, userRecord.password_hash);

    if (!isPasswordValid) {
      const nextAttempts = (activeUser.failed_login_attempts ?? 0) + 1;
      const willLock = nextAttempts >= LOGIN_LOCK_THRESHOLD;
      const lockUntil = willLock ? new Date(now.getTime() + LOGIN_LOCK_DURATION_MS) : null;

      const { rows: failureRows } = await pool.query(
        `UPDATE users
         SET failed_login_attempts = $1,
             locked_until = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING failed_login_attempts, locked_until`,
        [nextAttempts, lockUntil, userRecord.id]
      );

      const updatedAttempts = failureRows[0]?.failed_login_attempts ?? nextAttempts;
      const lockedUntilValue = failureRows[0]?.locked_until ?? lockUntil;
      const remainingAttempts = Math.max(LOGIN_LOCK_THRESHOLD - updatedAttempts, 0);

      await logSecurityEvent({
        userId: userRecord.id,
        eventType: 'auth.login.failure',
        ipAddress,
        userAgent,
        metadata: { email, reason: 'invalid_credentials', failedAttempts: updatedAttempts, remainingAttempts },
      });

      if (lockedUntilValue) {
        const lockedDate = new Date(lockedUntilValue);
        await logSecurityEvent({
          userId: userRecord.id,
          eventType: 'auth.login.locked',
          ipAddress,
          userAgent,
          metadata: { lockedUntil: lockedDate },
        });

        await sendAccountLockedEmail(userRecord.email, lockedDate);

        return res.status(423).json({
          message: 'Account locked after too many attempts. Check your email for steps to unlock.',
          lockExpiresAt: lockedDate.toISOString(),
          remainingAttempts: 0,
        });
      }

      return res.status(401).json({
        message: 'Invalid email or password',
        remainingAttempts,
      });
    }

    const sanitizedAgent = userAgent ?? null;
    const { rows: updatedRows } = await pool.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           locked_until = NULL,
           last_login_at = NOW(),
           last_login_ip = $1,
           last_login_user_agent = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, email_verified, phone_verified, age_verified, tos_accepted_at, subscription_tier,
                 failed_login_attempts, locked_until, last_login_at, last_login_ip, last_login_user_agent,
                 created_at, updated_at`,
      [ipAddress, sanitizedAgent, userRecord.id]
    );

    const updatedUser = updatedRows[0] as UserRow;
    const deviceChanged =
      Boolean(previousIp && previousIp !== ipAddress) ||
      Boolean(previousUserAgent && previousUserAgent !== userAgent);

    if (deviceChanged) {
      await logSecurityEvent({
        userId: userRecord.id,
        eventType: 'auth.login.new_device',
        ipAddress,
        userAgent,
        metadata: {
          previousIp,
          previousUserAgent,
        },
      });

      await sendNewDeviceAlertEmail(userRecord.email, {
        ipAddress,
        userAgent,
        timestamp: new Date(),
      });
    }

    const { accessToken, sessionId, refreshTokenExpiresAt } = await createSession(userRecord.id, req, res);

    const verified = isFullyVerified(updatedUser);

    logger.info('User logged in', { userId: userRecord.id, verified });

    await logSecurityEvent({
      userId: userRecord.id,
      eventType: 'auth.login.success',
      ipAddress,
      userAgent,
      metadata: { sessionId, verified },
    });

    res.json({
      message: verified ? 'Login successful' : 'Please complete verification steps',
      token: accessToken,
      isFullyVerified: verified,
      expiresIn: config.auth.accessTokenTtl,
      sessionId,
      refreshTokenExpiresAt,
      user: mapUserRowToResponse(updatedUser),
    });
  } catch (error: any) {
    logger.error('Login error', { error: error.message });
    await logSecurityEvent({
      eventType: 'auth.login.error',
      ipAddress,
      userAgent,
      metadata: { email, reason: error.message },
    });
    res.status(500).json({ message: 'Login failed' });
  }
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, email, email_verified, phone_verified, age_verified, tos_accepted_at, subscription_tier,
              failed_login_attempts, locked_until, last_login_at, last_login_ip, last_login_user_agent,
              created_at, updated_at
       FROM users
       WHERE id = $1`,
      [req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userRow = rows[0] as UserRow;

    res.json({
      user: mapUserRowToResponse(userRow),
      isFullyVerified: isFullyVerified(userRow),
    });
  } catch (error: any) {
    logger.error('Failed to load current user', { error: error.message, userId: req.userId });
    res.status(500).json({ message: 'Unable to load user profile' });
  }
});

authRouter.get('/security-events', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const requestedLimit = parseInt((req.query.limit as string) ?? '', 10);
  let limit = Number.isFinite(requestedLimit) ? requestedLimit : SECURITY_EVENTS_DEFAULT_LIMIT;
  limit = Math.max(1, Math.min(limit, SECURITY_EVENTS_MAX_LIMIT));

  let before: Date | undefined;
  if (req.query.before) {
    const beforeCandidate = new Date(req.query.before as string);
    if (!Number.isNaN(beforeCandidate.getTime())) {
      before = beforeCandidate;
    }
  }

  const events = await getSecurityEventsForUser(req.userId, limit, before);
  const nextCursor = events.length === limit ? events[events.length - 1].createdAt.toISOString() : null;

  res.json({
    events: events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
      metadata: event.metadata ?? null,
      createdAt: event.createdAt,
    })),
    paging: {
      limit,
      nextCursor,
    },
  });
});

authRouter.post('/refresh', refreshLimiter, async (req: Request, res: Response) => {
  const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);

  if (!refreshToken) {
    clearRefreshTokenCookie(res);
    await logSecurityEvent({
      eventType: 'auth.refresh.failure',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
      metadata: { reason: 'missing_cookie' },
    });
    return res.status(401).json({ message: 'Refresh token missing' });
  }

  const refreshHash = hashRefreshToken(refreshToken);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sessionResult = await client.query(
      `SELECT id, user_id, revoked, expires_at FROM refresh_tokens
       WHERE token_hash = $1 FOR UPDATE`,
      [refreshHash]
    );

    if (sessionResult.rows.length === 0) {
      await client.query('COMMIT');
      clearRefreshTokenCookie(res);
      await logSecurityEvent({
        eventType: 'auth.refresh.failure',
        ipAddress: getClientIp(req),
        userAgent: sanitizeUserAgent(req.headers['user-agent']),
        metadata: { reason: 'session_not_found' },
      });
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const session = sessionResult.rows[0];

    if (session.revoked || new Date(session.expires_at) < new Date()) {
      await client.query('UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE id = $1', [session.id]);
      await client.query('COMMIT');
      clearRefreshTokenCookie(res);
      await logSecurityEvent({
        userId: session.user_id,
        eventType: 'auth.refresh.failure',
        ipAddress: getClientIp(req),
        userAgent: sanitizeUserAgent(req.headers['user-agent']),
        metadata: { reason: 'session_expired', sessionId: session.id },
      });
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [session.user_id]);
    if (userResult.rows.length === 0) {
      await client.query('UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE id = $1', [session.id]);
      await client.query('COMMIT');
      clearRefreshTokenCookie(res);
      await logSecurityEvent({
        userId: session.user_id,
        eventType: 'auth.refresh.failure',
        ipAddress: getClientIp(req),
        userAgent: sanitizeUserAgent(req.headers['user-agent']),
        metadata: { reason: 'user_not_found', sessionId: session.id },
      });
      return res.status(401).json({ message: 'User no longer exists' });
    }

    const refreshedUser = scrubUserSecrets(userResult.rows[0] as UserWithSecretsRow);

    await client.query('UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE id = $1', [session.id]);

    const newRefreshToken = generateRefreshToken();
    const newRefreshHash = hashRefreshToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + config.auth.refreshTokenTtlMs);

    const insertResult = await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        session.user_id,
        newRefreshHash,
        sanitizeUserAgent(req.headers['user-agent']) ?? null,
        getClientIp(req),
        expiresAt,
      ]
    );

    await client.query('COMMIT');

    setRefreshTokenCookie(res, newRefreshToken);
  const newSessionId = insertResult.rows[0].id;
  const accessToken = signAccessToken(session.user_id, newSessionId);
  const verified = isFullyVerified(refreshedUser);

    await logSecurityEvent({
      userId: session.user_id,
      eventType: 'auth.refresh.success',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
      metadata: { previousSessionId: session.id, newSessionId, refreshExpiresAt: expiresAt },
    });

    res.json({
      message: 'Token refreshed',
      token: accessToken,
      isFullyVerified: verified,
      expiresIn: config.auth.accessTokenTtl,
      sessionId: newSessionId,
      refreshTokenExpiresAt: expiresAt,
      user: mapUserRowToResponse(refreshedUser),
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Refresh token error', { error: error.message });
    await logSecurityEvent({
      userId: undefined,
      eventType: 'auth.refresh.error',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
      metadata: { reason: error.message },
    });
    res.status(500).json({ message: 'Could not refresh token' });
  } finally {
    client.release();
  }
});

authRouter.post('/logout', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.sessionId) {
      await pool.query('UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE id = $1', [req.sessionId]);
    }

    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
    if (refreshToken) {
      await pool.query(
        'UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE token_hash = $1',
        [hashRefreshToken(refreshToken)]
      );
    }
  } catch (error: any) {
    logger.error('Logout error', { error: error.message, userId: req.userId });
  } finally {
    clearRefreshTokenCookie(res);
  }

  logger.info('User logged out', { userId: req.userId });
  await logSecurityEvent({
    userId: req.userId,
    eventType: 'auth.logout',
    ipAddress: getClientIp(req),
    userAgent: sanitizeUserAgent(req.headers['user-agent']),
    metadata: { sessionId: req.sessionId },
  });
  res.json({ message: 'Logged out successfully' });
});

authRouter.post('/logout-all', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    await pool.query('UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE user_id = $1', [req.userId]);
  } catch (error: any) {
    logger.error('Logout all sessions error', { error: error.message, userId: req.userId });
    return res.status(500).json({ message: 'Failed to revoke sessions' });
  }

  clearRefreshTokenCookie(res);
  logger.info('All sessions revoked', { userId: req.userId });
  await logSecurityEvent({
    userId: req.userId,
    eventType: 'auth.logout.all',
    ipAddress: getClientIp(req),
    userAgent: sanitizeUserAgent(req.headers['user-agent']),
  });
  res.json({ message: 'All sessions revoked' });
});

authRouter.get('/sessions', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, created_at, expires_at, revoked, revoked_at, user_agent, ip_address
       FROM refresh_tokens
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );

    const sessions = rows.map((row: SessionRow) => ({
      sessionId: row.id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      revoked: row.revoked,
      revokedAt: row.revoked_at,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      current: req.sessionId === row.id,
    }));

    await logSecurityEvent({
      userId: req.userId,
      eventType: 'auth.session.list',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
      metadata: { count: sessions.length },
    });

    res.json({ sessions });
  } catch (error: any) {
    logger.error('List sessions error', { error: error.message, userId: req.userId });
    res.status(500).json({ message: 'Failed to retrieve sessions' });
  }
});

authRouter.delete('/sessions/:sessionId', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { sessionId } = req.params as { sessionId?: string };

  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is required' });
  }

  try {
    const result = await pool.query(
      `UPDATE refresh_tokens
       SET revoked = true, revoked_at = NOW()
       WHERE id = $1 AND user_id = $2 AND revoked = false
       RETURNING id`,
      [sessionId, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Session not found or already revoked' });
    }

    if (req.sessionId === sessionId) {
      clearRefreshTokenCookie(res);
    }

    await logSecurityEvent({
      userId: req.userId,
      eventType: 'auth.session.revoked',
      ipAddress: getClientIp(req),
      userAgent: sanitizeUserAgent(req.headers['user-agent']),
      metadata: { sessionId },
    });

    res.json({ message: 'Session revoked' });
  } catch (error: any) {
    logger.error('Revoke session error', { error: error.message, userId: req.userId });
    res.status(500).json({ message: 'Failed to revoke session' });
  }
});

export default authRouter;