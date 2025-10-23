import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'pending' | 'overdue' | 'paid' | 'renegociated' | 'failed';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  customColor?: string;
  customBg?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'default',
  customColor,
  customBg,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
      case 'paid':
        return {
          backgroundColor: customBg || '#D1FAE5',
          color: customColor || '#065F46',
        };
      case 'warning':
      case 'pending':
        return {
          backgroundColor: customBg || '#FEF3C7',
          color: customColor || '#92400E',
        };
      case 'danger':
      case 'overdue':
      case 'failed':
        return {
          backgroundColor: customBg || '#FEE2E2',
          color: customColor || '#991B1B',
        };
      case 'info':
      case 'renegociated':
        return {
          backgroundColor: customBg || '#DBEAFE',
          color: customColor || '#1E40AF',
        };
      default:
        return {
          backgroundColor: customBg || '#F1F5F9',
          color: customColor || '#475569',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View style={[styles.badge, { backgroundColor: variantStyles.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: variantStyles.color }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default StatusBadge;

