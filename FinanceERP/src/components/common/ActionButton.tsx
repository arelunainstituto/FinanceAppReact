import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ActionButtonProps {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  size?: number;
  variant?: 'primary' | 'secondary' | 'danger' | 'info' | 'success' | 'warning';
  disabled?: boolean;
  style?: ViewStyle;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon = 'settings-outline',
  onPress,
  color,
  size = 16,
  variant = 'primary',
  disabled = false,
  style,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: '#EFF6FF',
          iconColor: '#007BFF',
          borderColor: '#DBEAFE',
        };
      case 'secondary':
        return {
          backgroundColor: '#F1F5F9',
          iconColor: '#64748B',
          borderColor: '#E2E8F0',
        };
      case 'danger':
        return {
          backgroundColor: '#FEF2F2',
          iconColor: '#DC3545',
          borderColor: '#FECACA',
        };
      case 'info':
        return {
          backgroundColor: '#EEF2FF',
          iconColor: '#6366F1',
          borderColor: '#C7D2FE',
        };
      case 'success':
        return {
          backgroundColor: '#ECFDF5',
          iconColor: '#10B981',
          borderColor: '#A7F3D0',
        };
      case 'warning':
        return {
          backgroundColor: '#FFFBEB',
          iconColor: '#F59E0B',
          borderColor: '#FDE68A',
        };
      default:
        return {
          backgroundColor: '#EFF6FF',
          iconColor: '#007BFF',
          borderColor: '#DBEAFE',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { 
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={size}
        color={color || variantStyles.iconColor}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default ActionButton;

