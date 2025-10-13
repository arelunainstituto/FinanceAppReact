import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from '../common/Input';
import Button from '../common/Button';
import DatePicker from '../common/DatePicker';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

export interface ContractAdvancedFiltersData {
  // Date filters
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
  created_at_from?: string;
  created_at_to?: string;
  
  // Value filters
  value_min?: string;
  value_max?: string;
  
  // Contract specific filters
  contract_number?: string;
  description?: string;
  local?: string;
  area?: string;
  gestora?: string;
  medico?: string;
  number_of_payments_from?: string;
  number_of_payments_to?: string;
  
  // Status filter
  status?: string;
  
  // Client filters
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_tax_id?: string;
}

interface ContractAdvancedFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: ContractAdvancedFiltersData) => void;
  onClearFilters: () => void;
  initialFilters?: ContractAdvancedFiltersData;
}

const contractStatuses = [
  { value: '', label: 'Todos os status' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'liquidado', label: 'Liquidado' },
  { value: 'renegociado', label: 'Renegociado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'jurídico', label: 'Jurídico' },
];

const ContractAdvancedFilters: React.FC<ContractAdvancedFiltersProps> = ({
  visible,
  onClose,
  onApplyFilters,
  onClearFilters,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<ContractAdvancedFiltersData>(initialFilters);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const updateFilter = (key: keyof ContractAdvancedFiltersData, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApplyFilters = () => {
    // Remove empty filters
    const cleanedFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value && value.trim() !== '') {
        acc[key as keyof ContractAdvancedFiltersData] = value;
      }
      return acc;
    }, {} as ContractAdvancedFiltersData);

    onApplyFilters(cleanedFilters);
    onClose();
  };

  const handleClearFilters = () => {
    setFilters({});
    onClearFilters();
    onClose();
  };

  const renderSectionWithIcon = (iconName: string, title: string, content: React.ReactNode) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={iconName as any} size={20} color="#3B82F6" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {content}
      </View>
    </View>
  );

  const renderSelectField = (
    label: string,
    value: string | undefined,
    options: { value: string; label: string }[],
    onValueChange: (value: string) => void
  ) => (
    <View style={styles.selectContainer}>
      <Text style={styles.selectLabel}>{label}</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectOptions}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.selectOption,
              value === option.value && styles.selectOptionActive,
            ]}
            onPress={() => onValueChange(option.value)}
          >
            <Text
              style={[
                styles.selectOptionText,
                value === option.value && styles.selectOptionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
            <Text style={styles.title}>Filtros Avançados</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Date Filters */}
          {renderSectionWithIcon(
            'calendar-outline',
            'Filtros de Data',
            <View>
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <DatePicker
                    label="Data de Início - De:"
                    value={filters.start_date_from || ''}
                    onDateChange={(date) => updateFilter('start_date_from', date)}
                    placeholder="DD/MM/AAAA"
                  />
                </View>
                <View style={styles.dateField}>
                  <DatePicker
                    label="Até:"
                    value={filters.start_date_to || ''}
                    onDateChange={(date) => updateFilter('start_date_to', date)}
                    placeholder="DD/MM/AAAA"
                  />
                </View>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <DatePicker
                    label="Data de Fim - De:"
                    value={filters.end_date_from || ''}
                    onDateChange={(date) => updateFilter('end_date_from', date)}
                    placeholder="DD/MM/AAAA"
                  />
                </View>
                <View style={styles.dateField}>
                  <DatePicker
                    label="Até:"
                    value={filters.end_date_to || ''}
                    onDateChange={(date) => updateFilter('end_date_to', date)}
                    placeholder="DD/MM/AAAA"
                  />
                </View>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <DatePicker
                    label="Data de Criação - De:"
                    value={filters.created_at_from || ''}
                    onDateChange={(date) => updateFilter('created_at_from', date)}
                    placeholder="DD/MM/AAAA"
                  />
                </View>
                <View style={styles.dateField}>
                  <DatePicker
                    label="Até:"
                    value={filters.created_at_to || ''}
                    onDateChange={(date) => updateFilter('created_at_to', date)}
                    placeholder="DD/MM/AAAA"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Value Filters */}
          {renderSectionWithIcon(
            'cash-outline',
            'Filtros de Valor',
            <View style={styles.valueRow}>
              <View style={styles.valueField}>
                <Input
                  label="Valor - De:"
                  value={filters.value_min || ''}
                  onChangeText={(text) => updateFilter('value_min', text)}
                  placeholder="0,00"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.valueField}>
                <Input
                  label="Até:"
                  value={filters.value_max || ''}
                  onChangeText={(text) => updateFilter('value_max', text)}
                  placeholder="0,00"
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {/* Contract Specific Filters */}
          {renderSectionWithIcon(
            'document-text-outline',
            'Filtros de Contrato',
            <View>
              <Input
                label="Número do Contrato"
                value={filters.contract_number || ''}
                onChangeText={(text) => updateFilter('contract_number', text)}
                placeholder="Digite o número do contrato"
              />
              <Input
                label="Local"
                value={filters.local || ''}
                onChangeText={(text) => updateFilter('local', text)}
                placeholder="Digite o local do contrato"
              />
              <Input
                label="Área"
                value={filters.area || ''}
                onChangeText={(text) => updateFilter('area', text)}
                placeholder="Digite a área do contrato"
              />
              <Input
          label="Gestor(a)"
          value={filters.gestora || ''}
          onChangeText={(text) => updateFilter('gestora', text)}
          placeholder="Digite o gestor(a) do contrato"
        />
              <Input
          label="Médico(a)"
          value={filters.medico || ''}
          onChangeText={(text) => updateFilter('medico', text)}
          placeholder="Digite o médico(a) do contrato"
        />
              <Input
                label="Descrição"
                value={filters.description || ''}
                onChangeText={(text) => updateFilter('description', text)}
                placeholder="Digite a descrição do contrato"
              />
              <View style={styles.paymentsRow}>
                <View style={styles.paymentsField}>
                  <Input
                    label="Nº Parcelas - De:"
                    value={filters.number_of_payments_from || ''}
                    onChangeText={(text) => updateFilter('number_of_payments_from', text)}
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.paymentsField}>
                  <Input
                    label="Até:"
                    value={filters.number_of_payments_to || ''}
                    onChangeText={(text) => updateFilter('number_of_payments_to', text)}
                    placeholder="12"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              {renderSelectField(
                'Status do Contrato',
                filters.status,
                contractStatuses,
                (value) => updateFilter('status', value || undefined)
              )}
            </View>
          )}

          {/* Client Filters */}
          {renderSectionWithIcon(
            'person-outline',
            'Filtros de Cliente',
            <View>
              <Input
                label="Nome do Cliente"
                value={filters.client_name || ''}
                onChangeText={(text) => updateFilter('client_name', text)}
                placeholder="Digite o nome do cliente"
              />
              <Input
                label="Email do Cliente"
                value={filters.client_email || ''}
                onChangeText={(text) => updateFilter('client_email', text)}
                placeholder="Digite o email do cliente"
                keyboardType="email-address"
              />
              <Input
                label="Telefone do Cliente"
                value={filters.client_phone || ''}
                onChangeText={(text) => updateFilter('client_phone', text)}
                placeholder="Digite o telefone do cliente"
                keyboardType="phone-pad"
              />
              <Input
                label="NIF do Cliente"
                value={filters.client_tax_id || ''}
                onChangeText={(text) => updateFilter('client_tax_id', text)}
                placeholder="Digite o NIF do cliente"
              />
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Limpar Filtros"
            onPress={handleClearFilters}
            variant="secondary"
            style={styles.clearButton}
          />
          <Button
            title="Aplicar Filtros"
            onPress={handleApplyFilters}
            variant="primary"
            style={styles.applyButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  closeButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateRow: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: 16,
    marginBottom: 16,
  },
  dateField: {
    flex: 1,
  },
  valueRow: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: 16,
  },
  valueField: {
    flex: 1,
  },
  paymentsRow: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: 16,
    marginBottom: 16,
  },
  paymentsField: {
    flex: 1,
  },
  selectContainer: {
    marginBottom: 16,
  },
  selectLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  selectOptions: {
    paddingRight: 16,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  selectOptionTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  clearButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
});

export default ContractAdvancedFilters;