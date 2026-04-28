import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, isStripeConfigured } from '../services/stripeConfig';
import apiService from '../services/api';
import Button from './common/Button';

interface StripePaymentSetupProps {
  clientId: string;
  onPaymentMethodReady: (paymentMethodId: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

interface InnerFormProps {
  onPaymentMethodReady: (paymentMethodId: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

const InnerForm: React.FC<InnerFormProps> = ({ onPaymentMethodReady, onCancel, submitLabel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Falha ao confirmar dados de pagamento');
      setSubmitting(false);
      return;
    }

    if (setupIntent && setupIntent.status === 'succeeded' && setupIntent.payment_method) {
      const paymentMethodId =
        typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;
      onPaymentMethodReady(paymentMethodId);
    } else {
      setError('SetupIntent não foi confirmado. Tente novamente.');
      setSubmitting(false);
    }
  };

  return (
    <View>
      <PaymentElement options={{ layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never' } }} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        {onCancel ? (
          <Button title="Cancelar" variant="secondary" onPress={onCancel} disabled={submitting} />
        ) : null}
        <Button
          title={submitting ? 'A processar…' : submitLabel || 'Autorizar pagamento'}
          onPress={handleConfirm}
          disabled={!stripe || !elements || submitting}
        />
      </View>
    </View>
  );
};

export const StripePaymentSetup: React.FC<StripePaymentSetupProps> = ({
  clientId,
  onPaymentMethodReady,
  onCancel,
  submitLabel,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isStripeConfigured()) {
      setError('Stripe não configurado. Defina EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await apiService.createStripeSetupIntent(clientId);
        if (cancelled) return;
        const secret = response?.data?.client_secret;
        if (!secret) {
          throw new Error('SetupIntent sem client_secret');
        }
        setClientSecret(secret);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Falha ao iniciar pagamento');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>A preparar pagamento seguro…</Text>
      </View>
    );
  }

  if (error || !clientSecret) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || 'Não foi possível iniciar o pagamento'}</Text>
      </View>
    );
  }

  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: { theme: 'stripe' },
      }}
    >
      <InnerForm
        onPaymentMethodReady={onPaymentMethodReady}
        onCancel={onCancel}
        submitLabel={submitLabel}
      />
    </Elements>
  );
};

const styles = StyleSheet.create({
  center: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    marginTop: 12,
    color: '#666',
  },
  error: {
    color: '#c0392b',
    marginVertical: 8,
  },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
});

export default StripePaymentSetup;
