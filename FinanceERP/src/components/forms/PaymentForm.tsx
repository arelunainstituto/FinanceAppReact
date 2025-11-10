import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Payment, Contract } from '../../types';
import Input from '../common/Input';
import NumericInput from '../common/NumericInput';
import Button from '../common/Button';
import DatePicker from '../common/DatePicker';
import ApiService from '../../services/api';
import {
  convertDateFromApiFormat,
  convertDateToApiFormat,
} from '../../utils/dateFormatUtils';
import { PAYMENT_METHODS } from '../../constants/paymentMethods';

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
  const [contractBalances, setContractBalances] = useState<{
    positive_balance: number;
    negative_balance: number;
  } | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);

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
        due_date: convertDateFromApiFormat(payment.due_date || ''),
        paid_date: convertDateFromApiFormat(payment.paid_date || ''),
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
        
        // Load contract balances for edit mode
        if (contract) {
          loadContractBalances(contract.id);
        }
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
      setContractBalances(null);
    }
    setErrors({});
  }, [payment, visible, contracts]);

  // Quando selecionar um contrato, usar o método de pagamento do contrato
  useEffect(() => {
    if (selectedContract && !payment) {
      // Se está criando um novo pagamento (sem payment object), usar o método do contrato
      const contractPaymentMethod = (selectedContract as any).payment_method || '';
      setFormData(prev => ({
        ...prev,
        payment_method: contractPaymentMethod,
      }));
    }
  }, [selectedContract, payment]);

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

  const loadContractBalances = async (contractId: string) => {
    if (!contractId) {
      setContractBalances(null);
      return;
    }

    setLoadingBalances(true);
    try {
      const response = await ApiService.getContractBalances(contractId);
      if (response.success && response.data) {
        setContractBalances(response.data);
      } else {
        setContractBalances(null);
      }
    } catch (error) {
      console.error('Error loading contract balances:', error);
      setContractBalances(null);
    } finally {
      setLoadingBalances(false);
    }
  };

  const handleContractSelect = async (contract: Contract) => {
    setSelectedContract(contract);
    updateField('contract_id', contract.id);
    setShowContractPicker(false);
    
    // Buscar saldos do contrato selecionado
    await loadContractBalances(contract.id);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Automatic status update logic
      if (field === 'paid_amount') {
        const paidAmount = Number(value);
        const totalAmount = Number(newData.amount);
        
        // If paid amount equals total amount, automatically set status to 'paid'
        if (paidAmount > 0 && paidAmount === totalAmount) {
          newData.status = 'paid';
          // Also set paid_date to today if not already set
          if (!newData.paid_date) {
            const today = new Date();
            const day = today.getDate().toString().padStart(2, '0');
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const year = today.getFullYear();
            newData.paid_date = `${day}/${month}/${year}`;
          }
        }
        // If paid amount is less than total amount and greater than 0, set to 'partial'
        else if (paidAmount > 0 && paidAmount < totalAmount) {
          newData.status = 'partial';
        }
        // If paid amount is 0 or empty, set back to 'pending'
        else if (paidAmount === 0 || !value) {
          newData.status = 'pending';
          newData.paid_date = '';
        }
      }
      
      // If status is changed to 'pending' or 'renegociado', clear paid_date and paid_amount
      if (field === 'status' && (value === 'pending' || value === 'renegociado')) {
        newData.paid_date = '';
        newData.paid_amount = '';
      }
      
      return newData;
    });
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.contract_id) {
      newErrors.contract_id = 'Contrato é obrigatório';
    }

    if (!formData.amount) {
      newErrors.amount = 'Valor é obrigatório';
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Valor deve ser um número positivo';
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Data de vencimento é obrigatória';
    } else if (!convertDateToApiFormat(formData.due_date)) {
      newErrors.due_date = 'Data de vencimento inválida';
    }

    if (formData.paid_date) {
      const convertedPaidDate = convertDateToApiFormat(formData.paid_date);
      if (!convertedPaidDate) {
        newErrors.paid_date = 'Data de pagamento inválida';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    console.log('🔍 [PaymentForm] Form data before conversion:', formData);

    const dueDateForApi = convertDateToApiFormat(formData.due_date);
    const paidDateForApi = formData.paid_date
      ? convertDateToApiFormat(formData.paid_date)
      : '';

    console.log('🔍 [PaymentForm] Due date conversion:', {
      original: formData.due_date,
      converted: dueDateForApi
    });

    if (!dueDateForApi) {
      setErrors(prev => ({
        ...prev,
        due_date: 'Data de vencimento inválida',
      }));
      return;
    }

    // Importante: Sempre enviar todos os campos, mesmo os vazios, para garantir que a atualização funcione
    const paymentData: any = {
      contract_id: formData.contract_id,
      amount: Number(formData.amount),
      due_date: dueDateForApi,
      status: formData.status as 'pending' | 'paid' | 'overdue' | 'partial' | 'renegociado',
      payment_type: formData.payment_type as 'normalPayment' | 'manualPayment',
    };

    // Adicionar campos opcionais apenas se tiverem valor
    if (paidDateForApi) {
      paymentData.paid_date = paidDateForApi;
    }

    if (formData.payment_method) {
      paymentData.payment_method = formData.payment_method;
    }

    if (formData.notes) {
      paymentData.notes = formData.notes;
    }

    if (formData.paid_amount) {
      paymentData.paid_amount = Number(formData.paid_amount);
    }

    console.log('🔍 [PaymentForm] Payment data to be submitted:', paymentData);
    console.log('🔍 [PaymentForm] Checking due_date field:', {
      exists: 'due_date' in paymentData,
      value: paymentData.due_date,
      type: typeof paymentData.due_date,
      allKeys: Object.keys(paymentData)
    });

    // CRITICAL: Verificação final antes de enviar
    if (!paymentData.due_date) {
      console.error('❌ [PaymentForm] ERRO CRÍTICO: due_date está vazio antes de enviar!');
      Alert.alert('Erro', 'Data de vencimento não foi definida corretamente');
      return;
    }

    await onSubmit(paymentData);
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
    { value: 'overdue', label: 'Vencido' },
    { value: 'partial', label: 'Parcial' },
    { value: 'renegociado', label: 'Renegociado' },
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
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
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

              {/* Exibição dos saldos do contrato */}
              {selectedContract && (
                <View style={styles.balancesContainer}>
                  <Text style={styles.balancesTitle}>Saldos do Contrato</Text>
                  {loadingBalances ? (
                    <Text style={styles.loadingText}>Carregando saldos...</Text>
                  ) : contractBalances ? (
                    <View style={styles.balancesRow}>
                      <View style={styles.balanceItem}>
                        <Text style={styles.balanceLabel}>Saldo Positivo</Text>
                        <Text style={[styles.balanceValue, styles.positiveBalance]}>
                          R$ {contractBalances.positive_balance.toLocaleString('pt-BR', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </Text>
                      </View>
                      <View style={styles.balanceItem}>
                        <Text style={styles.balanceLabel}>Saldo Devedor</Text>
                        <Text style={[styles.balanceValue, styles.negativeBalance]}>
                          R$ {contractBalances.negative_balance.toLocaleString('pt-BR', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.errorText}>Não foi possível carregar os saldos</Text>
                  )}
                </View>
              )}

              <NumericInput
                label="Valor *"
                value={formData.amount}
                onChangeText={(value) => updateField('amount', value)}
                error={errors.amount}
                placeholder="0.00"
                maxDecimalPlaces={2}
              />

              <DatePicker
                label="Data de Vencimento *"
                value={formData.due_date}
                onDateChange={(value) => updateField('due_date', value)}
                error={errors.due_date}
                placeholder="DD/MM/AAAA"
              />

              <DatePicker
                label="Data de Pagamento"
                value={formData.paid_date}
                onDateChange={(value) => updateField('paid_date', value)}
                placeholder="DD/MM/AAAA"
        error={errors.paid_date}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status e Detalhes</Text>
              
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

              {/* Método de Pagamento */}
              <View>
                <Text style={styles.inputLabel}>Método de Pagamento</Text>
                <View style={styles.paymentMethodContainer}>
                  {PAYMENT_METHODS.map((option) => {
                    const isSelected = formData.payment_method?.toLowerCase() === option.value.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.paymentMethodOption,
                          isSelected && styles.paymentMethodOptionSelected,
                        ]}
                        onPress={() => updateField('payment_method', option.value)}
                      >
                        {option.isCustomImage ? (
                          <Image
                            source={option.icon as any}
                            resizeMode="contain"
                            style={styles.paymentMethodIcon}
                          />
                        ) : (
                          <Ionicons 
                            name={option.icon as any} 
                            size={18} 
                            color={isSelected ? '#FFFFFF' : '#64748B'} 
                          />
                        )}
                        <Text
                          style={[
                            styles.paymentMethodText,
                            isSelected && styles.paymentMethodTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <NumericInput
                label="Valor Pago"
                value={formData.paid_amount}
                onChangeText={(value) => updateField('paid_amount', value)}
                placeholder="0.00"
                maxDecimalPlaces={2}
                editable={formData.status !== 'pending' && formData.status !== 'renegociado'}
                style={(formData.status === 'pending' || formData.status === 'renegociado') ? styles.disabledInput : undefined}
              />

              <Input
                label="Observações"
                value={formData.notes}
                onChangeText={(value) => updateField('notes', value)}
                placeholder="Observações adicionais"
                multiline
                numberOfLines={3}
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
            title={payment ? 'Salvar' : 'Criar'}
            onPress={handleSubmit}
            disabled={isLoading}
            style={styles.submitButton}
          />
        </View>

        {renderContractPicker()}
      </View>
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
  balancesContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  balancesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  balancesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  positiveBalance: {
    color: '#059669',
  },
  negativeBalance: {
    color: '#DC2626',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  paymentMethodContainer: {
    gap: 8,
    marginBottom: 16,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  paymentMethodOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  paymentMethodTextSelected: {
    color: '#FFFFFF',
  },
  paymentMethodIcon: {
    width: 18,
    height: 18,
  },
});

export default PaymentForm;