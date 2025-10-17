import { supabase } from '../config/database';
import { User } from '../models';
import bcrypt from 'bcryptjs';
import { User as SupabaseUser } from '@supabase/supabase-js';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    try {
      // Use Supabase Auth to get user by email
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      
      if (error) throw error;
      
      const user = users.find((u: SupabaseUser) => u.email === email);
      
      if (!user) return null;
      
      return {
        id: user.id,
        name: user.user_metadata?.name || '',
        email: user.email || '',
        password: '', // Don't return password
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at || user.created_at)
      };
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw new Error('Failed to fetch user by email');
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.admin.getUserById(id);
      
      if (error) throw error;
      if (!user) return null;
      
      return {
        id: user.id,
        name: user.user_metadata?.name || '',
        email: user.email || '',
        password: '', // Don't return password
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at || user.created_at)
      };
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw new Error('Failed to fetch user by ID');
    }
  }

  async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    try {
      // Use Supabase Auth to create user with email confirmation disabled
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          name: userData.name
        },
        email_confirm: true // Auto-confirm email
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('Failed to create user - no user data returned');
      }

      // Return user data in our format
      return {
        id: authData.user.id,
        name: userData.name,
        email: userData.email,
        password: '', // Don't return password
        created_at: new Date(authData.user.created_at || new Date().toISOString()),
        updated_at: new Date(authData.user.updated_at || new Date().toISOString())
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error; // Re-throw the original error instead of generic message
    }
  }

  async update(id: string, userData: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): Promise<User | null> {
    try {
      const updateData = { ...userData };
      
      // Hash password if it's being updated
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    try {
      // Since we're using Supabase Auth, we need to validate using Supabase's signIn
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      });
      
      return !error;
    } catch (error) {
      console.error('Error validating password:', error);
      return false;
    }
  }

  async emailExists(email: string): Promise<boolean> {
    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      
      if (error) throw error;
      
      return users.some((u: SupabaseUser) => u.email === email);
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }
}