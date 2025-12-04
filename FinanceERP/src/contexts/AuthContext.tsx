import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContextType, User } from '../types';
import ApiService from '../services/api';
import { authErrorEvent } from '../utils/authEvents';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');

      if (token && userData) {
        const parsedUserData = JSON.parse(userData);

        // Validate that the user data is complete
        if (parsedUserData && parsedUserData.id && parsedUserData.email) {
          try {
            // Verify token with backend
            console.log('🔐 Verifying token with backend...');
            const response = await ApiService.verifyToken();

            if (response.data?.valid && response.data?.user) {
              console.log('✅ Token is valid, user authenticated');
              setUser(parsedUserData);
            } else {
              console.log('❌ Token verification failed, clearing auth data');
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_data');
              setUser(null);
            }
          } catch (verifyError: any) {
            console.error('❌ Token verification error:', verifyError);
            // If it's an auth error (401/403), the ApiService already cleared storage
            // Just need to clear user state
            if (verifyError.isAuthError) {
              console.log('🚨 Auth error detected in verification, logging out user');
              setUser(null);
            } else {
              // Clear potentially invalid data
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_data');
              setUser(null);
            }
          }
        } else {
          // Clear invalid data
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user_data');
          setUser(null);
        }
      } else {
        // No token or user data, ensure user is null
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Error checking auth state:', error);
      // Clear potentially corrupted data
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Monitor auth state and listen for auth errors
  useEffect(() => {
    checkAuthState();

    // Subscribe to auth error events for immediate logout
    const unsubscribe = authErrorEvent.subscribe(() => {
      console.log('🚨 Auth error event received - logging out immediately');
      setUser(null);
    });

    // Check auth state every 5 minutes if user is logged in (backup mechanism)
    const interval = setInterval(async () => {
      if (user) {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) {
          console.log('🚨 Token removed, logging out user');
          setUser(null);
        }
      }
    }, 300000); // Check every 5 minutes (300000ms)

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await ApiService.login(email, password);
      
      console.log('🔐 Login response:', response);
      
      // Verificar se a resposta contém dados válidos
      if (response.data && response.data.user && response.data.token) {
        const { user: userData, token } = response.data;
        
        console.log('🔐 Storing token:', token.substring(0, 50) + '...');
        console.log('🔐 Storing user data:', userData);
        
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
        
        // Verify storage
        const storedToken = await AsyncStorage.getItem('auth_token');
        const storedUserData = await AsyncStorage.getItem('user_data');
        console.log('🔐 Verification - Token stored:', !!storedToken);
        console.log('🔐 Verification - User data stored:', !!storedUserData);
        
        setUser(userData);
      } else {
        throw new Error('Login failed: Invalid response format');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('🚪 Logging out user');
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // Handle authentication errors from API calls
  const handleAuthError = useCallback(async () => {
    console.log('🚨 Handling authentication error - forcing logout');
    await logout();
  }, [logout]);

  const value: AuthContextType = useMemo(() => ({
    user,
    login,
    logout,
    isLoading,
    handleAuthError,
  }), [user, login, logout, isLoading, handleAuthError]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};