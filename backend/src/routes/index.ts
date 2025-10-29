import { Router } from 'express';
import authRoutes from './authRoutes';
import clientRoutes from './clientRoutes';
import contractRoutes from './contractRoutes';
import paymentRoutes from './paymentRoutes';
import dashboardRoutes from './dashboardRoutes';
import aiAnalystRoutes from './aiAnalystRoutes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/contracts', contractRoutes);
router.use('/payments', paymentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ai-analyst', aiAnalystRoutes);

// Health check route
router.get('/health', (_req, res) => {
  res.status(200).json({
    message: 'ERP Payment Management API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;