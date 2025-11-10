import crypto from 'crypto';
import config from '../config';

export const hashRefreshToken = (token: string): string => {
  return crypto
    .createHash('sha256')
    .update(`${config.auth.refreshTokenPepper}:${token}`)
    .digest('hex');
};

export const hashVerificationCode = (code: string): string => {
  return crypto
    .createHash('sha256')
    .update(`${config.verification.codePepper}:${code}`)
    .digest('hex');
};

export const hashPhoneValue = (value: string): string => {
  return crypto
    .createHash('sha256')
    .update(`${value}:${config.verification.phoneSalt}`)
    .digest('hex');
};
