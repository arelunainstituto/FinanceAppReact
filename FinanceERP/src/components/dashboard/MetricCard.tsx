import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth > 768;

interface MetricCardProps {
  title: string;
  value: string | number;
  badgeText?: string;
  badgeColor?: string;
  valueColor?: string;
  icon?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  badgeText,
  badgeColor = '#D4EDDA',
  valueColor = '#2C3E50',
}) => {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      
      {badgeText && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}
    </View>
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

