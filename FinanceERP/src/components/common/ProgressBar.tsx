import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ProgressBarProps {
  value: number; // 0-100
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
  borderRadius?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  height = 8,
  backgroundColor = '#E2E8F0',
  progressColor = '#3B82F6',
  borderRadius = 4,
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));

  const getProgressColor = () => {
    if (clampedValue >= 75) return '#10B981'; // Green
    if (clampedValue >= 50) return '#3B82F6'; // Blue
    if (clampedValue >= 25) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  return (
    <View style={[styles.container, { height, backgroundColor, borderRadius }]}>
      <View
        style={[
          styles.progress,
          {
            width: `${clampedValue}%`,
            backgroundColor: progressColor || getProgressColor(),
            borderRadius,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
  },
});

export default ProgressBar;

