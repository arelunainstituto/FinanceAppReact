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
            const response = await ApiService.verifyToken();

            if (response.data?.valid && response.data?.user) {
              setUser(parsedUserData);
            } else {
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_data');
              setUser(null);
            }
          } catch (verifyError: any) {
            // If it's an auth error (401/403), the ApiService already cleared storage
            // Just need to clear user state
            if (verifyError.isAuthError) {
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
      console.error('Error checking auth state');
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
      setUser(null);
    });

    // Check auth state every 5 minutes if user is logged in (backup mechanism)
    const interval = setInterval(async () => {
      if (user) {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) {
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
      
      // Verificar se a resposta contém dados válidos
      if (response.data && response.data.user && response.data.token) {
        const { user: userData, token } = response.data;
        
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
        
        setUser(userData);
      } else {
        throw new Error('Login failed: Invalid response format');
      }
    } catch (error) {
      console.error('Login error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      setUser(null);
    } catch (error) {
      console.error('Logout error');
    }
  }, []);

  // Handle authentication errors from API calls
  const handleAuthError = useCallback(async () => {
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