import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Payment, Contract } from '../../types';
import Input from '../common/Input';
import Button from '../common/Button';
import DatePicker from '../common/DatePicker';
import ApiService from '../../services/api';

interface PaymentFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  payment?: Payment | null;
  isLoading?: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  visible,
  onClose,
  onSubmit,
  payment,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    contract_id: '',
    amount: '',
    due_date: '',
    paid_date: '',
    status: 'pending',
    payment_method: '',
    notes: '',
    payment_type: 'normalPayment',
    paid_amount: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showContractPicker, setShowContractPicker] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  useEffect(() => {
    if (visible) {
      loadContracts();
    }
  }, [visible]);

  useEffect(() => {
    if (payment) {
      setFormData({
        contract_id: payment.contract_id || '',
        amount: payment.amount?.toString() || '',
        due_date: payment.due_date || '',
        paid_date: payment.paid_date || '',
        status: payment.status || 'pending',
        payment_method: payment.payment_method || '',
        notes: payment.notes || '',
        payment_type: payment.payment_type || 'normalPayment',
        paid_amount: payment.paid_amount?.toString() || '',
      });
      
      // Find and set selected contract
      if (payment.contract_id && contracts.length > 0) {
        const contract = contracts.find(c => c.id === payment.contract_id);
        setSelectedContract(contract || null);
      }
    } else {
      // Reset form for new payment
      setFormData({
        contract_id: '',
        amount: '',
        due_date: '',
        paid_date: '',
        status: 'pending',
        payment_method: '',
        notes: '',
        payment_type: 'normalPayment',
        paid_amount: '',
      });
      setSelectedContract(null);
    }
    setErrors({});
  }, [payment, visible, contracts]);

  const loadContracts = async () => {
    try {
      const response = await ApiService.getContracts();
      if (response.success && response.data) {
        setContracts(response.data);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
      Alert.alert('Erro', 'Não foi possível carregar os contratos');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.contract_id) {
      newErrors.contract_id = 'Contrato é obrigatório';
    }

    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Valor deve ser um número positivo';
    }

    if (!formData.due_date.trim()) {
      newErrors.due_date = 'Data de vencimento é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Função para converter data DD/MM/YYYY para YYYY-MM-DD
  const convertDateToISO = (dateString: string): string => {
    if (!dateString) return '';
    
    // Se já está no formato ISO (YYYY-MM-DD), retorna como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Se está no formato DD/MM/YYYY, converte para YYYY-MM-DD
    const match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month}-${day}`;
    }
    
    return dateString; // Retorna como está se não conseguir converter
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Erro', 'Por favor, corrija os erros no formulário');
      return;
    }

    try {
      const paymentData = {
        ...formData,
        amount: Number(formData.amount),
        due_date: convertDateToISO(formData.due_date), // Converte para formato ISO
        paid_date: formData.paid_date ? convertDateToISO(formData.paid_date) : undefined, // Converte para formato ISO se existir
        payment_type: formData.payment_type || undefined, // Convert empty string to undefined
        payment_method: formData.payment_method || undefined, // Convert empty string to undefined
        notes: formData.notes || undefined, // Convert empty string to undefined
        paid_amount: formData.paid_amount ? Number(formData.paid_amount) : undefined, // Convert to number if provided
      };

      await onSubmit(paymentData);
      onClose();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar pagamento');
    }
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleContractSelect = (contract: Contract) => {
    setSelectedContract(contract);
    updateField('contract_id', contract.id);
    setShowContractPicker(false);
  };

  const renderContractPicker = () => (
    <Modal
      visible={showContractPicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowContractPicker(false)}
    >
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Selecionar Contrato</Text>
          <TouchableOpacity onPress={() => setShowContractPicker(false)}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.pickerList}>
          {contracts.map((contract) => (
            <TouchableOpacity
              key={contract.id}
              style={styles.contractItem}
              onPress={() => handleContractSelect(contract)}
            >
              <Text style={styles.contractNumber}>
                {contract.contract_number || 'N/A'}
              </Text>
              <Text style={styles.contractDescription}>
                {contract.description}
              </Text>
              {contract.client && (
                <Text style={styles.contractClient}>
                  Cliente: {contract.client.first_name} {contract.client.last_name}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const statusOptions = [
    { value: 'pending', label: 'Pendente' },
    { value: 'paid', label: 'Pago' },
    { value: 'overdue', label: 'Atrasado' },
    { value: 'failed', label: 'Falhou' },
  ];

  const paymentTypeOptions = [
    { value: 'normalPayment', label: 'Pagamento Normal' },
    { value: 'downPayment', label: 'Entrada' },
  ];

  const paymentMethodOptions = [
    { value: 'DD', label: 'DD' },
    { value: 'TRF', label: 'Transferência' },
    { value: 'Stripe', label: 'Stripe' },
    { value: 'PP', label: 'PP' },
    { value: 'Receção', label: 'Receção' },
    { value: 'TRF ou RECEÇÃO', label: 'TRF ou Receção' },
    { value: 'TRF - OP', label: 'TRF - OP' },
    { value: 'bank_transfer', label: 'Transferência Bancária' },
    { value: 'Cheque', label: 'Cheque' },
    { value: 'Cheque/Misto', label: 'Cheque/Misto' },
    { value: 'Aditamento', label: 'Aditamento' },
    { value: 'DD + TB', label: 'DD + TB' },
    { value: 'Ordenado', label: 'Ordenado' },
    { value: 'Numerário', label: 'Numerário' },
    { value: 'MB Way', label: 'MB Way' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {payment ? 'Editar Pagamento' : 'Novo Pagamento'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informações Básicas</Text>
              
              <View>
                <Text style={styles.inputLabel}>Contrato *</Text>
                <TouchableOpacity
                  style={[styles.contractSelector, errors.contract_id && styles.inputError]}
                  onPress={() => setShowContractPicker(true)}
                >
                  <Text style={[
                    styles.contractSelectorText,
                    !selectedContract && styles.placeholderText
                  ]}>
                    {selectedContract 
                      ? `${selectedContract.contract_number || 'N/A'} - ${selectedContract.description}`
                      : 'Selecione um contrato'
                    }
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>
                {errors.contract_id && (
                  <Text style={styles.errorText}>{errors.contract_id}</Text>
                )}
              </View>

              <Input
                label="Valor *"
                value={formData.amount}
                onChangeText={(value) => updateField('amount', value)}
                error={errors.amount}
                placeholder="0,00"
                keyboardType="numeric"
              />

              <DatePicker
                label="Data de Vencimento *"
                value={formData.due_date}
                onDateChange={(value) => updateField('due_date', value)}
                error={errors.due_date}
                placeholder="DD/MM/AAAA"
                mode="date"
              />

              <DatePicker
                label="Data de Pagamento"
                value={formData.paid_date}
                onDateChange={(value) => updateField('paid_date', value)}
                placeholder="DD/MM/AAAA"
                mode="date"
              />

              <Input
                label="Valor Pago"
                value={formData.paid_amount}
                onChangeText={(value) => updateField('paid_amount', value)}
                placeholder="0,00"
                keyboardType="numeric"
                editable={formData.status !== 'pending'}
                style={formData.status === 'pending' ? styles.disabledInput : undefined}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detalhes do Pagamento</Text>
              
              <View>
                <Text style={styles.inputLabel}>Status</Text>
                <View style={styles.statusContainer}>
                  {statusOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusOption,
                        formData.status === option.value && styles.statusOptionSelected
                      ]}
                      onPress={() => updateField('status', option.value)}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        formData.status === option.value && styles.statusOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>Método de Pagamento</Text>
                <View style={styles.statusContainer}>
                  {paymentMethodOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusOption,
                        formData.payment_method === option.value && styles.statusOptionSelected
                      ]}
                      onPress={() => updateField('payment_method', option.value)}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        formData.payment_method === option.value && styles.statusOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>Tipo de Pagamento</Text>
                <View style={styles.statusContainer}>
                  {paymentTypeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusOption,
                        formData.payment_type === option.value && styles.statusOptionSelected
                      ]}
                      onPress={() => updateField('payment_type', option.value)}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        formData.payment_type === option.value && styles.statusOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Observações</Text>
              
              <Input
                label="Observações"
                placeholder="Introduza observações adicionais"
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                multiline
                numberOfLines={3}
                error={errors.notes}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Cancelar"
            onPress={onClose}
            variant="secondary"
            style={styles.cancelButton}
          />
          <Button
            title={payment ? 'Actualizar' : 'Criar Pagamento'}
            onPress={handleSubmit}
            disabled={isLoading}
            style={styles.submitButton}
          />
        </View>
      </View>

      {renderContractPicker()}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  contractSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  contractSelectorText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  statusOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  statusOptionTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  // Contract picker styles
  pickerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  pickerList: {
    flex: 1,
  },
  contractItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contractNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contractDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  contractClient: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  disabledInput: {
    backgroundColor: '#F9FAFB',
    color: '#9CA3AF',
    opacity: 0.6,
  },
});

export default PaymentForm;