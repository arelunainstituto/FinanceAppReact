import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { Line } from 'react-chartjs-2';
import { useInView } from '../../hooks/useInView';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth > 768;

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number }>;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
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

  const labels = data.length > 0 ? data.map(item => item.month) : ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const revenues = data.length > 0 ? data.map(item => Math.max(0, item.revenue)) : [0, 0, 0, 0, 0, 0];

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Receita',
        data: revenues,
        borderColor: 'rgb(0, 122, 255)',
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        tension: 0.4, // Curva suave
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgb(0, 122, 255)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(0, 122, 255)',
        pointHoverBorderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
            return `Receita: €${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
          callback: function(value: any) {
            return '€' + (value / 1000).toFixed(0) + 'k';
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart' as const,
      delay: (context: any) => {
        let delay = 0;
        if (context.type === 'data' && context.mode === 'default') {
          delay = context.dataIndex * 120;
        }
        return delay;
      },
      onProgress: (animation: any) => {
        // Verificações de segurança
        if (!animation || !animation.chart) return;
        
        try {
          // Efeito de linha desenhando
          const chart = animation.chart;
          if (!chart.ctx || !chart.getDatasetMeta) return;
          
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          
          // Verificar se meta existe e tem dados
          if (!meta || !meta.data || !Array.isArray(meta.data) || meta.data.length === 0) {
            return;
          }
          
          ctx.save();
          ctx.globalAlpha = 0.05;
          ctx.strokeStyle = 'rgba(0, 122, 255, 0.2)';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          
          // Linha tracejada que acompanha o progresso
          ctx.beginPath();
          meta.data.forEach((point: any, index: number) => {
            if (!point || typeof point.x === 'undefined' || typeof point.y === 'undefined') return;
            
            const progress = animation.currentStep / animation.numSteps;
            if (index / meta.data.length <= progress) {
              if (index === 0) {
                ctx.moveTo(point.x, point.y);
              } else {
                ctx.lineTo(point.x, point.y);
              }
            }
          });
          ctx.stroke();
          ctx.restore();
        } catch (error) {
          // Silenciar erros de animação
          console.debug('Animation progress error (safe to ignore):', error);
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
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
      <Text style={styles.title}>Receita Mensal</Text>
      <View style={styles.chartContainer}>
        {isInView && <Line key={chartKey} data={chartData} options={options} />}
      </View>
    </Animated.View>
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
  chartContainer: {
    height: 300,
    width: '100%',
  },
});

export default RevenueChart;
