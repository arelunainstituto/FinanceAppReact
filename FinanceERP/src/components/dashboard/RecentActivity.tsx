import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Payment, Contract } from '../../types';

const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth > 768;

interface RecentActivityProps {
  recentPayments?: Payment[];
  upcomingPayments?: Payment[];
  recentContracts?: Contract[];
  type: 'payments' | 'upcoming' | 'contracts';
}

const RecentActivity: React.FC<RecentActivityProps> = ({
  recentPayments = [],
  upcomingPayments = [],
  recentContracts = [],
  type,
}) => {
  const getTitle = () => {
    switch (type) {
      case 'payments':
        return 'Últimos Pagamentos';
      case 'upcoming':
        return 'Próximos Vencimentos';
      case 'contracts':
        return 'Contratos Recentes';
      default:
        return 'Atividades';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'paid':
        return '#28A745';
      case 'pending':
        return '#FFC107';
      case 'overdue':
        return '#DC3545';
      case 'ativo':
        return '#007AFF';
      default:
        return '#6C757D';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const renderPaymentItem = (payment: Payment) => (
    <View key={payment.id} style={styles.activityItem}>
      <View style={[styles.activityDot, { backgroundColor: getStatusColor(payment.status) }]} />
      <View style={styles.activityContent}>
        <Text style={styles.activityText} numberOfLines={1}>
          Pagamento - {payment.contract?.client?.first_name || 'Cliente'}
        </Text>
        <Text style={styles.activitySubtext}>
          {formatCurrency(payment.amount)} • {formatDate(payment.due_date)}
        </Text>
      </View>
    </View>
  );

  const renderContractItem = (contract: Contract) => (
    <View key={contract.id} style={styles.activityItem}>
      <View style={[styles.activityDot, { backgroundColor: getStatusColor(contract.status) }]} />
      <View style={styles.activityContent}>
        <Text style={styles.activityText} numberOfLines={1}>
          {contract.contract_number || 'Contrato'} - {contract.client?.first_name || 'Cliente'}
        </Text>
        <Text style={styles.activitySubtext}>
          {contract.value ? formatCurrency(contract.value) : 'Sem valor'} • {formatDate(contract.created_at)}
        </Text>
      </View>
    </View>
  );

  const renderContent = () => {
    if (type === 'payments' && recentPayments.length === 0) {
      return <Text style={styles.noData}>Nenhum pagamento recente</Text>;
    }
    if (type === 'upcoming' && upcomingPayments.length === 0) {
      return <Text style={styles.noData}>Nenhum pagamento próximo</Text>;
    }
    if (type === 'contracts' && recentContracts.length === 0) {
      return <Text style={styles.noData}>Nenhum contrato recente</Text>;
    }

    if (type === 'payments') {
      return recentPayments.slice(0, 5).map(renderPaymentItem);
    }
    if (type === 'upcoming') {
      return upcomingPayments.slice(0, 5).map(renderPaymentItem);
    }
    if (type === 'contracts') {
      return recentContracts.slice(0, 5).map(renderContractItem);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getTitle()}</Text>
      {renderContent()}
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
  },
  title: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: isTablet ? 20 : 16,
    letterSpacing: -0.3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: isTablet ? 14 : 13,
    color: '#495057',
    fontWeight: '500',
    marginBottom: 4,
  },
  activitySubtext: {
    fontSize: 12,
    color: '#6C757D',
  },
  noData: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default RecentActivity;

