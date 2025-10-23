import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { Doughnut } from 'react-chartjs-2';
import { useInView } from '../../hooks/useInView';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

// Registrar componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth > 768;

interface PaymentStatusChartProps {
  data: Array<{ status: string; count: number }>;
}

const PaymentStatusChart: React.FC<PaymentStatusChartProps> = ({ data }) => {
  // Detectar quando elemento entra na viewport
  const [ref, isInView] = useInView({ threshold: 0.2, triggerOnce: true });

  // Animação de fade-in e slide-up
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    if (isInView) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
      // Forçar re-render do gráfico para iniciar animação
      setChartKey(prev => prev + 1);
    }
  }, [isInView]);

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

  const filteredData = data.filter(item => item.count > 0);

  if (filteredData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Status dos Pagamentos</Text>
        <Text style={styles.noData}>Nenhum dado disponível</Text>
      </View>
    );
  }

  const chartData = {
    labels: filteredData.map(item => statusLabels[item.status] || item.status),
    datasets: [
      {
        data: filteredData.map(item => item.count),
        backgroundColor: filteredData.map(item => statusColors[item.status] || '#6C757D'),
        borderColor: '#FFFFFF',
        borderWidth: 3,
        hoverOffset: 15,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 15,
          font: {
            size: 13,
            family: 'system-ui',
          },
          usePointStyle: true,
          pointStyle: 'circle',
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const value = data.datasets[0].data[i];
                const total = data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return {
                  text: `${label}: ${value} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} pagamentos (${percentage}%)`;
          },
        },
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 2000,
      easing: 'easeInOutBack' as const, // Bounce effect mais dramático
      delay: (context: any) => {
        let delay = 0;
        if (context.type === 'data' && context.mode === 'default') {
          // Cada segmento anima com delay progressivo
          delay = context.dataIndex * 150;
        }
        return delay;
      },
      onProgress: (animation: any) => {
        // Verificações de segurança
        if (!animation || !animation.chart) return;
        
        try {
          // Animação de pulsação durante o progresso
          const chart = animation.chart;
          if (!chart.ctx || !chart.chartArea) return;
          
          const ctx = chart.ctx;
          const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
          const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
          
          ctx.save();
          ctx.globalAlpha = 0.1 * (1 - animation.currentStep / animation.numSteps);
          ctx.beginPath();
          const radius = Math.min(chart.chartArea.right - centerX, chart.chartArea.bottom - centerY);
          ctx.arc(centerX, centerY, radius * (1 + 0.3 * Math.sin(animation.currentStep / 10)), 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(0, 122, 255, 0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        } catch (error) {
          // Silenciar erros de animação
          console.debug('Animation progress error (safe to ignore):', error);
        }
      },
    },
    // Transições suaves ao atualizar dados
    transitions: {
      active: {
        animation: {
          duration: 400,
        },
      },
    },
  };

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
      <Text style={styles.title}>Status dos Pagamentos</Text>
      <View style={styles.chartContainer}>
        {isInView && <Doughnut key={chartKey} data={chartData} options={options} />}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isTablet ? 20 : 16,
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
    height: '100%',
  },
  title: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: isTablet ? 16 : 12,
    letterSpacing: -0.3,
  },
  chartContainer: {
    height: 280,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noData: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    paddingVertical: 40,
  },
});

export default PaymentStatusChart;
