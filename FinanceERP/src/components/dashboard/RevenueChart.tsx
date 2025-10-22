import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth > 768;
const cardPadding = isTablet ? 24 : 16;
const chartWidth = screenWidth - (cardPadding * 2) - (isTablet ? 100 : 80);

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number }>;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const chartData = {
    labels: data.length > 0 ? data.map(item => item.month) : ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        data: data.length > 0 ? data.map(item => Math.max(0, item.revenue)) : [0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(28, 28, 30, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#007AFF',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#E9ECEF',
      strokeWidth: 1,
    },
    fillShadowGradient: '#007AFF',
    fillShadowGradientOpacity: 0.1,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Receita Mensal</Text>
      <LineChart
        data={chartData}
        width={chartWidth}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={true}
        fromZero={true}
      />
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
    overflow: 'hidden',
    width: '100%',
  },
  title: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: isTablet ? 20 : 16,
    letterSpacing: -0.3,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
    alignSelf: 'center',
    overflow: 'hidden',
    maxWidth: '100%',
  },
});

export default RevenueChart;

