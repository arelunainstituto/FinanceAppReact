import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdvancedFiltersData } from './AdvancedFilters';

interface FilterChipsProps {
  filters: AdvancedFiltersData;
  onRemoveFilter: (key: keyof AdvancedFiltersData) => void;
  onClearAll: () => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
}) => {
  const getFilterLabel = (key: keyof AdvancedFiltersData, value: string): string => {
    const labels: Record<string, string> = {
      due_date_from: `Venc. de: ${value}`,
      due_date_to: `Venc. até: ${value}`,
      paid_date_from: `Pago de: ${value}`,
      paid_date_to: `Pago até: ${value}`,
      created_at_from: `Criado de: ${value}`,
      created_at_to: `Criado até: ${value}`,
      amount_from: `Valor de: € ${value}`,
      amount_to: `Valor até: € ${value}`,
      payment_method: `Método: ${getPaymentMethodLabel(value)}`,
      payment_type: `Tipo: ${getPaymentTypeLabel(value)}`,
      status: `Status: ${getStatusLabel(value)}`,
      contract_number: `Contrato: ${value}`,
      contract_status: `Status Contrato: ${getContractStatusLabel(value)}`,
      client_name: `Cliente: ${value}`,
      client_email: `E-mail: ${value}`,
      client_phone: `Telefone: ${value}`,
      client_tax_id: `NIF: ${value}`,
    };

    return labels[key] || `${key}: ${value}`;
  };

  const getPaymentMethodLabel = (value: string): string => {
    const methods: Record<string, string> = {
      DD: 'DD',
      Stripe: 'Stripe',
      'Receção': 'Receção',
      TRF: 'TRF',
      PP: 'PP',
      Cheque: 'Cheque',
      'Cheque/Misto': 'Cheque/Misto',
      Aditamento: 'Aditamento',
      'DD + TB': 'DD + TB',
      'TRF ou RECEÇÃO': 'TRF ou RECEÇÃO',
      Ordenado: 'Ordenado',
      'Numerário': 'Numerário',
      'MB Way': 'MB Way',
    };
    return methods[value] || value;
  };

  const getPaymentTypeLabel = (value: string): string => {
    const types: Record<string, string> = {
      normalPayment: 'Pagamento Normal',
      downPayment: 'Entrada',
    };
    return types[value] || value;
  };

  const getStatusLabel = (value: string): string => {
    const statuses: Record<string, string> = {
      pending: 'Pendente',
      paid: 'Pago',
      overdue: 'Atrasado',
      failed: 'Falhou',
    };
    return statuses[value] || value;
  };

  const getContractStatusLabel = (value: string): string => {
    const statuses: Record<string, string> = {
      'ativo': 'Ativo',
      'liquidado': 'Liquidado',
      'renegociado': 'Renegociado',
      'cancelado': 'Cancelado',
      'jurídico': 'Jurídico',
    };
    return statuses[value] || value;
  };

  // Filtrar apenas os filtros que têm valores
  const activeFilters = Object.entries(filters).filter(
    ([_, value]) => value !== undefined && value !== null && value !== ''
  );

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filtros Aplicados:</Text>
        <TouchableOpacity onPress={onClearAll} style={styles.clearAllButton}>
          <Text style={styles.clearAllText}>Limpar Todos</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {activeFilters.map(([key, value]) => (
          <View key={key} style={styles.chip}>
            <Text style={styles.chipText}>
              {getFilterLabel(key as keyof AdvancedFiltersData, String(value))}
            </Text>
            <TouchableOpacity
              onPress={() => onRemoveFilter(key as keyof AdvancedFiltersData)}
              style={styles.removeButton}
            >
              <Ionicons name="close" size={14} color="#64748B" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  clearAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 6,
  },
  chipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  removeButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FilterChips;