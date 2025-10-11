import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from '../src/middlewares/logger';
import { errorHandler, notFound } from '../src/middlewares/errorHandler';

// Import routes directly
import authRoutes from '../src/routes/authRoutes';
import clientRoutes from '../src/routes/clientRoutes';
import contractRoutes from '../src/routes/contractRoutes';
import paymentRoutes from '../src/routes/paymentRoutes';
import dashboardRoutes from '../src/routes/dashboardRoutes';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Updated for Vercel deployment
app.use(cors({
  origin: [
    'http://localhost:8081',
    'http://localhost:3000',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:3000',
    'https://*.vercel.app',
    'https://financeapp-3a43krgly-areluna.vercel.app',
    process.env.FRONTEND_URL || 'https://your-frontend-domain.vercel.app'
  ],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(logger);

// API routes - Direct registration
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check route
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    message: 'ERP Payment Management API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
  });
});

// Root route
app.get('/', (_req, res) => {
  res.json({
    message: 'ERP Payment Management API',
    version: '1.0.0',
    documentation: '/api/health',
    availableEndpoints: [
      '/api/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/clients',
      '/api/contracts',
      '/api/payments',
      '/api/dashboard/stats'
    ]
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Export the Express app for Vercel
export default app;