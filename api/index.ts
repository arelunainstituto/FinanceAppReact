import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from '../backend/src/middlewares/logger';
import { errorHandler, notFound } from '../backend/src/middlewares/errorHandler';

// Import routes directly
import authRoutes from '../backend/src/routes/authRoutes';
import clientRoutes from '../backend/src/routes/clientRoutes';
import contractRoutes from '../backend/src/routes/contractRoutes';
import paymentRoutes from '../backend/src/routes/paymentRoutes';
import dashboardRoutes from '../backend/src/routes/dashboardRoutes';
import aiAnalystRoutes from '../backend/src/routes/aiAnalystRoutes';

// Load environment variables
dotenv.config();


const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Simple and reliable (like 3 days ago, but with both domains)
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [
  'https://financeiro.institutoareluna.pt',      // Produção (domínio customizado)
  'https://financeapp-areluna.vercel.app',       // Vercel produção
  'https://financeapp-lime.vercel.app'           // Vercel preview
];

// Add dynamic Vercel preview URLs
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, server-to-server, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Allow if in the list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow any Vercel preview URL from our project
    if (origin.match(/^https:\/\/financeapp-(areluna|lime).*\.vercel\.app$/)) {
      return callback(null, true);
    }

    // Reject others
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

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
app.use('/api/ai-analyst', aiAnalystRoutes);

// Health check route
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    message: 'ERP Payment Management API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
  });
});

// Warming endpoint to prevent cold starts
// Call this endpoint every 5-10 minutes to keep the function warm
app.get('/api/warm', (_req, res) => {
  res.status(200).json({
    status: 'warm',
    timestamp: new Date().toISOString()
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
      '/api/dashboard/stats',
      '/api/ai-analyst/chat',
      '/api/ai-analyst/test'
    ]
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Export the Express app for Vercel
export default app;