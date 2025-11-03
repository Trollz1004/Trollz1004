import crypto from 'crypto';
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import config from '../config';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  sessionId: string;
}

export const signAccessToken = (userId: string, sessionId: string): string => {
  const privateKey = config.auth.privateKey as Secret;
  const options: SignOptions = {
    algorithm: 'RS256',
    expiresIn: config.auth.accessTokenTtl as SignOptions['expiresIn'],
  };

  return jwt.sign(
    {
      sub: userId,
      sessionId,
    },
    privateKey,
    options
  );
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const publicKey = config.auth.publicKey as Secret;
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
  }) as AccessTokenPayload;
};

export const generateRefreshToken = (): string => {
  return crypto
    .randomBytes(64)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};
