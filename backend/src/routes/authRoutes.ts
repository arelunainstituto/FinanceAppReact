import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes (require authentication)
router.post('/register', authenticateToken, authController.register);
router.get('/profile', authenticateToken, authController.getProfile);
router.get('/verify', authenticateToken, authController.verifyToken);

export default router;