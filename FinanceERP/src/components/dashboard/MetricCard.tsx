import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { useIntegerCountUp, useCurrencyCountUp } from '../../hooks/useCountUp';
import { useInView } from '../../hooks/useInView';

const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth > 768;

interface MetricCardProps {
  title: string;
  value: string | number;
  badgeText?: string;
  badgeColor?: string;
  valueColor?: string;
  icon?: string;
  isCurrency?: boolean; // Novo: indica se é valor monetário
  animationDuration?: number; // Duração da animação em ms
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  badgeText,
  badgeColor = '#D4EDDA',
  valueColor = '#2C3E50',
  isCurrency = false,
  animationDuration = 1500,
}) => {
  // Detectar quando elemento entra na viewport
  const [ref, isInView] = useInView({ threshold: 0.2, triggerOnce: true });

  // Animações de entrada
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (isInView && !shouldAnimate) {
      setShouldAnimate(true);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isInView]);

  // Converter valor para número se for string
  const numericValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0
    : value;

  // SEMPRE chamar os hooks (não pode ser condicional)
  // Mas usar valores diferentes baseado em shouldAnimate
  const animatedCurrency = useCurrencyCountUp(
    shouldAnimate ? numericValue : 0, 
    animationDuration
  );
  const animatedInteger = useIntegerCountUp(
    shouldAnimate ? numericValue : 0, 
    animationDuration
  );

  // Escolher qual valor usar
  const animatedValue = isCurrency ? animatedCurrency : animatedInteger;

  // Se o valor original era string e não numérico, usar o valor original
  const displayValue = typeof value === 'string' && isNaN(parseFloat(value.replace(/[^0-9.-]/g, '')))
    ? value
    : animatedValue;

  return (
    <Animated.View 
      ref={ref}
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={[styles.value, { color: valueColor }]}>{displayValue}</Text>
      <Text style={styles.title}>{title}</Text>
      
      {badgeText && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: isTablet ? '48%' : '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isTablet ? 24 : 16,
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
    position: 'relative',
    marginBottom: isTablet ? 0 : 12,
  },
  value: {
    fontSize: isTablet ? 36 : 28,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -1,
  },
  title: {
    fontSize: isTablet ? 14 : 12,
    color: '#6C757D',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  badge: {
    position: 'absolute',
    top: isTablet ? 16 : 12,
    right: isTablet ? 16 : 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#495057',
  },
});

export default MetricCard;

