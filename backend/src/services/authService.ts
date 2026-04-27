import { UserRepository } from '../repositories/userRepository';
import { generateToken } from '../utils/jwt';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models';
import { createError } from '../middlewares/errorHandler';
import { supabase } from '../config/database';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async login(loginData: LoginRequest): Promise<AuthResponse> {
    const { email, password } = loginData;

    try {
      // Use Supabase Auth to sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        throw createError('Invalid credentials', 401);
      }

      // Get user data in our format
      const user = {
        id: authData.user.id,
        name: authData.user.user_metadata?.name || '',
        email: authData.user.email || '',
        password: '', // Don't return password
        created_at: new Date(authData.user.created_at),
        updated_at: new Date(authData.user.updated_at || authData.user.created_at)
      };

      // Generate token
      const token = generateToken(user);

      return {
        user,
        token
      };
    } catch (error: any) {
      console.error('Login failed for email:', email);
      if (error.status) throw error; // Re-throw if it's already a formatted error
      throw createError('Invalid credentials', 401);
    }
  }

  async register(registerData: RegisterRequest): Promise<AuthResponse> {
    const { name, email, password } = registerData;

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw createError('User already exists with this email', 409);
    }

    // Validate password strength
    if (password.length < 10) {
      throw createError('Password must be at least 10 characters long', 400);
    }
    if (!/[A-Z]/.test(password)) {
      throw createError('Password must contain at least one uppercase letter', 400);
    }
    if (!/[0-9]/.test(password)) {
      throw createError('Password must contain at least one number', 400);
    }

    // Create user
    const user = await this.userRepository.create({
      name,
      email,
      password,
    });

    // Generate token
    const token = generateToken(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async getUserById(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw createError('User not found', 404);
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      // Use Supabase Auth to send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://financeapp-areluna.vercel.app/reset-password', // Production frontend URL for password reset
      });

      if (error) {
        console.error('Password reset email failed');
        throw createError('Erro ao enviar email de recuperação', 400);
      }

      return {
        message: 'Email de recuperação enviado com sucesso'
      };
    } catch (error) {
      console.error('Forgot password error');
      throw error;
    }
  }

  async resetPassword(_token: string, newPassword: string): Promise<{ message: string }> {
    try {
      // Use Supabase Auth to update password with token
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password reset failed');
        throw createError('Token inválido ou expirado', 400);
      }

      return {
        message: 'Senha alterada com sucesso'
      };
    } catch (error) {
      console.error('Reset password error');
      throw error;
    }
  }

  async verifyToken(userId: string, email: string): Promise<{ valid: boolean; user: Omit<User, 'password'> | null }> {
    try {
      // Try to get user from database
      const user = await this.userRepository.findById(userId);

      if (!user) {
        return { valid: false, user: null };
      }

      // Verify email matches
      if (user.email !== email) {
        return { valid: false, user: null };
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      return { valid: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Token verification error');
      return { valid: false, user: null };
    }
  }
}