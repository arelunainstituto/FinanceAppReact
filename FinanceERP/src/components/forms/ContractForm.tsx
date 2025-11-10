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
import { Contract, Client } from '../../types';
import Input from '../common/Input';
import NumericInput from '../common/NumericInput';
import Button from '../common/Button';
import DatePicker from '../common/DatePicker';
import ApiService from '../../services/api';
import { PAYMENT_METHODS } from '../../constants/paymentMethods';

interface ContractFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (contract: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  contract?: Contract | null;
  isLoading?: boolean;
}

const ContractForm: React.FC<ContractFormProps> = ({
  visible,
  onClose,
  onSubmit,
  contract,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    client_id: '',
    contract_number: '',
    description: '',
    local: '',
    area: '',
    gestora: '',
    medico: '',
    value: '',
    start_date: '',
    end_date: '',
    status: 'ativo',
    payment_frequency: '',
    notes: '',
    down_payment: '',
    number_of_payments: '',
    payment_method: 'DD', // Método padrão
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Calcular prévia do valor da parcela
  const calculateInstallmentPreview = (): { 
    installmentValue: number; 
    hasVariation: boolean;
    minValue: number;
    maxValue: number;
  } | null => {
    const totalValue = parseFloat(formData.value) || 0;
    const downPayment = parseFloat(formData.down_payment) || 0;
    const numberOfPayments = parseInt(formData.number_of_payments) || 0;

    if (totalValue <= 0 || numberOfPayments <= 0) {
      return null;
    }

    const remainingValue = totalValue - downPayment;
    if (remainingValue <= 0) {
      return null;
    }

    // Simular o algoritmo do backend (em centavos)
    const totalCents = Math.round(remainingValue * 100);
    const baseInstallmentCents = Math.floor(totalCents / numberOfPayments);
    const remainderCents = totalCents - (baseInstallmentCents * numberOfPayments);

    const minValue = baseInstallmentCents / 100;
    const maxValue = (baseInstallmentCents + 1) / 100;
    const hasVariation = remainderCents > 0;

    return {
      installmentValue: minValue,
      hasVariation,
      minValue,
      maxValue
    };
  };

  const installmentPreview = calculateInstallmentPreview();

  // Opções de status para contratos
  const statusOptions = [
    { value: 'ativo', label: 'Ativo' },
    { value: 'liquidado', label: 'Liquidado' },
    { value: 'renegociado', label: 'Renegociado' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'jurídico', label: 'Jurídico' },
  ];

  // Opções de método de pagamento
  const paymentMethodOptions = PAYMENT_METHODS;

  useEffect(() => {
    if (visible) {
      loadClients();
    }
  }, [visible]);

  useEffect(() => {
    if (contract) {
      setFormData({
        client_id: contract.client_id || '',
        contract_number: contract.contract_number || '',
        description: contract.description || '',
        local: contract.local || '',
        area: contract.area || '',
        gestora: contract.gestora || '',
        medico: contract.medico || '',
        value: contract.value?.toString() || '',
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        status: contract.status || 'ativo',
        payment_frequency: contract.payment_frequency || '',
        notes: contract.notes || '',
        down_payment: contract.down_payment?.toString() || '',
        number_of_payments: contract.number_of_payments?.toString() || '',
        payment_method: 'DD',
      });
      
      // Find and set selected client
      if (contract.client_id && clients.length > 0) {
        const client = clients.find(c => c.id === contract.client_id);
        setSelectedClient(client || null);
      }
    } else {
      // Reset form for new contract
      setFormData({
        client_id: '',
        contract_number: '',
        description: '',
        local: '',
        area: '',
        gestora: '',
        medico: '',
        value: '',
        start_date: '',
        end_date: '',
        status: 'ativo',
        payment_frequency: '',
        notes: '',
        down_payment: '',
        number_of_payments: '',
        payment_method: 'DD',
      });
      setSelectedClient(null);
    }
    setErrors({});
  }, [contract, visible, clients]);

  const loadClients = async () => {
    try {
      const response = await ApiService.getClients();
      if (response.success && response.data) {
        setClients(response.data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      Alert.alert('Erro', 'Não foi possível carregar os clientes');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_id) {
      newErrors.client_id = 'Cliente é obrigatório';
    }

    if (!formData.local.trim()) {
      newErrors.local = 'Local é obrigatório';
    }

    if (!formData.area.trim()) {
      newErrors.area = 'Área é obrigatória';
    }

    if (!formData.gestora.trim()) {
      newErrors.gestora = 'Gestor(a) é obrigatório(a)';
    }

    if (!formData.medico.trim()) {
      newErrors.medico = 'Médico(a) é obrigatório(a)';
    }

    if (!formData.value || isNaN(Number(formData.value)) || Number(formData.value) <= 0) {
      newErrors.value = 'Valor deve ser um número positivo';
    }

    if (!formData.start_date.trim()) {
      newErrors.start_date = 'Data de início é obrigatória';
    }

    if (formData.down_payment && (isNaN(Number(formData.down_payment)) || Number(formData.down_payment) < 0)) {
      newErrors.down_payment = 'Entrada deve ser um número positivo';
    }

    if (formData.number_of_payments && (isNaN(Number(formData.number_of_payments)) || Number(formData.number_of_payments) <= 0)) {
      newErrors.number_of_payments = 'Número de parcelas deve ser um número positivo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Erro', 'Por favor, corrija os erros no formulário');
      return;
    }

    try {
      const contractData = {
        ...formData,
        value: Number(formData.value),
        down_payment: formData.down_payment ? Number(formData.down_payment) : undefined,
        number_of_payments: formData.number_of_payments ? Number(formData.number_of_payments) : undefined,
      };

      await onSubmit(contractData);
      onClose();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar contrato');
    }
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Função para calcular automaticamente a data de fim do contrato
  const calculateEndDate = (startDate: string, numberOfPayments: string): string => {
    if (!startDate || !numberOfPayments) return '';
    
    const numPayments = parseInt(numberOfPayments);
    if (isNaN(numPayments) || numPayments <= 0) return '';
    
    try {
      // Parse da data de início (formato DD/MM/YYYY)
      const [day, month, year] = startDate.split('/');
      if (!day || !month || !year) return '';
      
      const startDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      // Adicionar o número de meses correspondente às parcelas
      const endDateObj = new Date(startDateObj);
      endDateObj.setMonth(startDateObj.getMonth() + numPayments);
      
      // Formatar a data de volta para DD/MM/YYYY
      const endDay = endDateObj.getDate().toString().padStart(2, '0');
      const endMonth = (endDateObj.getMonth() + 1).toString().padStart(2, '0');
      const endYear = endDateObj.getFullYear().toString();
      
      return `${endDay}/${endMonth}/${endYear}`;
    } catch (error) {
      console.error('Erro ao calcular data de fim:', error);
      return '';
    }
  };

  // Função personalizada para atualizar campos com cálculo automático da data de fim
  const updateFieldWithEndDateCalculation = (field: keyof typeof formData, value: string) => {
    const newFormData = { ...formData, [field]: value };
    
    // Se alterou data de início ou número de parcelas, recalcular data de fim
    if (field === 'start_date' || field === 'number_of_payments') {
      const startDate = field === 'start_date' ? value : formData.start_date;
      const numberOfPayments = field === 'number_of_payments' ? value : formData.number_of_payments;
      
      const calculatedEndDate = calculateEndDate(startDate, numberOfPayments);
      if (calculatedEndDate) {
        newFormData.end_date = calculatedEndDate;
      }
    }
    
    setFormData(newFormData);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    updateField('client_id', client.id);
    setShowClientPicker(false);
  };

  const renderClientPicker = () => (
    <Modal
      visible={showClientPicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowClientPicker(false)}
    >
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Selecionar Cliente</Text>
          <TouchableOpacity onPress={() => setShowClientPicker(false)}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.pickerList}>
          {clients.map((client) => (
            <TouchableOpacity
              key={client.id}
              style={styles.clientItem}
              onPress={() => handleClientSelect(client)}
            >
              <Text style={styles.clientName}>
                {client.first_name} {client.last_name}
              </Text>
              {client.email && (
                <Text style={styles.clientEmail}>{client.email}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
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
          <Text style={styles.title}>
            {contract ? 'Editar Contrato' : 'Novo Contrato'}
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
                <Text style={styles.inputLabel}>Cliente *</Text>
                <TouchableOpacity
                  style={[styles.clientSelector, errors.client_id && styles.inputError]}
                  onPress={() => setShowClientPicker(true)}
                >
                  <Text style={[
                    styles.clientSelectorText,
                    !selectedClient && styles.placeholderText
                  ]}>
                    {selectedClient 
                      ? `${selectedClient.first_name} ${selectedClient.last_name}`
                      : 'Selecione um cliente'
                    }
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>
                {errors.client_id && (
                  <Text style={styles.errorText}>{errors.client_id}</Text>
                )}
              </View>

              <Input
                label="Número do Contrato"
                value={formData.contract_number}
                onChangeText={(value) => updateField('contract_number', value)}
                placeholder="Digite o número do contrato"
              />

              <Input
                label="Local *"
                value={formData.local}
                onChangeText={(value) => updateField('local', value)}
                error={errors.local}
                placeholder="Digite o local do contrato"
              />

              <Input
                label="Área *"
                value={formData.area}
                onChangeText={(value) => updateField('area', value)}
                error={errors.area}
                placeholder="Digite a área do contrato"
              />

              <Input
              label="Gestor(a) *"
              value={formData.gestora}
              onChangeText={(value) => updateField('gestora', value)}
              error={errors.gestora}
              placeholder="Digite o gestor(a) do contrato"
            />

            <Input
              label="Médico(a) *"
              value={formData.medico}
              onChangeText={(value) => updateField('medico', value)}
              error={errors.medico}
              placeholder="Digite o médico(a) do contrato"
            />

              <Input
                label="Descrição"
                value={formData.description}
                onChangeText={(value) => updateField('description', value)}
                placeholder="Digite a descrição do contrato (opcional)"
                multiline
                numberOfLines={3}
              />

              <NumericInput
                label="Valor Total *"
                value={formData.value}
                onChangeText={(value) => updateField('value', value)}
                error={errors.value}
                placeholder="0.00"
                maxDecimalPlaces={2}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Datas</Text>
              
              <DatePicker
                label="Data de Início *"
                value={formData.start_date}
                onDateChange={(value) => updateFieldWithEndDateCalculation('start_date', value)}
                error={errors.start_date}
                placeholder="DD/MM/AAAA"
                mode="date"
              />

              <DatePicker
                label="Data de Término"
                value={formData.end_date}
                onDateChange={(value) => updateField('end_date', value)}
                placeholder="DD/MM/AAAA (calculada automaticamente)"
                mode="date"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pagamento</Text>
              
              <Input
                label="Frequência de Pagamento"
                value={formData.payment_frequency}
                onChangeText={(value) => updateField('payment_frequency', value)}
                placeholder="Ex: Mensal, Trimestral, etc."
              />

              <NumericInput
                label="Entrada"
                placeholder="0.00"
                value={formData.down_payment}
                onChangeText={(text) => setFormData({ ...formData, down_payment: text })}
                maxDecimalPlaces={2}
                error={errors.down_payment}
              />

              <NumericInput
                label="Número de Pagamentos"
                placeholder="Ex: 12"
                value={formData.number_of_payments}
                onChangeText={(text) => updateFieldWithEndDateCalculation('number_of_payments', text)}
                maxDecimalPlaces={0}
                error={errors.number_of_payments}
              />

              {/* Método de Pagamento das Parcelas - Apenas para novos contratos */}
              {!contract && (
                <View>
                  <Text style={styles.inputLabel}>Método de Pagamento das Parcelas</Text>
                  <View style={styles.paymentMethodContainer}>
                    {paymentMethodOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.paymentMethodOption,
                          formData.payment_method === option.value && styles.paymentMethodOptionSelected,
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
                            size={20} 
                            color={formData.payment_method === option.value ? '#FFFFFF' : '#64748B'} 
                          />
                        )}
                        <Text
                          style={[
                            styles.paymentMethodText,
                            formData.payment_method === option.value && styles.paymentMethodTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Prévia do Valor da Parcela - Apenas para novos contratos */}
              {!contract && installmentPreview && (
                <View style={styles.installmentPreview}>
                  <View style={styles.previewHeader}>
                    <Ionicons name="calculator-outline" size={20} color="#3B82F6" />
                    <Text style={styles.previewTitle}>Prévia do Valor da Parcela</Text>
                  </View>
                  
                  {!installmentPreview.hasVariation ? (
                    <View style={styles.previewContent}>
                      <Text style={styles.previewLabel}>Todas as parcelas:</Text>
                      <Text style={styles.previewValue}>
                        €{installmentPreview.installmentValue.toFixed(2)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.previewContent}>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Maioria das parcelas:</Text>
                        <Text style={styles.previewValue}>
                          €{installmentPreview.minValue.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Últimas parcelas:</Text>
                        <Text style={styles.previewValue}>
                          €{installmentPreview.maxValue.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.previewNote}>
                        * Algumas parcelas terão +€0.01 para garantir o valor total exato
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status</Text>
              
              <Text style={styles.inputLabel}>Status do Contrato</Text>
              <View style={styles.statusContainer}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusOption,
                      formData.status === option.value && styles.statusOptionSelected,
                    ]}
                    onPress={() => updateField('status', option.value)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        formData.status === option.value && styles.statusOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informações Adicionais</Text>
              
              <Input
                label="Observações"
                value={formData.notes}
                onChangeText={(value) => updateField('notes', value)}
                placeholder="Observações sobre o contrato"
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
            title={contract ? 'Actualizar' : 'Criar Contrato'}
            onPress={handleSubmit}
            disabled={isLoading}
            style={styles.submitButton}
          />
        </View>
      </View>

      {renderClientPicker()}
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
  clientSelector: {
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
  clientSelectorText: {
    fontSize: 16,
    color: '#1F2937',
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
  // Client picker styles
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
  clientItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 14,
    color: '#64748B',
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
  // Payment method styles
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
    width: 20,
    height: 20,
  },
  // Installment preview styles
  installmentPreview: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  previewContent: {
    gap: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  previewLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  previewValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
  },
  previewNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default ContractForm;