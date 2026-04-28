import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Contract } from '../types';
import apiService from '../services/api';
import StripePaymentSetup from './StripePaymentSetup';

interface ContractCheckoutModalProps {
  visible: boolean;
  contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>;
  clientName?: string;
  onClose: () => void;
  onSuccess: (contract: Contract) => void;
}

/**
 * Modal that finalizes contract creation by capturing card data via Stripe
 * Embedded Payment Element. The contract is only sent to the backend after
 * the Setup Intent succeeds and we have a payment_method_id.
 */
export const ContractCheckoutModal: React.FC<ContractCheckoutModalProps> = ({
  visible,
  contractData,
  clientName,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const installmentPreview = (() => {
    const total = Number(contractData.value || 0);
    const down = Number(contractData.down_payment || 0);
    const n = Number(contractData.number_of_payments || 1);
    const remaining = Math.max(total - down, 0);
    return n > 0 ? remaining / n : 0;
  })();

  const handlePaymentMethodReady = async (paymentMethodId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...contractData, payment_method_id: paymentMethodId } as any;
      const response = await apiService.createContract(payload);
      const created = response?.data;
      if (!created) {
        throw new Error('Resposta sem dados do contrato');
      }
      onSuccess(created);
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar contrato');
      Alert.alert('Erro', err?.message || 'Falha ao criar contrato');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.title}>Autorizar pagamento</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Text style={styles.close}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Resumo do contrato</Text>
              {clientName ? <Row label="Cliente" value={clientName} /> : null}
              {contractData.contract_number ? (
                <Row label="Nº contrato" value={contractData.contract_number} />
              ) : null}
              <Row label="Valor total" value={`€${Number(contractData.value).toFixed(2)}`} />
              {contractData.down_payment && contractData.down_payment > 0 ? (
                <Row label="Entrada" value={`€${Number(contractData.down_payment).toFixed(2)}`} />
              ) : null}
              <Row
                label={`${contractData.number_of_payments}x parcelas`}
                value={`€${installmentPreview.toFixed(2)}/mês`}
              />
              {contractData.start_date ? (
                <Row label="Início" value={String(contractData.start_date)} />
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Dados de pagamento</Text>
            <Text style={styles.subtitle}>
              Os dados do cartão são processados pela Stripe e nunca tocam os nossos servidores.
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.stripeWrapper}>
              <StripePaymentSetup
                clientId={contractData.client_id}
                onPaymentMethodReady={handlePaymentMethodReady}
                onCancel={onClose}
                submitLabel={`Criar contrato e autorizar débito automático`}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  close: {
    fontSize: 28,
    lineHeight: 28,
    color: '#666',
    paddingHorizontal: 8,
  },
  body: {
    padding: 16,
  },
  summary: {
    backgroundColor: '#f7f8fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowLabel: {
    color: '#666',
  },
  rowValue: {
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  error: {
    color: '#c0392b',
    marginBottom: 8,
  },
  stripeWrapper: {
    minHeight: 200,
  },
});

export default ContractCheckoutModal;
