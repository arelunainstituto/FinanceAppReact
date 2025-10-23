import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { useCountUp } from '../../hooks/useCountUp';
import { useInView } from '../../hooks/useInView';

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
  // Detectar quando elemento entra na viewport
  const [ref, isInView] = useInView({ threshold: 0.2, triggerOnce: true });

  // Animações de fade-in e slide-up
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (isInView && !shouldAnimate) {
      setShouldAnimate(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isInView]);

  // SEMPRE chamar os hooks (não pode ser condicional)
  // Mas usar valores diferentes baseado em shouldAnimate
  const animatedDefaultRate = useCountUp({
    start: 0,
    end: shouldAnimate ? defaultRate : 0,
    duration: 1800,
    decimals: 1,
    suffix: '%',
  });

  const animatedAvgRevenue = useCountUp({
    start: 0,
    end: shouldAnimate ? avgRevenuePerContract : 0,
    duration: 2000,
    decimals: 0,
    prefix: '€',
  });

  const animatedGrowth = useCountUp({
    start: 0,
    end: shouldAnimate ? Math.abs(monthlyGrowth) : 0,
    duration: 1800,
    decimals: 1,
    prefix: monthlyGrowth >= 0 ? '+' : '-',
    suffix: '%',
  });

  return (
    <Animated.View
      ref={ref} 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.title}>Indicadores Rápidos</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: defaultRate > 10 ? '#DC3545' : '#28A745' }]}>
            {animatedDefaultRate}
          </Text>
          <Text style={styles.statLabel}>Taxa de Inadimplência</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#007AFF' }]}>
            {animatedAvgRevenue}
          </Text>
          <Text style={styles.statLabel}>Receita Média/Contrato</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: monthlyGrowth >= 0 ? '#28A745' : '#DC3545' }]}>
            {animatedGrowth}
          </Text>
          <Text style={styles.statLabel}>Crescimento Mensal</Text>
        </View>
      </View>
    </Animated.View>
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

