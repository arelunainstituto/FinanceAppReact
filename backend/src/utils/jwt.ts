import jwt from 'jsonwebtoken';
import { User } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Debug log
console.log('🔐 [JWT CONFIG] JWT_EXPIRES_IN from env:', process.env.JWT_EXPIRES_IN);
console.log('🔐 [JWT CONFIG] JWT_EXPIRES_IN final value:', JWT_EXPIRES_IN);

export interface JwtPayload {
  userId: string;
  email: string;
}

export const generateToken = (user: Omit<User, 'password'>): string => {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
  };

  console.log('🔐 [JWT] Generating token for user:', user.id, user.email);
  console.log('🔐 [JWT] Token will expire in:', JWT_EXPIRES_IN);

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  console.log('✅ [JWT] Token generated successfully');
  console.log('🔐 [JWT] Token length:', token.length);

  return token;
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    console.log('🔐 [JWT] Verifying token...');
    console.log('🔐 [JWT] Using JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');
    console.log('🔐 [JWT] Token expires in config:', JWT_EXPIRES_IN);

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    console.log('✅ [JWT] Token verified successfully');
    console.log('🔐 [JWT] User ID:', decoded.userId);
    console.log('🔐 [JWT] Email:', decoded.email);

    return decoded;
  } catch (error: any) {
    console.error('❌ [JWT] Token verification failed:', error.message);
    console.error('❌ [JWT] Error name:', error.name);
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