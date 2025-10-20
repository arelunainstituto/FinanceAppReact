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

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - production and preview
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [
      'https://financeapp-areluna.vercel.app',
      'https://financeapp-lime.vercel.app'
    ];
    
    // Log para debug
    console.log('🌐 CORS Request from origin:', origin);
    
    // Aceita requisições sem origin (ex: Postman, mobile apps, servidor para servidor)
    if (!origin) {
      console.log('✅ CORS: Allowing request without origin');
      callback(null, true);
      return;
    }
    
    // Verifica se está na lista de origens permitidas
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Allowed origin from list');
      callback(null, true);
      return;
    }
    
    // Validação para URLs de preview do Vercel com regex seguro
    const vercelPreviewPatterns = [
      /^https:\/\/financeapp-areluna(-[a-z0-9]+)?\.vercel\.app$/,
      /^https:\/\/financeapp-lime(-[a-z0-9]+)?\.vercel\.app$/,
      /^https:\/\/financeapp-areluna-git-[a-z0-9-]+\.vercel\.app$/,
      /^https:\/\/financeapp-lime-git-[a-z0-9-]+\.vercel\.app$/
    ];
    
    const isValidVercelPreview = vercelPreviewPatterns.some(pattern => pattern.test(origin));
    
    if (isValidVercelPreview) {
      console.log('✅ CORS: Allowed Vercel preview URL (validated)');
      callback(null, true);
      return;
    }
    
    // Rejeita outras origens
    console.log('❌ CORS: Origin not allowed -', origin);
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