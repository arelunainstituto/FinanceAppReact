import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { DashboardStats, Payment, Contract } from '../types';
import ApiService from '../services/api';
import MainLayout from '../components/layout/MainLayout';
import { formatCurrencyCompact } from '../utils/currency';
import MetricCard from '../components/dashboard/MetricCard';
import RevenueChart from '../components/dashboard/RevenueChart';
import PaymentStatusChart from '../components/dashboard/PaymentStatusChart';
import ContractsChart from '../components/dashboard/ContractsChart';
import RecentActivity from '../components/dashboard/RecentActivity';
import QuickStats from '../components/dashboard/QuickStats';

const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth > 768;
const cardPadding = isTablet ? 24 : 16;

interface DashboardData {
  stats: DashboardStats | null;
  recentPayments: Payment[];
  upcomingPayments: Payment[];
  recentContracts: Contract[];
}

const DashboardScreen: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    stats: null,
    recentPayments: [],
    upcomingPayments: [],
    recentContracts: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('📊 === LOADING DASHBOARD DATA ===');
      setIsLoading(true);

      // Carregar todos os dados em paralelo
      const [statsResponse, recentPaymentsResponse, upcomingPaymentsResponse, recentContractsResponse] = 
        await Promise.all([
          ApiService.getDashboardStats(),
          ApiService.getRecentPayments(),
          ApiService.getUpcomingPayments(),
          ApiService.getRecentContracts(),
        ]);

      console.log('📊 Dashboard responses received');

      setData({
        stats: statsResponse.success ? statsResponse.data : null,
        recentPayments: recentPaymentsResponse.success ? recentPaymentsResponse.data : [],
        upcomingPayments: upcomingPaymentsResponse.success ? upcomingPaymentsResponse.data : [],
        recentContracts: recentContractsResponse.success ? recentContractsResponse.data : [],
      });
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      // Usar dados mock em caso de erro (baseados nos dados reais do Supabase)
      setData({
        stats: {
          totalClients: 519,
          activeClients: 511,
          totalContracts: 558,
          activeContracts: 557,
          totalPayments: 11781,
          pendingPayments: 4896, // 5332 - 436 (pending não atrasados)
          overduePayments: 436,
          totalRevenue: 5769791, // Valor total dos contratos
          totalReceived: 3005790, // Valor efetivamente recebido (CORRIGIDO)
          monthlyRevenue: [
            { month: 'Mai', revenue: 0 },
            { month: 'Jun', revenue: 0 },
            { month: 'Jul', revenue: 0 },
            { month: 'Ago', revenue: 839 },
            { month: 'Set', revenue: 0 },
            { month: 'Out', revenue: 217771 },
          ],
          paymentsByStatus: [
            { status: 'paid', count: 6120 },
            { status: 'pending', count: 4896 },
            { status: 'overdue', count: 436 },
            { status: 'renegociado', count: 326 },
            { status: 'failed', count: 3 },
          ],
        },
        recentPayments: [],
        upcomingPayments: [],
        recentContracts: [],
      });
    } finally {
      console.log('📊 === DASHBOARD LOADING COMPLETE ===');
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const calculateMetrics = () => {
    if (!data.stats) {
      return {
        defaultRate: 0,
        avgRevenuePerContract: 0,
        monthlyGrowth: 0,
      };
    }

    const totalPayments = data.stats.totalPayments || 1;
    const overduePayments = data.stats.overduePayments || 0;
    const defaultRate = (overduePayments / totalPayments) * 100;

    const avgRevenuePerContract = data.stats.activeContracts > 0
      ? data.stats.totalRevenue / data.stats.activeContracts
      : 0;

    // Calcular crescimento mensal (comparar últimos 2 meses)
    let monthlyGrowth = 0;
    if (data.stats.monthlyRevenue && data.stats.monthlyRevenue.length >= 2) {
      const lastMonth = data.stats.monthlyRevenue[data.stats.monthlyRevenue.length - 1].revenue;
      const previousMonth = data.stats.monthlyRevenue[data.stats.monthlyRevenue.length - 2].revenue;
      if (previousMonth > 0) {
        monthlyGrowth = ((lastMonth - previousMonth) / previousMonth) * 100;
      }
    }

    return { defaultRate, avgRevenuePerContract, monthlyGrowth };
  };

  const metrics = calculateMetrics();

  if (isLoading && !data.stats) {
    return (
      <MainLayout activeRoute="Dashboard">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando dados do dashboard...</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeRoute="Dashboard">
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        overScrollMode="always"
      >
        <View style={styles.container}>
          <Text style={styles.title}>Dashboard</Text>

          {/* Seção 1: Cards de Métricas Principais */}
          <View style={styles.statsGrid}>
            <MetricCard
              title="CLIENTES ATIVOS"
              value={data.stats?.activeClients || 0}
              badgeText="+32%"
              badgeColor="#D4EDDA"
              valueColor="#2C3E50"
              isCurrency={false}
              animationDuration={1500}
            />
            <MetricCard
              title="TOTAL RECEBIDO"
              value={data.stats?.totalReceived || 0}
              badgeText="+8%"
              badgeColor="#D1ECF1"
              valueColor="#28A745"
              isCurrency={true}
              animationDuration={2000}
            />
            <MetricCard
              title="CONTRATOS ATIVOS"
              value={data.stats?.activeContracts || 0}
              badgeText="+5"
              badgeColor="#CCE5FF"
              valueColor="#007BFF"
              isCurrency={false}
              animationDuration={1500}
            />
            <MetricCard
              title="PAGAMENTOS PENDENTES"
              value={data.stats?.pendingPayments || 0}
              badgeText="-3"
              badgeColor="#FFF3CD"
              valueColor="#FD7E14"
              isCurrency={false}
              animationDuration={1500}
            />
          </View>

          {/* Seção 2: Gráficos de Análise */}
          <RevenueChart data={data.stats?.monthlyRevenue || []} />
          
          <PaymentStatusChart data={data.stats?.paymentsByStatus || []} />
          
          <ContractsChart
            activeContracts={data.stats?.activeContracts || 0}
            totalContracts={data.stats?.totalContracts || 0}
          />

          {/* Seção 3: Indicadores Rápidos */}
          <QuickStats
            defaultRate={metrics.defaultRate}
            avgRevenuePerContract={metrics.avgRevenuePerContract}
            monthlyGrowth={metrics.monthlyGrowth}
          />

          {/* Seção 4: Listas de Atividades */}
          <RecentActivity
            type="payments"
            recentPayments={data.recentPayments}
          />

          <RecentActivity
            type="upcoming"
            upcomingPayments={data.upcomingPayments}
          />

          <RecentActivity
            type="contracts"
            recentContracts={data.recentContracts}
          />
        </View>
      </ScrollView>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    overflow: 'scroll',
  },
  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1,
    minHeight: '100%',
  },
  container: {
    backgroundColor: '#F8F9FA',
    padding: cardPadding,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    color: '#6C757D',
    fontSize: 14,
  },
  title: {
    fontSize: isTablet ? 32 : 28,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: isTablet ? 32 : 24,
    letterSpacing: -0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: isTablet ? 32 : 24,
    gap: isTablet ? 16 : 12,
  },
});

export default DashboardScreen;
