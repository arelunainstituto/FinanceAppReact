import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();
const dashboardController = new DashboardController();

// All dashboard routes require authentication
router.use(authenticateToken);

// GET /api/dashboard/stats - Obter estatísticas do dashboard
router.get('/stats', dashboardController.getStats);

export default router;