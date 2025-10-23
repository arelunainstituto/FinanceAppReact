import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { Bar } from 'react-chartjs-2';
import { useInView } from '../../hooks/useInView';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth > 768;

interface ContractsChartProps {
  activeContracts: number;
  totalContracts: number;
}

const ContractsChart: React.FC<ContractsChartProps> = ({ activeContracts, totalContracts }) => {
  const inactiveContracts = totalContracts - activeContracts;

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

  const chartData = {
    labels: ['Contratos'],
    datasets: [
      {
        label: 'Ativos',
        data: [activeContracts],
        backgroundColor: 'rgba(0, 122, 255, 0.8)',
        borderColor: 'rgb(0, 122, 255)',
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 60,
      },
      {
        label: 'Inativos',
        data: [inactiveContracts],
        backgroundColor: 'rgba(108, 117, 125, 0.6)',
        borderColor: 'rgb(108, 117, 125)',
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 60,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 13,
            family: 'system-ui',
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
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
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const total = activeContracts + inactiveContracts;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} contratos (${percentage}%)`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 12,
          },
          precision: 0,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 13,
            weight: 'bold' as const,
          },
        },
      },
    },
    animation: {
      duration: 1800,
      easing: 'easeInOutBack' as const, // Bounce effect
      delay: (context: any) => {
        let delay = 0;
        if (context.type === 'data' && context.mode === 'default') {
          delay = context.datasetIndex * 300 + context.dataIndex * 100;
        }
        return delay;
      },
      onProgress: (animation: any) => {
        // Verificações de segurança
        if (!animation || !animation.chart) return;
        
        try {
          // Efeito de sombra pulsante
          const chart = animation.chart;
          if (!chart.ctx) return;
          
          const ctx = chart.ctx;
          const progress = animation.currentStep / animation.numSteps;
          
          ctx.save();
          ctx.globalAlpha = 0.1 * (1 - progress);
          ctx.shadowColor = 'rgba(0, 122, 255, 0.5)';
          ctx.shadowBlur = 20 * (1 - progress);
          ctx.restore();
        } catch (error) {
          // Silenciar erros de animação
          console.debug('Animation progress error (safe to ignore):', error);
        }
      },
    },
    // Animação de hover melhorada
    transitions: {
      active: {
        animation: {
          duration: 300,
          easing: 'easeOutQuart' as const,
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
      <Text style={styles.title}>Contratos</Text>
      <View style={styles.chartContainer}>
        {isInView && <Bar key={chartKey} data={chartData} options={options} />}
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
  },
});

export default ContractsChart;
