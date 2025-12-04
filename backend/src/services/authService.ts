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
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Email:', email);
      console.log('Password length:', password.length);
      console.log('Supabase URL:', process.env.SUPABASE_URL);
      console.log('Has Service Role Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      
      // Use Supabase Auth to sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('Auth data:', JSON.stringify(authData, null, 2));
      console.log('Auth error:', JSON.stringify(authError, null, 2));

      if (authError || !authData.user) {
        console.log('Authentication failed - throwing error');
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
      console.error('Login error:', error);
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
    if (password.length < 6) {
      throw createError('Password must be at least 6 characters long', 400);
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
      console.log('=== FORGOT PASSWORD ATTEMPT ===');
      console.log('Email:', email);
      
      // Use Supabase Auth to send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://financeapp-areluna.vercel.app/reset-password', // Production frontend URL for password reset
      });

      if (error) {
        console.log('Password reset error:', error);
        throw createError('Erro ao enviar email de recuperação', 400);
      }

      console.log('Password reset email sent successfully');
      
      return {
        message: 'Email de recuperação enviado com sucesso'
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      console.log('=== RESET PASSWORD ATTEMPT ===');
      console.log('Token length:', token.length);
      console.log('New password length:', newPassword.length);
      
      // Use Supabase Auth to update password with token
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.log('Password reset error:', error);
        throw createError('Token inválido ou expirado', 400);
      }

      console.log('Password reset successful');
      
      return {
        message: 'Senha alterada com sucesso'
      };
    } catch (error) {
      console.error('Reset password error:', error);
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
      console.error('Token verification error:', error);
      return { valid: false, user: null };
    }
  }
}