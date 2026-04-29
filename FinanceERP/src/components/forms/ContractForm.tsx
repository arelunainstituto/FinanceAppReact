import React, { useState, useEffect, useMemo } from 'react';
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
import StripePaymentSetup from '../StripePaymentSetup';

interface ContractFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (contract: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  contract?: Contract | null;
  isLoading?: boolean;
}

type StepKey = 'client' | 'treatment' | 'contract' | 'payment' | 'stripe';

// Mantém alinhamento com backend/utils/dateUtils.ts (addMonthsClamped) — quando
// o dia de origem não existe no mês destino, ancora-se ao último dia do mês.
const addMonthsClamped = (date: Date, months: number): Date => {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
};

const monthsForFrequency = (frequency: string): number => {
  switch (frequency.toLowerCase()) {
    case 'bimensal':
      return 2;
    case 'trimestral':
      return 3;
    case 'semestral':
      return 6;
    case 'anual':
      return 12;
    case 'mensal':
    default:
      return 1;
  }
};

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
    payment_frequency: 'Mensal',
    notes: '',
    down_payment: '',
    number_of_payments: '',
    payment_method: 'DD',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stripeSubmitting, setStripeSubmitting] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const isEditMode = !!contract;
  const isStripeSelected = formData.payment_method === 'Stripe';

  // Define dinamicamente os passos do wizard. Em edição não capturamos método
  // de pagamento (já existem parcelas), então só vamos até "contrato".
  const steps: { key: StepKey; label: string }[] = useMemo(() => {
    if (isEditMode) {
      return [
        { key: 'client', label: 'Cliente' },
        { key: 'treatment', label: 'Tratamento' },
        { key: 'contract', label: 'Contrato' },
      ];
    }
    const base: { key: StepKey; label: string }[] = [
      { key: 'client', label: 'Cliente' },
      { key: 'treatment', label: 'Tratamento' },
      { key: 'contract', label: 'Contrato' },
      { key: 'payment', label: 'Pagamento' },
    ];
    if (isStripeSelected) {
      base.push({ key: 'stripe', label: 'Cartão' });
    }
    return base;
  }, [isEditMode, isStripeSelected]);

  const totalSteps = steps.length;
  const activeStepKey = steps[currentStep]?.key;
  const isLastStep = currentStep === totalSteps - 1;

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

    const totalCents = Math.round(remainingValue * 100);
    const baseInstallmentCents = Math.floor(totalCents / numberOfPayments);
    const remainderCents = totalCents - baseInstallmentCents * numberOfPayments;

    const minValue = baseInstallmentCents / 100;
    const maxValue = (baseInstallmentCents + 1) / 100;
    const hasVariation = remainderCents > 0;

    return {
      installmentValue: minValue,
      hasVariation,
      minValue,
      maxValue,
    };
  };

  const installmentPreview = calculateInstallmentPreview();

  const statusOptions = [
    { value: 'ativo', label: 'Ativo' },
    { value: 'liquidado', label: 'Liquidado' },
    { value: 'renegociado', label: 'Renegociado' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'jurídico', label: 'Jurídico' },
  ];

  const paymentFrequencyOptions = [
    { value: 'Mensal', label: 'Mensal' },
    { value: 'Bimensal', label: 'Bimensal' },
    { value: 'Trimestral', label: 'Trimestral' },
    { value: 'Semestral', label: 'Semestral' },
    { value: 'Anual', label: 'Anual' },
  ];

  const paymentMethodOptions = PAYMENT_METHODS;

  useEffect(() => {
    if (visible) {
      loadClients();
      setCurrentStep(0);
      setStripeError(null);
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
        payment_frequency: contract.payment_frequency || 'Mensal',
        notes: contract.notes || '',
        down_payment: contract.down_payment?.toString() || '',
        number_of_payments: contract.number_of_payments?.toString() || '',
        payment_method: 'DD',
      });

      if (contract.client_id && clients.length > 0) {
        const client = clients.find((c) => c.id === contract.client_id);
        setSelectedClient(client || null);
      }
    } else {
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
        payment_frequency: 'Mensal',
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

  const validateStep = (stepKey: StepKey): boolean => {
    const newErrors: Record<string, string> = {};

    if (stepKey === 'client') {
      if (!formData.client_id) {
        newErrors.client_id = 'Cliente é obrigatório';
      }
    }

    if (stepKey === 'treatment') {
      if (!formData.local.trim()) newErrors.local = 'Local é obrigatório';
      if (!formData.area.trim()) newErrors.area = 'Área é obrigatória';
      if (!formData.gestora.trim()) newErrors.gestora = 'Gestor(a) é obrigatório(a)';
      if (!formData.medico.trim()) newErrors.medico = 'Médico(a) é obrigatório(a)';
    }

    if (stepKey === 'contract') {
      if (!formData.value || isNaN(Number(formData.value)) || Number(formData.value) <= 0) {
        newErrors.value = 'Valor deve ser um número positivo';
      }
      if (!formData.start_date.trim()) {
        newErrors.start_date = 'Data de início é obrigatória';
      }
      if (
        formData.down_payment &&
        (isNaN(Number(formData.down_payment)) || Number(formData.down_payment) < 0)
      ) {
        newErrors.down_payment = 'Entrada deve ser um número positivo';
      }
      if (
        formData.number_of_payments &&
        (isNaN(Number(formData.number_of_payments)) || Number(formData.number_of_payments) <= 0)
      ) {
        newErrors.number_of_payments = 'Número de parcelas deve ser um número positivo';
      }
    }

    if (stepKey === 'payment') {
      if (!formData.payment_method) {
        newErrors.payment_method = 'Selecione um método de pagamento';
      }
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const buildContractPayload = (extra: Record<string, any> = {}) => ({
    ...formData,
    value: Number(formData.value),
    down_payment: formData.down_payment ? Number(formData.down_payment) : undefined,
    number_of_payments: formData.number_of_payments
      ? Number(formData.number_of_payments)
      : undefined,
    ...extra,
  });

  const handleNext = () => {
    if (!activeStepKey) return;
    if (!validateStep(activeStepKey)) {
      Alert.alert('Erro', 'Por favor, corrija os erros antes de continuar');
      return;
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinalSubmit = async () => {
    // Para fluxos não-Stripe (e edição): submete diretamente.
    if (activeStepKey && !validateStep(activeStepKey)) {
      Alert.alert('Erro', 'Por favor, corrija os erros antes de continuar');
      return;
    }
    try {
      await onSubmit(buildContractPayload());
      onClose();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar contrato');
    }
  };

  // Callback do StripePaymentSetup: o cartão/SEPA já foi confirmado pela Stripe
  // e temos um payment_method_id. Só agora persistimos o contrato no backend,
  // que cria customer (se necessário), subscription schedule e invoice da entrada.
  const handleStripePaymentMethodReady = async (paymentMethodId: string) => {
    setStripeError(null);
    setStripeSubmitting(true);
    try {
      await onSubmit(buildContractPayload({ payment_method_id: paymentMethodId }));
      onClose();
    } catch (error: any) {
      const message = error?.message || 'Falha ao criar contrato após autorizar pagamento';
      setStripeError(message);
      Alert.alert('Erro', message);
    } finally {
      setStripeSubmitting(false);
    }
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Calcula automaticamente a data de fim do contrato com base na frequência,
  // usando o mesmo clamping que o backend e a Stripe.
  const calculateEndDate = (
    startDate: string,
    numberOfPayments: string,
    frequency: string,
  ): string => {
    if (!startDate || !numberOfPayments) return '';
    const numPayments = parseInt(numberOfPayments);
    if (isNaN(numPayments) || numPayments <= 0) return '';

    try {
      const [day, month, year] = startDate.split('/');
      if (!day || !month || !year) return '';
      const startDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const interval = monthsForFrequency(frequency || 'Mensal');
      // end_date = fim do período de cobertura da última parcela
      // (startDate + (numPayments + 1) intervalos) para alinhar com a Stripe.
      const endDateObj = addMonthsClamped(startDateObj, (numPayments + 1) * interval);

      const endDay = endDateObj.getDate().toString().padStart(2, '0');
      const endMonth = (endDateObj.getMonth() + 1).toString().padStart(2, '0');
      const endYear = endDateObj.getFullYear().toString();
      return `${endDay}/${endMonth}/${endYear}`;
    } catch (error) {
      console.error('Erro ao calcular data de fim:', error);
      return '';
    }
  };

  const updateFieldWithEndDateCalculation = (field: keyof typeof formData, value: string) => {
    const newFormData = { ...formData, [field]: value };

    if (field === 'start_date' || field === 'number_of_payments' || field === 'payment_frequency') {
      const startDate = field === 'start_date' ? value : formData.start_date;
      const numberOfPayments =
        field === 'number_of_payments' ? value : formData.number_of_payments;
      const frequency = field === 'payment_frequency' ? value : formData.payment_frequency;

      const calculatedEndDate = calculateEndDate(startDate, numberOfPayments, frequency);
      if (calculatedEndDate) {
        newFormData.end_date = calculatedEndDate;
      }
    }

    setFormData(newFormData);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    updateField('client_id', client.id);
    setShowClientPicker(false);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        return (
          <React.Fragment key={step.key}>
            <View style={styles.stepIndicatorItem}>
              <View
                style={[
                  styles.stepDot,
                  isActive && styles.stepDotActive,
                  isCompleted && styles.stepDotCompleted,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.stepDotText,
                      (isActive || isCompleted) && styles.stepDotTextActive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[styles.stepLabel, isActive && styles.stepLabelActive]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  isCompleted && styles.stepConnectorCompleted,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderClientStep = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Dados do Cliente</Text>
      <Text style={styles.sectionSubtitle}>
        Selecione o paciente para quem este contrato será criado.
      </Text>

      <View>
        <Text style={styles.inputLabel}>Cliente *</Text>
        <TouchableOpacity
          style={[styles.clientSelector, errors.client_id && styles.inputError]}
          onPress={() => setShowClientPicker(true)}
        >
          <Text
            style={[styles.clientSelectorText, !selectedClient && styles.placeholderText]}
          >
            {selectedClient
              ? `${selectedClient.first_name} ${selectedClient.last_name}`
              : 'Selecione um cliente'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </TouchableOpacity>
        {errors.client_id && <Text style={styles.errorText}>{errors.client_id}</Text>}
      </View>

      <Input
        label="Número do Contrato"
        value={formData.contract_number}
        onChangeText={(value) => updateField('contract_number', value)}
        placeholder="Digite o número do contrato"
      />
    </View>
  );

  const renderTreatmentStep = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tratamento</Text>
      <Text style={styles.sectionSubtitle}>
        Local, área e equipa responsável pelo tratamento.
      </Text>

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
    </View>
  );

  const renderContractStep = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Dados do Contrato</Text>
      <Text style={styles.sectionSubtitle}>
        Valor, datas, parcelas e frequência de pagamento.
      </Text>

      <NumericInput
        label="Valor Total *"
        value={formData.value}
        onChangeText={(value) => updateField('value', value)}
        error={errors.value}
        placeholder="0.00"
        maxDecimalPlaces={2}
      />

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

      <Text style={styles.inputLabel}>Frequência de Pagamento</Text>
      <View style={styles.statusContainer}>
        {paymentFrequencyOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.statusOption,
              formData.payment_frequency === option.value && styles.statusOptionSelected,
            ]}
            onPress={() => updateFieldWithEndDateCalculation('payment_frequency', option.value)}
          >
            <Text
              style={[
                styles.statusOptionText,
                formData.payment_frequency === option.value && styles.statusOptionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <NumericInput
        label="Entrada"
        placeholder="0.00"
        value={formData.down_payment}
        onChangeText={(text) => updateField('down_payment', text)}
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

      {!isEditMode && installmentPreview && (
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

      <Input
        label="Observações"
        value={formData.notes}
        onChangeText={(value) => updateField('notes', value)}
        placeholder="Observações sobre o contrato"
        multiline
        numberOfLines={3}
      />
    </View>
  );

  const renderPaymentStep = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Método de Pagamento</Text>
      <Text style={styles.sectionSubtitle}>
        Escolha como as parcelas serão cobradas. Selecione "Stripe" para capturar
        cartão ou SEPA na próxima etapa.
      </Text>

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

      {isStripeSelected && (
        <View style={styles.stripeNotice}>
          <Ionicons name="information-circle-outline" size={20} color="#1E40AF" />
          <Text style={styles.stripeNoticeText}>
            Ao avançar, abriremos um formulário seguro da Stripe para capturar os
            dados do cartão ou conta SEPA. O contrato e a assinatura só são
            criados após a confirmação da Stripe.
          </Text>
        </View>
      )}
    </View>
  );

  const renderStripeStep = () => {
    const total = Number(formData.value || 0);
    const down = Number(formData.down_payment || 0);
    const n = Number(formData.number_of_payments || 1);
    const remaining = Math.max(total - down, 0);
    const installment = n > 0 ? remaining / n : 0;
    const intervalLabel = formData.payment_frequency || 'Mensal';

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Autorizar Pagamento</Text>
        <Text style={styles.sectionSubtitle}>
          Os dados do cartão/SEPA são processados pela Stripe e nunca tocam os
          nossos servidores.
        </Text>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Resumo</Text>
          {selectedClient && (
            <SummaryRow
              label="Cliente"
              value={`${selectedClient.first_name} ${selectedClient.last_name}`}
            />
          )}
          {formData.contract_number ? (
            <SummaryRow label="Nº contrato" value={formData.contract_number} />
          ) : null}
          <SummaryRow label="Valor total" value={`€${total.toFixed(2)}`} />
          {down > 0 ? <SummaryRow label="Entrada" value={`€${down.toFixed(2)}`} /> : null}
          <SummaryRow
            label={`${n}x parcelas (${intervalLabel})`}
            value={`€${installment.toFixed(2)}`}
          />
          {formData.start_date ? (
            <SummaryRow label="Início" value={formData.start_date} />
          ) : null}
          {formData.end_date ? (
            <SummaryRow label="Fim do contrato" value={formData.end_date} />
          ) : null}
        </View>

        {stripeError ? <Text style={styles.errorBanner}>{stripeError}</Text> : null}

        <View style={styles.stripeWrapper}>
          <StripePaymentSetup
            clientId={formData.client_id}
            onPaymentMethodReady={handleStripePaymentMethodReady}
            onCancel={handleBack}
            submitLabel={stripeSubmitting ? 'A criar contrato…' : 'Autorizar e criar contrato'}
          />
        </View>
      </View>
    );
  };

  const renderActiveStep = () => {
    switch (activeStepKey) {
      case 'client':
        return renderClientStep();
      case 'treatment':
        return renderTreatmentStep();
      case 'contract':
        return renderContractStep();
      case 'payment':
        return renderPaymentStep();
      case 'stripe':
        return renderStripeStep();
      default:
        return null;
    }
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
              {client.email && <Text style={styles.clientEmail}>{client.email}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderFooter = () => {
    // No passo Stripe, o botão de submissão vive dentro do StripePaymentSetup
    // (que controla o confirmSetup). O footer mostra apenas Voltar.
    if (activeStepKey === 'stripe') {
      return (
        <View style={styles.footer}>
          <Button
            title="Voltar"
            onPress={handleBack}
            variant="secondary"
            style={styles.cancelButton}
            disabled={stripeSubmitting}
          />
        </View>
      );
    }

    return (
      <View style={styles.footer}>
        {currentStep === 0 ? (
          <Button
            title="Cancelar"
            onPress={onClose}
            variant="secondary"
            style={styles.cancelButton}
          />
        ) : (
          <Button
            title="Voltar"
            onPress={handleBack}
            variant="secondary"
            style={styles.cancelButton}
          />
        )}

        {isLastStep ? (
          <Button
            title={isEditMode ? 'Atualizar' : 'Criar Contrato'}
            onPress={handleFinalSubmit}
            disabled={isLoading}
            style={styles.submitButton}
          />
        ) : (
          <Button
            title="Próximo"
            onPress={handleNext}
            style={styles.submitButton}
          />
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{isEditMode ? 'Editar Contrato' : 'Novo Contrato'}</Text>
            <Text style={styles.headerSubtitle}>
              Passo {currentStep + 1} de {totalSteps}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        {renderStepIndicator()}

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>{renderActiveStep()}</View>
        </ScrollView>

        {renderFooter()}
      </View>

      {renderClientPicker()}
    </Modal>
  );
};

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryRowLabel}>{label}</Text>
    <Text style={styles.summaryRowValue}>{value}</Text>
  </View>
);

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
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFBFC',
  },
  stepIndicatorItem: {
    alignItems: 'center',
    minWidth: 56,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: '#3B82F6',
  },
  stepDotCompleted: {
    backgroundColor: '#10B981',
  },
  stepDotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#1E293B',
    fontWeight: '600',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
    marginBottom: 16,
  },
  stepConnectorCompleted: {
    backgroundColor: '#10B981',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
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
  errorBanner: {
    color: '#B91C1C',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
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
  paymentMethodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    gap: 8,
    flexBasis: '48%',
    flexGrow: 1,
  },
  paymentMethodOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    flexShrink: 1,
  },
  paymentMethodTextSelected: {
    color: '#FFFFFF',
  },
  paymentMethodIcon: {
    width: 18,
    height: 18,
  },
  installmentPreview: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
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
  stripeNotice: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  stripeNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  summary: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1E293B',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryRowLabel: {
    color: '#64748B',
    fontSize: 13,
  },
  summaryRowValue: {
    fontWeight: '500',
    fontSize: 13,
    color: '#1E293B',
  },
  stripeWrapper: {
    minHeight: 200,
  },
});

export default ContractForm;
