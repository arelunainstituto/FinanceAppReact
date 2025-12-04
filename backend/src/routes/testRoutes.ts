import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// TESTE: Endpoint que sempre retorna 401 para simular token expirado
router.get('/simulate-expired-token', authenticateToken, (_req: Request, res: Response) => {
  console.log('🧪 Simulando token expirado - retornando 401');
  res.status(401).json({
    error: 'Invalid or expired token',
    simulated: true
  });
});

export default router;
