import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { LoginRequest, RegisterRequest } from '../models';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const loginData: LoginRequest = req.body;
      
      if (!loginData.email || !loginData.password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const result = await this.authService.login(loginData);
      
      res.status(200).json({
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registerData: RegisterRequest = req.body;
      
      if (!registerData.name || !registerData.email || !registerData.password) {
        res.status(400).json({ error: 'Name, email, and password are required' });
        return;
      }

      const result = await this.authService.register(registerData);
      
      res.status(201).json({
        message: 'Registration successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // The user ID comes from the JWT token (set by auth middleware)
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await this.authService.getUserById(userId);
      
      res.status(200).json({
        message: 'Profile retrieved successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      
      if (!email) {
        res.status(400).json({ error: 'Email é obrigatório' });
        return;
      }

      const result = await this.authService.forgotPassword(email);
      
      res.status(200).json({
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
        return;
      }

      const result = await this.authService.resetPassword(token, newPassword);
      
      res.status(200).json({
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // The user ID and email come from the JWT token (set by auth middleware)
      const userId = (req as any).user?.userId;
      const email = (req as any).user?.email;
      
      if (!userId || !email) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const result = await this.authService.verifyToken(userId, email);
      
      res.status(200).json({
        message: 'Token verification successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}