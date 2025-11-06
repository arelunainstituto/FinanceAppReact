import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

interface MainLayoutProps {
  children: React.ReactNode;
  activeRoute: string;
}

const SIDEBAR_WIDTH = 280; // Fixed sidebar width from Sidebar.tsx

const MainLayout: React.FC<MainLayoutProps> = ({ children, activeRoute }) => {
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const navigation = useNavigation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      navigation.getParent()?.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    }
  }, [isLoading, user, navigation]);

  const handleGoToLogin = useCallback(() => {
    navigation.getParent()?.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  }, [navigation]);

  if (isLoading) {
    return (
      <View style={styles.fullscreenContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.fullscreenText}>Verificando sessão...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.fullscreenContainer}>
        <Text style={styles.unauthorizedTitle}>Sessão necessária</Text>
        <Text style={styles.unauthorizedSubtitle}>
          Faça login para visualizar este conteúdo.
        </Text>
        <TouchableOpacity style={styles.loginButton} onPress={handleGoToLogin}>
          <Text style={styles.loginButtonText}>Ir para o login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const contentWidth = screenWidth - SIDEBAR_WIDTH;

  return (
    <View style={styles.container}>
      {/* Sidebar - Posicionamento absoluto para independência total */}
      <View style={styles.sidebarContainer}>
        <Sidebar activeRoute={activeRoute} />
      </View>
      
      {/* Main Content - Posicionamento absoluto independente do sidebar */}
      <View style={[styles.content, { width: contentWidth, left: SIDEBAR_WIDTH }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    position: 'relative', // Container relativo para posicionamento absoluto dos filhos
  },
  sidebarContainer: {
    position: 'absolute', // Posicionamento absoluto para independência
    top: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    height: '100%',
    zIndex: 10, // Z-index para garantir que fique acima do conteúdo se necessário
    backgroundColor: '#1E293B', // Cor de fundo para evitar transparência
  },
  content: {
    position: 'absolute', // Posicionamento absoluto para independência
    top: 0,
    height: '100%',
    backgroundColor: '#F8F9FA',
    overflow: 'scroll', // Enable scroll for main content
  },
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 24,
  },
  fullscreenText: {
    marginTop: 16,
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  unauthorizedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  unauthorizedSubtitle: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default MainLayout;