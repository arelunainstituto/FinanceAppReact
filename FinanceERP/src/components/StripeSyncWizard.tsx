import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Contract } from '../types';
import Button from './common/Button';
import { Modal } from './common/Modal';
import StripePaymentSetup from './StripePaymentSetup';
import ApiService from '../services/api';

interface StripeSyncWizardProps {
  visible: boolean;
  contract: Contract | null;
  onClose: () => void;
  onSuccess: () => void;
}

type SyncStep = 'summary' | 'payment' | 'confirming' | 'success';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

interface SyncPreview {
  contractId: string;
  contractNumber?: string;
  clientName: string;
  clientEmail?: string;
  clientHasStripeCustomer: boolean;
  alreadySynced: boolean;
  eligiblePayments: Array<{ id: string; amount: number; due_date: string; notes?: string }>;
  installmentAmount: number;
  firstInstallmentDate: string;
  intervalMonths: number;
  totalAmount: number;
}

const STEPS: { key: SyncStep; label: string }[] = [
  { key: 'summary', label: 'Resumo' },
  { key: 'payment', label: 'Pagamento' },
  { key: 'confirming', label: 'Confirmação' },
];

const formatDate = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()}`;
};

const formatCurrency = (n: number): string => `€${Number(n).toFixed(2)}`;

const StripeSyncWizard: React.FC<StripeSyncWizardProps> = ({
  visible,
  contract,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<SyncStep>('summary');
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !contract) return;
    setStep('summary');
    setPreview(null);
    setError(null);
    setSubmitting(false);

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const response = await ApiService.getContractStripeSyncPreview(contract.id);
        if (cancelled) return;
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Falha ao carregar pré-visualização');
        }
        setPreview(response.data);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Falha ao carregar pré-visualização');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, contract]);

  const handlePaymentMethodReady = async (paymentMethodId: string) => {
    if (!contract) return;
    setStep('confirming');
    setSubmitting(true);
    setError(null);
    try {
      const response = await ApiService.syncContractToStripe(contract.id, paymentMethodId);
      if (!response.success) {
        throw new Error(response.message || 'Falha ao sincronizar com Stripe');
      }
      setStep('success');
      onSuccess();
    } catch (e: any) {
      setError(e?.message || 'Falha ao sincronizar com Stripe');
      setStep('payment');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    if (step === 'success') return null;
    const currentIdx = STEPS.findIndex((s) => s.key === step);
    return (
      <View style={styles.stepIndicatorContainer}>
        {STEPS.map((s, idx) => {
          const isActive = idx === currentIdx;
          const isCompleted = idx < currentIdx;
          return (
            <React.Fragment key={s.key}>
              <View style={styles.stepItem}>
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
                      {idx + 1}
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                  {s.label}
                </Text>
              </View>
              {idx < STEPS.length - 1 && (
                <View
                  style={[styles.stepConnector, isCompleted && styles.stepConnectorCompleted]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  const renderSummary = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>A carregar pré-visualização…</Text>
        </View>
      );
    }
    if (error || !preview) {
      return (
        <View style={styles.center}>
          <Text style={styles.error}>{error || 'Não foi possível carregar o resumo'}</Text>
        </View>
      );
    }

    if (preview.alreadySynced) {
      return (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={48} color="#10B981" />
          <Text style={styles.muted}>Este contrato já está sincronizado com Stripe.</Text>
        </View>
      );
    }

    if (preview.eligiblePayments.length === 0) {
      return (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#F59E0B" />
          <Text style={styles.muted}>
            Nenhuma parcela elegível para sincronização. Apenas parcelas pendentes
            (não-atrasadas, não-pagas) podem ser enviadas para o Stripe.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumo da sincronização</Text>
        <Text style={styles.sectionSubtitle}>
          Será criada uma assinatura no Stripe com as parcelas pendentes não-atrasadas.
          Parcelas atrasadas continuam apenas no sistema.
        </Text>

        <View style={styles.summary}>
          <SummaryRow label="Cliente" value={preview.clientName} />
          {preview.contractNumber ? (
            <SummaryRow label="Nº contrato" value={preview.contractNumber} />
          ) : null}
          <SummaryRow
            label="Customer Stripe"
            value={preview.clientHasStripeCustomer ? 'Já existe' : 'Será criado agora'}
          />
          <SummaryRow
            label="Parcelas a sincronizar"
            value={`${preview.eligiblePayments.length}x`}
          />
          <SummaryRow
            label="Valor por parcela"
            value={formatCurrency(preview.installmentAmount)}
          />
          <SummaryRow label="Total" value={formatCurrency(preview.totalAmount)} />
          <SummaryRow
            label="Primeira cobrança"
            value={formatDate(preview.firstInstallmentDate)}
          />
        </View>

        <View style={styles.installmentsList}>
          <Text style={styles.installmentsTitle}>Parcelas incluídas</Text>
          {preview.eligiblePayments.slice(0, 8).map((p) => (
            <View key={p.id} style={styles.installmentRow}>
              <Text style={styles.installmentLabel}>
                {p.notes ? `${p.notes} — ` : ''}
                {formatDate(p.due_date)}
              </Text>
              <Text style={styles.installmentValue}>{formatCurrency(p.amount)}</Text>
            </View>
          ))}
          {preview.eligiblePayments.length > 8 && (
            <Text style={styles.muted}>
              + {preview.eligiblePayments.length - 8} parcelas adicionais…
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderPayment = () => {
    if (!contract || !preview) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Autorizar pagamento</Text>
        <Text style={styles.sectionSubtitle}>
          Os dados do cartão/SEPA são processados pela Stripe e usados para cobrar
          automaticamente cada parcela na data de vencimento.
        </Text>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <View style={styles.stripeWrapper}>
          <StripePaymentSetup
            clientId={contract.client_id}
            onPaymentMethodReady={handlePaymentMethodReady}
            onCancel={() => setStep('summary')}
            submitLabel={submitting ? 'A sincronizar…' : 'Autorizar e sincronizar'}
          />
        </View>
      </View>
    );
  };

  const renderConfirming = () => (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
      <Text style={styles.muted}>A criar assinatura no Stripe…</Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconWrapper}>
        <Ionicons name="checkmark-circle" size={80} color="#10B981" />
      </View>
      <Text style={styles.successTitle}>Sincronização Concluída!</Text>
      <Text style={styles.successMessage}>
        O contrato foi sincronizado com sucesso no Stripe. As parcelas pendentes agora serão cobradas automaticamente nas datas de vencimento.
      </Text>
      <View style={{ marginTop: 24, width: '100%' }}>
        <Button title="Concluir" onPress={onClose} variant="primary" />
      </View>
    </View>
  );

  const renderActiveStep = () => {
    switch (step) {
      case 'summary':
        return renderSummary();
      case 'payment':
        return renderPayment();
      case 'confirming':
        return renderConfirming();
      case 'success':
        return renderSuccess();
      default:
        return null;
    }
  };

  const canAdvanceFromSummary =
    !!preview && !preview.alreadySynced && preview.eligiblePayments.length > 0 && !loading && !error;

  return (
    <Modal
      visible={visible}
      title="Sincronizar com Stripe"
      onClose={onClose}
      width={isTablet ? '50%' : '90%'}
    >
      {renderStepIndicator()}
      {renderActiveStep()}

      {step === 'summary' && (
        <View style={styles.footer}>
          <Button title="Cancelar" variant="secondary" onPress={onClose} />
          <Button
            title="Avançar para pagamento"
            onPress={() => setStep('payment')}
            disabled={!canAdvanceFromSummary}
          />
        </View>
      )}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
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
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  stepItem: { alignItems: 'center', flex: 0 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#3B82F6' },
  stepDotCompleted: { backgroundColor: '#10B981' },
  stepDotText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  stepDotTextActive: { color: '#FFFFFF' },
  stepLabel: { fontSize: 11, color: '#64748B', marginTop: 4 },
  stepLabelActive: { color: '#0F172A', fontWeight: '600' },
  stepConnector: { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginHorizontal: 8 },
  stepConnectorCompleted: { backgroundColor: '#10B981' },
  content: { flex: 1 },
  contentInner: { padding: 20 },
  section: { gap: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  sectionSubtitle: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  center: { padding: 32, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: '#64748B', textAlign: 'center' },
  error: { color: '#c0392b', textAlign: 'center' },
  errorBanner: {
    color: '#c0392b',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
  },
  summary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryRowLabel: { color: '#64748B', fontSize: 13 },
  summaryRowValue: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  installmentsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  installmentsTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  installmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  installmentLabel: { color: '#0F172A', fontSize: 13 },
  installmentValue: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  stripeWrapper: { marginTop: 8 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  successContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconWrapper: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
});

export default StripeSyncWizard;
