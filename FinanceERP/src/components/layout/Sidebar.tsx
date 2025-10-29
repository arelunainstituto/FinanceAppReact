import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  activeRoute: string;
}

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  section?: string;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', title: 'Dashboard', icon: 'analytics-outline', route: 'Dashboard', section: 'principal' },
  { id: 'clients', title: 'Clientes', icon: 'people-outline', route: 'Clients', section: 'gestao' },
  { id: 'contracts', title: 'Contratos', icon: 'document-text-outline', route: 'Contracts', section: 'gestao' },
  { id: 'payments', title: 'Pagamentos', icon: 'card-outline', route: 'Payments', section: 'gestao' },
  { id: 'ai-analyst', title: 'AI Analyst', icon: 'chatbubbles-outline', route: 'AIAnalyst', section: 'ferramentas' },
];

const sectionTitles = {
  principal: 'Principal',
  gestao: 'Gestão',
  ferramentas: 'Ferramentas',
  configuracoes: 'Configurações'
};

const Sidebar: React.FC<SidebarProps> = React.memo(({ activeRoute }) => {
  const navigation = useNavigation();
  const { logout, user, isLoading } = useAuth();

  const handleMenuPress = useCallback((route: string) => {
    navigation.navigate(route as never);
  }, [navigation]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const renderMenuSection = useCallback((sectionKey: string) => {
    const sectionItems = menuItems.filter(item => item.section === sectionKey);
    if (sectionItems.length === 0) return null;

    return (
      <View key={sectionKey} style={styles.menuSection}>
        <Text style={styles.sectionTitle}>{sectionTitles[sectionKey as keyof typeof sectionTitles]}</Text>
        {sectionItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              activeRoute === item.route && styles.activeMenuItem,
            ]}
            onPress={() => handleMenuPress(item.route)}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons
                name={item.icon}
                size={22}
                color={activeRoute === item.route ? '#FFFFFF' : '#6B7280'}
                style={styles.menuIcon}
              />
            </View>
            <Text
              style={[
                styles.menuText,
                activeRoute === item.route && styles.activeMenuText,
              ]}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [activeRoute, handleMenuPress]);

  return (
    <View style={styles.sidebar}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="business-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.logoTextContainer}>
            <Text style={styles.logoText}>FinanceERP</Text>
            <Text style={styles.logoSubtext}>Sistema de Gestão</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
        {renderMenuSection('principal')}
        {renderMenuSection('gestao')}
        {renderMenuSection('ferramentas')}
        {renderMenuSection('configuracoes')}
      </ScrollView>

      {/* User Info & Logout */}
      {!isLoading && (
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name || 'Usuário'}</Text>
              <Text style={styles.userRole}>Administrador</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={19} color="#EF4444" />
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    backgroundColor: '#FFFFFF',
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 4,
      height: 0,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFBFC',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  logoTextContainer: {
    flex: 1,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 3,
  },
  logoSubtext: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  menu: {
    flex: 1,
    paddingTop: 16,
  },
  menuSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 3,
  },
  activeMenuItem: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#4DA3FF',
  },
  menuIconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuIcon: {
    // Ícone já estilizado via props
  },
  menuText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 0.2,
    flex: 1,
  },
  activeMenuText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  userSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFBFC',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#B3D9FF',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
    marginBottom: 3,
  },
  userRole: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  logoutText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
});

export default Sidebar;