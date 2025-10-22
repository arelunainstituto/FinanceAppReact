import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth > 768;

interface QuickStatsProps {
  defaultRate: number;
  avgRevenuePerContract: number;
  monthlyGrowth: number;
}

const QuickStats: React.FC<QuickStatsProps> = ({
  defaultRate,
  avgRevenuePerContract,
  monthlyGrowth,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Indicadores Rápidos</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: defaultRate > 10 ? '#DC3545' : '#28A745' }]}>
            {defaultRate.toFixed(1)}%
          </Text>
          <Text style={styles.statLabel}>Taxa de Inadimplência</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#007AFF' }]}>
            {formatCurrency(avgRevenuePerContract)}
          </Text>
          <Text style={styles.statLabel}>Receita Média/Contrato</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: monthlyGrowth >= 0 ? '#28A745' : '#DC3545' }]}>
            {formatPercent(monthlyGrowth)}
          </Text>
          <Text style={styles.statLabel}>Crescimento Mensal</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isTablet ? 24 : 16,
    marginBottom: isTablet ? 24 : 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  title: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: isTablet ? 20 : 16,
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: isTablet ? 'row' : 'column',
    justifyContent: 'space-between',
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: isTablet ? 'center' : 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: isTablet ? 0 : 1,
    borderBottomColor: '#F8F9FA',
  },
  statValue: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: isTablet ? 'center' : 'left',
  },
});

export default QuickStats;

