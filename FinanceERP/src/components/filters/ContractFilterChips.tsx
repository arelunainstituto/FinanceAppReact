import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContractAdvancedFiltersData } from './ContractAdvancedFilters';

interface ContractFilterChipsProps {
  filters: ContractAdvancedFiltersData;
  onRemoveFilter: (key: keyof ContractAdvancedFiltersData) => void;
  onClearAll: () => void;
}

const ContractFilterChips: React.FC<ContractFilterChipsProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
}) => {
  const getFilterLabel = (key: string, value: string): string => {
    const labels: Record<string, string> = {
      // Date filters
      start_date_from: 'Início de',
      start_date_to: 'Início até',
      end_date_from: 'Fim de',
      end_date_to: 'Fim até',
      created_at_from: 'Criado de',
      created_at_to: 'Criado até',
      
      // Value filters
      value_from: 'Valor de',
      value_to: 'Valor até',
      value_min: 'Valor mínimo',
      value_max: 'Valor máximo',
      
      // Contract filters
      contract_number: 'Nº Contrato',
      description: 'Descrição',
      number_of_payments_from: 'Parcelas de',
      number_of_payments_to: 'Parcelas até',
      local: 'Local',
      area: 'Área',
      gestora: 'Gestor(a)',
      medico: 'Médico(a)',
      
      // Status filter
      status: 'Status',
      
      // Client filters
      client_name: 'Cliente',
      client_email: 'Email',
      client_phone: 'Telefone',
      client_tax_id: 'NIF',
    };

    const label = labels[key] || key;
    return `${label}: ${value}`;
  };

  const getStatusLabel = (value: string): string => {
    const statuses: Record<string, string> = {
      'ativo': 'Ativo',
      'liquidado': 'Liquidado',
      'renegociado': 'Renegociado',
      'cancelado': 'Cancelado',
      'jurídico': 'Jurídico',
    };
    return statuses[value] || value;
  };

  const formatFilterValue = (key: string, value: string): string => {
    if (key === 'status') {
      return getStatusLabel(value);
    }
    
    if (key.includes('value') && !isNaN(parseFloat(value))) {
      return `€${parseFloat(value).toFixed(2)}`;
    }
    
    return value;
  };

  const activeFilters = Object.entries(filters).filter(([_, value]) => 
    value !== undefined && value !== '' && value.trim() !== ''
  );

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filtros Ativos:</Text>
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
              {getFilterLabel(key, formatFilterValue(key, value as string))}
            </Text>
            <TouchableOpacity
              onPress={() => onRemoveFilter(key as keyof ContractAdvancedFiltersData)}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
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
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  chipText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
    marginRight: 6,
  },
  removeButton: {
    padding: 2,
  },
});

export default ContractFilterChips;