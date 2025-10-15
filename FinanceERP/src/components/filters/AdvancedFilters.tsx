import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from '../common/Input';
import Button from '../common/Button';
import DatePicker from '../common/DatePicker';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

export interface AdvancedFiltersData {
  // Date filters
  due_date_from?: string;
  due_date_to?: string;
  paid_date_from?: string;
  paid_date_to?: string;
  created_at_from?: string;
  created_at_to?: string;
  
  // Amount filters
  amount_from?: string;
  amount_to?: string;
  
  // Payment method and type
  payment_method?: string;
  payment_type?: string;
  
  // Payment status
  status?: string;
  
  // Contract filters
  contract_number?: string;
  contract_status?: string;
  
  // Client filters
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_tax_id?: string;
}

interface AdvancedFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: AdvancedFiltersData) => void;
  onClearFilters: () => void;
  initialFilters?: AdvancedFiltersData;
}

const paymentMethods = [
  { value: '', label: 'Todos os métodos' },
  { value: 'DD', label: 'DD' },
  { value: 'Stripe', label: 'Stripe' },
  { value: 'Receção', label: 'Receção' },
  { value: 'TRF', label: 'TRF' },
  { value: 'PP', label: 'PP' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Cheque/Misto', label: 'Cheque/Misto' },
  { value: 'Aditamento', label: 'Aditamento' },
  { value: 'DD + TB', label: 'DD + TB' },
  { value: 'TRF ou RECEÇÃO', label: 'TRF ou RECEÇÃO' },
  { value: 'Ordenado', label: 'Ordenado' },
  { value: 'Numerário', label: 'Numerário' },
  { value: 'MB Way', label: 'MB Way' },
];

const paymentTypes = [
  { value: '', label: 'Todos os tipos' },
  { value: 'normalPayment', label: 'Pagamento Normal' },
  { value: 'downPayment', label: 'Entrada' },
];

const contractStatuses = [
  { value: '', label: 'Todos os status' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'liquidado', label: 'Liquidado' },
  { value: 'renegociado', label: 'Renegociado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'jurídico', label: 'Jurídico' },
];

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  visible,
  onClose,
  onApplyFilters,
  onClearFilters,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<AdvancedFiltersData>(initialFilters);

  // Sincronizar o estado interno com as mudanças externas dos filtros
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const updateFilter = (key: keyof AdvancedFiltersData, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApplyFilters = () => {
    // Remove empty values
    const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key as keyof AdvancedFiltersData] = value;
      }
      return acc;
    }, {} as AdvancedFiltersData);

    onApplyFilters(cleanFilters);
    onClose();
  };

  const handleClearFilters = () => {
    setFilters({});
    onClearFilters();
    onClose();
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderSectionWithIcon = (iconName: string, title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <View style={styles.sectionTitleContainer}>
        <Ionicons name={iconName as any} size={20} color="#3B82F6" />
        <Text style={styles.sectionTitleText}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const renderSelectField = (
    label: string,
    value: string | undefined,
    options: { value: string; label: string }[],
    onSelect: (value: string) => void
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                value === option.value && styles.optionButtonActive,
              ]}
              onPress={() => onSelect(option.value)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  value === option.value && styles.optionButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
          <Text style={styles.title}>Filtros Avançados</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Date Filters */}
          {renderSectionWithIcon(
            'calendar-outline',
            'Filtros de Data',
            <View>
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Data de Vencimento - De:</Text>
                  <DatePicker
                    value={filters.due_date_from || ''}
                    onDateChange={(date) => updateFilter('due_date_from', date)}
                    placeholder="Selecionar data"
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Até:</Text>
                  <DatePicker
                    value={filters.due_date_to || ''}
                    onDateChange={(date) => updateFilter('due_date_to', date)}
                    placeholder="Selecionar data"
                  />
                </View>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Data de Pagamento - De:</Text>
                  <DatePicker
                    value={filters.paid_date_from || ''}
                    onDateChange={(date) => updateFilter('paid_date_from', date)}
                    placeholder="Selecionar data"
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Até:</Text>
                  <DatePicker
                    value={filters.paid_date_to || ''}
                    onDateChange={(date) => updateFilter('paid_date_to', date)}
                    placeholder="Selecionar data"
                  />
                </View>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Data de Criação - De:</Text>
                  <DatePicker
                    value={filters.created_at_from || ''}
                    onDateChange={(date) => updateFilter('created_at_from', date)}
                    placeholder="Selecionar data"
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Até:</Text>
                  <DatePicker
                    value={filters.created_at_to || ''}
                    onDateChange={(date) => updateFilter('created_at_to', date)}
                    placeholder="Selecionar data"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Amount Filters */}
          {renderSectionWithIcon(
            'cash-outline',
            'Filtros de Valor',
            <View style={styles.amountRow}>
              <View style={styles.amountField}>
                <Input
                  label="Valor - De:"
                  value={filters.amount_from || ''}
                  onChangeText={(text) => updateFilter('amount_from', text)}
                  placeholder="0,00"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.amountField}>
                <Input
                  label="Até:"
                  value={filters.amount_to || ''}
                  onChangeText={(text) => updateFilter('amount_to', text)}
                  placeholder="0,00"
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {/* Payment Method and Type */}
          {renderSectionWithIcon(
            'card-outline',
            'Método e Tipo de Pagamento',
            <View>
              {renderSelectField(
                'Método de Pagamento',
                filters.payment_method,
                paymentMethods,
                (value) => updateFilter('payment_method', value || undefined)
              )}
              {renderSelectField(
                'Tipo de Pagamento',
                filters.payment_type,
                paymentTypes,
                (value) => updateFilter('payment_type', value || undefined)
              )}
            </View>
          )}

          {/* Contract Filters */}
          {renderSectionWithIcon(
            'document-text-outline',
            'Filtros de Contrato',
            <View>
              <Input
                label="Número do Contrato"
                value={filters.contract_number || ''}
                onChangeText={(text) => updateFilter('contract_number', text || undefined)}
                placeholder="Digite o número do contrato"
              />
              {renderSelectField(
                'Status do Contrato',
                filters.contract_status,
                contractStatuses,
                (value) => updateFilter('contract_status', value || undefined)
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
                onChangeText={(text) => updateFilter('client_name', text || undefined)}
                placeholder="Digite o nome do cliente"
              />
              <Input
                label="E-mail do Cliente"
                value={filters.client_email || ''}
                onChangeText={(text) => updateFilter('client_email', text || undefined)}
                placeholder="Digite o e-mail do cliente"
                keyboardType="email-address"
              />
              <Input
                label="Telefone do Cliente"
                value={filters.client_phone || ''}
                onChangeText={(text) => updateFilter('client_phone', text || undefined)}
                placeholder="Digite o telefone do cliente"
                keyboardType="phone-pad"
              />
              <Input
                  label="NIF do Cliente"
                  value={filters.client_tax_id || ''}
                  onChangeText={(text) => updateFilter('client_tax_id', text || undefined)}
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
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: 12,
    marginBottom: 16,
  },
  dateField: {
    flex: 1,
  },
  amountRow: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: 12,
  },
  amountField: {
    flex: 1,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  optionButtonTextActive: {
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
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
});

export default AdvancedFilters;