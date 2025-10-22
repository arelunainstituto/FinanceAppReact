import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth > 768;
const cardPadding = isTablet ? 24 : 16;
const chartWidth = screenWidth - (cardPadding * 2) - (isTablet ? 100 : 80);

interface ContractsChartProps {
  activeContracts: number;
  totalContracts: number;
}

const ContractsChart: React.FC<ContractsChartProps> = ({ activeContracts, totalContracts }) => {
  const inactiveContracts = totalContracts - activeContracts;

  const chartData = {
    labels: ['Ativos', 'Inativos'],
    datasets: [
      {
        data: [activeContracts, inactiveContracts],
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
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#E9ECEF',
      strokeWidth: 1,
    },
    barPercentage: 0.7,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contratos</Text>
      <BarChart
        data={chartData}
        width={chartWidth}
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
        fromZero={true}
        showBarTops={false}
        withInnerLines={true}
        yAxisLabel=""
        yAxisSuffix=""
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

export default ContractsChart;

