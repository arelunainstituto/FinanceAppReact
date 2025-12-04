import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('🔐 [Auth Middleware] Authenticating request to:', req.path);
  console.log('🔐 [Auth Middleware] Auth header present:', !!authHeader);
  console.log('🔐 [Auth Middleware] Token present:', !!token);

  if (!token) {
    console.log('❌ [Auth Middleware] No token provided');
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    console.log('🔐 [Auth Middleware] Token length:', token.length);
    console.log('🔐 [Auth Middleware] Token preview:', token.substring(0, 50) + '...');

    const decoded = verifyToken(token);
    console.log('✅ [Auth Middleware] Token verified successfully');
    console.log('🔐 [Auth Middleware] User ID:', decoded.userId);
    console.log('🔐 [Auth Middleware] Email:', decoded.email);

    req.user = decoded;
    next();
  } catch (error: any) {
    console.error('❌ [Auth Middleware] Token verification failed');
    console.error('❌ [Auth Middleware] Error:', error.message);
    console.error('❌ [Auth Middleware] Error name:', error.name);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};