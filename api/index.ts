import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Health check endpoint
  if (req.url === '/api/health' || req.url === '/health') {
    res.status(200).json({
      message: 'ERP Payment Management API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: 'production'
    });
    return;
  }

  // Auth login endpoint
  if (req.url === '/api/auth/login' && req.method === 'POST') {
    try {
      const { email, password } = req.body;

      // Basic validation
      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
        return;
      }

      // Mock authentication (replace with real authentication logic)
      if (email === 'admin@institutoareluna.pt' && password === 'admin123') {
        const mockUser = {
          id: '1',
          email: 'admin@institutoareluna.pt',
          name: 'Administrator',
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const mockToken = 'mock-jwt-token-' + Date.now();

        res.status(200).json({
          success: true,
          data: {
            user: mockUser,
            token: mockToken
          },
          message: 'Login successful'
        });
        return;
      } else {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
      return;
    }
  }

  // Root endpoint
  if (req.url === '/' || req.url === '/api') {
    res.status(200).json({
      message: 'ERP Payment Management API',
      version: '1.0.0',
      documentation: '/api/health',
      status: 'online',
      endpoints: ['/api/health', '/api/auth/login']
    });
    return;
  }

  // Default 404 response
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint was not found',
    availableEndpoints: ['/api/health', '/api/auth/login']
  });
}