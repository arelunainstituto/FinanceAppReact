import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth > 768;

interface PaymentStatusChartProps {
  data: Array<{ status: string; count: number }>;
}

const PaymentStatusChart: React.FC<PaymentStatusChartProps> = ({ data }) => {
  const statusLabels: { [key: string]: string } = {
    paid: 'Pagos',
    pending: 'Pendentes',
    overdue: 'Atrasados',
    renegociado: 'Renegociados',
    failed: 'Falhos',
  };

  const statusColors: { [key: string]: string } = {
    paid: '#28A745',      // Verde
    pending: '#FFC107',    // Amarelo
    overdue: '#DC3545',    // Vermelho
    renegociado: '#17A2B8', // Azul claro/cyan
    failed: '#6C757D',     // Cinza
  };

  const chartData = data
    .filter(item => item.count > 0)
    .map(item => ({
      name: statusLabels[item.status] || item.status,
      population: item.count,
      color: statusColors[item.status] || '#6C757D',
      legendFontColor: '#495057',
      legendFontSize: 12,
    }));

  if (chartData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Status dos Pagamentos</Text>
        <Text style={styles.noData}>Nenhum dado disponível</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Status dos Pagamentos</Text>
      <PieChart
        data={chartData}
        width={screenWidth - (isTablet ? 100 : 60)}
        height={220}
        chartConfig={{
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        center={[10, 10]}
        absolute
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
  noData: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    paddingVertical: 40,
  },
});

export default PaymentStatusChart;

