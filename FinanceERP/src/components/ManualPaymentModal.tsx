import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from './common/Modal';
import { formatCurrency } from '../utils/currency';
import { formatNumberInput } from '../utils/numberFormat';

interface ManualPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  payment: {
    id: string;
    amount: number;
    due_date: string;
    status?: string;
    contract_id: string;
    paid_amount?: number;
  } | null;
  contractPositiveBalance?: number;
  contractNegativeBalance?: number;
  onConfirm: (paymentAmount: number, usePositiveBalance?: number, paymentMethod?: string) => Promise<void>;
}

export const ManualPaymentModal: React.FC<ManualPaymentModalProps> = ({
  visible,
  onClose,
  payment,
  contractPositiveBalance = 0,
  contractNegativeBalance = 0,
  onConfirm
}) => {
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [usePositiveBalance, setUsePositiveBalance] = useState<string>('0');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment method options - same as PaymentForm
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

  // Reset form when modal opens - MUST be called before any early returns
  useEffect(() => {
    if (visible) {
      console.log('🔍 Modal ficou visível, resetando form');
      setPaymentAmount('');
      setUsePositiveBalance('0');
      setSelectedPaymentMethod('');
    }
  }, [visible]);

  console.log('🔍 ManualPaymentModal renderizado:', { 
    visible, 
    payment: payment?.id, 
    paymentData: payment,
    hasPayment: !!payment 
  });

  // Early return if modal is not visible
  if (!visible) {
    return null;
  }

  // If modal is visible but payment is null, show loading or error state
  if (!payment) {
    console.log('🔍 Modal visível mas payment é null, mostrando estado de carregamento');
    return (
      <Modal
        visible={visible}
        onClose={onClose}
        title="Pagamento Manual"
        width="90%"
      >
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Carregando informações do pagamento...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  console.log('🔍 ManualPaymentModal vai renderizar Modal com:', { visible, title: 'Pagamento Manual' });

  const handleSubmit = async () => {
    // Validate payment amount first
    if (!paymentAmount || paymentAmount.trim() === '') {
      Alert.alert('Erro', 'Por favor, insira um valor para o pagamento');
      return;
    }
    
    const amount = parseFloat(paymentAmount);
    const positiveBalanceToUse = parseFloat(usePositiveBalance) || 0;
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erro', 'Por favor, insira um valor válido maior que zero');
      return;
    }

    if (!selectedPaymentMethod) {
      Alert.alert('Erro', 'Por favor, selecione um método de pagamento');
      return;
    }

    if (positiveBalanceToUse < 0) {
      Alert.alert('Erro', 'O valor do saldo positivo não pode ser negativo');
      return;
    }

    if (positiveBalanceToUse > contractPositiveBalance) {
      Alert.alert('Erro', `Saldo positivo insuficiente. Disponível: ${formatCurrency(contractPositiveBalance)}`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(amount, positiveBalanceToUse, selectedPaymentMethod);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao processar pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setPaymentAmount(amount.toString());
  };

  const paidAmount = payment.paid_amount || 0;
  const remainingAmount = payment.amount - paidAmount;
  const inputAmount = parseFloat(paymentAmount) || 0;
  const positiveBalanceToUse = parseFloat(usePositiveBalance) || 0;
  
  // Calcular valor final da parcela após aplicar saldo positivo
  const finalInstallmentValue = Math.max(0, remainingAmount - positiveBalanceToUse);
  
  // Calcular excesso se o valor pago for maior que o valor final
  const excessAmount = inputAmount > finalInstallmentValue ? inputAmount - finalInstallmentValue : 0;

  // Calcular quanto do excesso será usado para abater o saldo devedor
  const negativeBalanceAbatement = Math.min(excessAmount, contractNegativeBalance);
  const finalExcessAmount = excessAmount - negativeBalanceAbatement;

  console.log('🔍 Modal vai renderizar com visible:', visible);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Pagamento Manual"
      width="90%"
    >
      <View style={styles.container}>
        {/* Informações do Pagamento */}
        <View style={styles.paymentInfo}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color="#333" />
            <Text style={styles.sectionTitle}>Informações do Pagamento</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="cash-outline" size={16} color="#007AFF" />
              <Text style={styles.infoLabel}>Valor Original:</Text>
            </View>
            <Text style={[styles.infoValue, styles.originalAmount]}>
              {formatCurrency(payment.amount)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="calendar-outline" size={16} color="#007AFF" />
              <Text style={styles.infoLabel}>Data de Vencimento:</Text>
            </View>
            <Text style={styles.infoValue}>
              {new Date(payment.due_date).toLocaleDateString('pt-BR')}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="stats-chart-outline" size={16} color="#007AFF" />
              <Text style={styles.infoLabel}>Status:</Text>
            </View>
            <View style={[styles.statusBadge, getStatusStyle(payment.status || 'pending')]}>
              <Text style={styles.statusText}>{getStatusLabel(payment.status || 'pending')}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
              <Text style={styles.infoLabel}>Valor Pago:</Text>
            </View>
            <Text style={[styles.infoValue, styles.paidAmount]}>
              {formatCurrency(paidAmount)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="time-outline" size={14} color="#dc2626" />
              <Text style={styles.infoLabel}>Valor Restante:</Text>
            </View>
            <Text style={[styles.infoValue, styles.remainingAmount]}>
              {formatCurrency(remainingAmount)}
            </Text>
          </View>

          {/* Saldo Positivo do Contrato */}
          {contractPositiveBalance > 0 && (
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="wallet-outline" size={14} color="#059669" />
                <Text style={styles.infoLabel}>Saldo Positivo Disponível:</Text>
              </View>
              <Text style={[styles.infoValue, { color: '#059669', fontWeight: '600' }]}>
                {formatCurrency(contractPositiveBalance)}
              </Text>
            </View>
          )}

          {/* Saldo Negativo do Contrato */}
          {contractNegativeBalance > 0 && (
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="warning-outline" size={14} color="#dc2626" />
                <Text style={styles.infoLabel}>Saldo Negativo:</Text>
              </View>
              <Text style={[styles.infoValue, { color: '#dc2626', fontWeight: '600' }]}>
                -{formatCurrency(contractNegativeBalance)}
              </Text>
            </View>
          )}

          {/* Valor Final da Parcela (após aplicar saldo positivo) */}
          {positiveBalanceToUse > 0 && (
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="calculator-outline" size={14} color="#3B82F6" />
                <Text style={styles.infoLabel}>Valor Final da Parcela:</Text>
              </View>
              <Text style={[styles.infoValue, { color: '#3B82F6', fontWeight: '600' }]}>
                {formatCurrency(finalInstallmentValue)}
              </Text>
            </View>
          )}
        </View>

        {/* Input de Valor com Design Melhorado */}
        <View style={styles.inputSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={18} color="#007AFF" />
            <Text style={styles.sectionTitle}>Valor a Pagar</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>€</Text>
            <TextInput
              value={paymentAmount}
              onChangeText={(text) => setPaymentAmount(formatNumberInput(text, 2))}
              placeholder="0.00"
              keyboardType="decimal-pad"
              style={styles.enhancedInput}
            />
          </View>
          
          {/* Campo para Uso do Saldo Positivo */}
          {contractPositiveBalance > 0 && (
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>€</Text>
              <TextInput
                value={usePositiveBalance}
                onChangeText={(text) => setUsePositiveBalance(formatNumberInput(text, 2))}
                placeholder="0.00"
                keyboardType="decimal-pad"
                style={styles.enhancedInput}
              />
              <Text style={styles.balanceLabel}>do saldo positivo</Text>
            </View>
          )}
          
          {/* Botões de Valor Rápido */}
          <View style={styles.quickAmountButtons}>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => handleQuickAmount(finalInstallmentValue)}
            >
              <View style={styles.quickButtonContent}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#3B82F6" />
                <Text style={styles.quickButtonText}>
                  Final: {formatCurrency(finalInstallmentValue)}
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => handleQuickAmount(payment.amount)}
            >
              <View style={styles.quickButtonContent}>
                <Ionicons name="radio-button-on-outline" size={14} color="#3B82F6" />
                <Text style={styles.quickButtonText}>
                  Original: {formatCurrency(payment.amount)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seção de Método de Pagamento */}
        <View style={styles.inputSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={18} color="#007AFF" />
            <Text style={styles.sectionTitle}>Método de Pagamento</Text>
          </View>
          
          <View style={styles.paymentMethodContainer}>
            {paymentMethodOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.paymentMethodOption,
                  selectedPaymentMethod === option.value && styles.paymentMethodOptionSelected
                ]}
                onPress={() => setSelectedPaymentMethod(option.value)}
              >
                <Text style={[
                  styles.paymentMethodOptionText,
                  selectedPaymentMethod === option.value && styles.paymentMethodOptionTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Informações de Cálculo com Melhor Visualização */}
        {inputAmount > 0 && (
          <View style={styles.calculationInfo}>
            <View style={styles.sectionHeader}>
              <Ionicons name="analytics-outline" size={18} color="#1e40af" />
              <Text style={styles.calculationTitle}>Resumo do Pagamento</Text>
            </View>
            
            <View style={styles.calculationRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="trending-down-outline" size={14} color="#007AFF" />
                <Text style={styles.calculationLabel}>Valor a Pagar:</Text>
              </View>
              <Text style={[styles.calculationValue, styles.paymentValue]}>
                {formatCurrency(inputAmount)}
              </Text>
            </View>

            {/* Mostrar uso do saldo positivo */}
            {positiveBalanceToUse > 0 && (
              <View style={[styles.calculationRow, { backgroundColor: '#e8f5e8', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, marginVertical: 5 }]}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="wallet-outline" size={14} color="#059669" />
                  <Text style={[styles.calculationLabel, { color: '#059669' }]}>
                    Saldo Utilizado:
                  </Text>
                </View>
                <Text style={[styles.calculationValue, { color: '#059669' }]}>
                  -{formatCurrency(positiveBalanceToUse)}
                </Text>
              </View>
            )}
            
            {negativeBalanceAbatement > 0 && (
              <View style={[styles.calculationRow, { backgroundColor: '#fff3cd', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, marginVertical: 5 }]}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="trending-up-outline" size={14} color="#856404" />
                  <Text style={[styles.calculationLabel, { color: '#856404' }]}>
                    Abatimento do Saldo Devedor:
                  </Text>
                </View>
                <Text style={[styles.calculationValue, { color: '#856404', fontWeight: '700' }]}>
                  -{formatCurrency(negativeBalanceAbatement)}
                </Text>
              </View>
            )}
            
            {finalExcessAmount > 0 && (
              <View style={[styles.calculationRow, styles.excessRow]}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="trophy-outline" size={14} color="#059669" />
                  <Text style={[styles.calculationLabel, styles.excessLabel]}>
                    Novo Saldo Positivo:
                  </Text>
                </View>
                <Text style={[styles.calculationValue, styles.excessValue]}>
                  +{formatCurrency(finalExcessAmount)}
                </Text>
              </View>
            )}
            
            <View style={styles.calculationRow}>
              <Text style={[styles.calculationLabel, styles.remainingLabel]}>
                <Ionicons 
                  name="trending-down-outline" 
                  size={14} 
                  color="#dc2626" 
                />
                {' '}Valor Restante da Parcela:
              </Text>
              <Text style={[styles.calculationValue, styles.newRemainingValue]}>
                {formatCurrency(Math.max(0, finalInstallmentValue - inputAmount))}
              </Text>
            </View>

            {/* Mostrar informação sobre saldo devedor quando pagamento é parcial */}
            {inputAmount > 0 && inputAmount < finalInstallmentValue && (
              <View style={[styles.calculationRow, { backgroundColor: '#fef2f2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, marginVertical: 5 }]}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="warning-outline" size={14} color="#dc2626" />
                  <Text style={[styles.calculationLabel, { color: '#dc2626' }]}>
                    Será adicionado ao saldo devedor:
                  </Text>
                </View>
                <Text style={[styles.calculationValue, { color: '#dc2626', fontWeight: '700' }]}>
                  +{formatCurrency(finalInstallmentValue - inputAmount)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Botões de Ação com Design Melhorado */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButtonStyle}
            onPress={onClose}
          >
            <Ionicons name="close-outline" size={20} color="#fff" />
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.confirmButtonStyle,
              (!paymentAmount || isSubmitting) && { opacity: 0.5 }
            ]}
            onPress={handleSubmit}
            disabled={!paymentAmount || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Ionicons name="hourglass-outline" size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>Processando...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>Confirmar Pagamento</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'paid': return 'Pago';
    case 'pending': return 'Pendente';
    case 'overdue': return 'Atrasado';
    case 'failed': return 'Falhou';
    default: return status;
  }
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'paid':
      return { backgroundColor: '#10B981' };
    case 'pending':
      return { backgroundColor: '#F59E0B' };
    case 'overdue':
      return { backgroundColor: '#EF4444' };
    case 'failed':
      return { backgroundColor: '#6B7280' };
    default:
      return { backgroundColor: '#6B7280' };
  }
};

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  paymentInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  originalAmount: {
    color: '#007AFF',
    fontWeight: '700',
    fontSize: 16,
  },
  paidAmount: {
    color: '#10B981',
  },
  remainingAmount: {
    color: '#dc3545',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  inputSection: {
    gap: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginRight: 8,
  },
  enhancedInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 15,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '600',
  },
  quickAmountButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#E5F3FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  quickButtonText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  calculationInfo: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calculationLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  calculationValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  paymentValue: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '700',
  },
  excessRow: {
    backgroundColor: '#d4edda',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 5,
  },
  excessLabel: {
    color: '#059669',
  },
  excessValue: {
    color: '#059669',
  },
  remainingLabel: {
    color: '#dc2626',
  },
  remainingValue: {
    color: '#dc2626',
  },
  newRemainingValue: {
    color: '#dc3545',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButtonStyle: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonStyle: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 2,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  paymentMethodOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  paymentMethodOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  paymentMethodOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  paymentMethodOptionTextSelected: {
    color: '#FFFFFF',
  },
});