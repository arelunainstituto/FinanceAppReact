import jwt from 'jsonwebtoken';
import { User } from '../models';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Fail-fast: reject weak/missing JWT secrets at startup
if (!JWT_SECRET || JWT_SECRET.length < 32 || /your[-_]?secret|change[-_]?this/i.test(JWT_SECRET)) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable must be set to a strong, unique value (min 32 chars). ' +
    'Generate one with: openssl rand -base64 64'
  );
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export const generateToken = (user: Omit<User, 'password'>): string => {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  return token;
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error: any) {
    throw new Error('Invalid token');
  }
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch (error) {
    return null;
  }
};