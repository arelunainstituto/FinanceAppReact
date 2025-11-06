import express from 'express';
import { aiAnalystController } from '../controllers/aiAnalystController';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();

// Test connection endpoint
router.get('/test', authenticateToken, aiAnalystController.testConnection);

// Chat endpoint
router.post('/chat', authenticateToken, aiAnalystController.sendMessage);

export default router;
