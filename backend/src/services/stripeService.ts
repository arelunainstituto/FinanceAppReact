import Stripe from 'stripe';
import { Client } from '../models';

const STRIPE_ENABLED = process.env.STRIPE_ENABLED === 'true';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_CURRENCY = 'eur';

export interface CreateScheduleParams {
  stripeCustomerId: string;
  installmentAmount: number;
  numberOfPayments: number;
  firstInstallmentDate: Date;
  contractId: string;
  contractDescription: string;
  paymentMethodId?: string;
  /**
   * Number of months between each installment (1 = mensal, 2 = bimensal, ...).
   * Defaults to 1.
   */
  intervalMonths?: number;
}

export interface CreateDownPaymentInvoiceParams {
  stripeCustomerId: string;
  amount: number;
  contractId: string;
  description: string;
  paymentMethodId?: string;
}

export interface SetupIntentResult {
  clientSecret: string;
  customerId: string;
}

export class StripeService {
  private readonly stripe: Stripe | null;

  constructor() {
    if (STRIPE_ENABLED && STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(STRIPE_SECRET_KEY);
    } else {
      this.stripe = null;
    }
  }

  isEnabled(): boolean {
    return this.stripe !== null;
  }

  private toCents(amount: number): number {
    return Math.round(amount * 100);
  }

  async createCustomer(client: Client): Promise<string | null> {
    if (!this.stripe) return null;

    const fullName = `${client.first_name}${client.last_name ? ' ' + client.last_name : ''}`.trim();
    const customer = await this.stripe.customers.create({
      name: fullName,
      email: client.email || undefined,
      phone: client.phone || client.mobile || undefined,
      address: client.address ? {
        line1: client.address,
        city: client.city || undefined,
        state: client.state || undefined,
        postal_code: client.postal_code || undefined,
        country: client.country || undefined,
      } : undefined,
      metadata: { internal_client_id: client.id },
    });

    return customer.id;
  }

  /**
   * Cria um SetupIntent para que o frontend possa capturar dados de cartão
   * usando o Stripe Embedded Payment Element. Retorna client_secret para o
   * frontend e o stripe_customer_id (cria customer se ainda não existir).
   */
  async createSetupIntent(client: Client): Promise<SetupIntentResult | null> {
    if (!this.stripe) return null;

    let stripeCustomerId = client.external_id;
    if (!stripeCustomerId) {
      stripeCustomerId = await this.createCustomer(client) ?? undefined;
      if (!stripeCustomerId) {
        throw new Error('Failed to create Stripe customer for SetupIntent');
      }
    }

    const setupIntent = await this.stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card', 'sepa_debit'],
      usage: 'off_session',
      metadata: { internal_client_id: client.id },
    });

    if (!setupIntent.client_secret) {
      throw new Error('Stripe returned SetupIntent without client_secret');
    }

    return {
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId,
    };
  }

  async createSubscriptionSchedule(params: CreateScheduleParams): Promise<string | null> {
    if (!this.stripe) return null;

    const intervalMonths = Math.max(1, Math.floor(params.intervalMonths || 1));

    const recurring: Stripe.PriceCreateParams.Recurring =
      intervalMonths === 12
        ? { interval: 'year', interval_count: 1 }
        : { interval: 'month', interval_count: intervalMonths };

    const price = await this.stripe.prices.create({
      currency: STRIPE_CURRENCY,
      unit_amount: this.toCents(params.installmentAmount),
      recurring,
      product_data: { name: params.contractDescription },
      metadata: { internal_contract_id: params.contractId },
    });

    const scheduleParams: Stripe.SubscriptionScheduleCreateParams = {
      customer: params.stripeCustomerId,
      start_date: Math.floor(params.firstInstallmentDate.getTime() / 1000),
      end_behavior: 'cancel',
      phases: [{
        items: [{ price: price.id, quantity: 1 }],
        iterations: params.numberOfPayments,
        proration_behavior: 'none',
      }],
      metadata: { internal_contract_id: params.contractId },
    };

    if (params.paymentMethodId) {
      scheduleParams.default_settings = {
        default_payment_method: params.paymentMethodId,
        collection_method: 'charge_automatically',
      };
    }

    const schedule = await this.stripe.subscriptionSchedules.create(scheduleParams);
    return schedule.id;
  }

  async createDownPaymentInvoice(params: CreateDownPaymentInvoiceParams): Promise<string | null> {
    if (!this.stripe) return null;

    await this.stripe.invoiceItems.create({
      customer: params.stripeCustomerId,
      amount: this.toCents(params.amount),
      currency: STRIPE_CURRENCY,
      description: params.description,
      metadata: { internal_contract_id: params.contractId, payment_type: 'downPayment' },
    });

    const invoiceParams: Stripe.InvoiceCreateParams = {
      customer: params.stripeCustomerId,
      metadata: { internal_contract_id: params.contractId, payment_type: 'downPayment' },
    };

    if (params.paymentMethodId) {
      invoiceParams.collection_method = 'charge_automatically';
      invoiceParams.default_payment_method = params.paymentMethodId;
    } else {
      invoiceParams.collection_method = 'send_invoice';
      invoiceParams.days_until_due = 7;
    }

    const invoice = await this.stripe.invoices.create(invoiceParams);

    if (!invoice.id) {
      throw new Error('Stripe returned invoice without id');
    }

    // When default_payment_method is set with charge_automatically, Stripe
    // attempts payment automatically right after finalize. Otherwise the
    // invoice is sent to the customer for manual payment within days_until_due.
    await this.stripe.invoices.finalizeInvoice(invoice.id);

    return invoice.id;
  }

  async cancelSchedule(scheduleId: string): Promise<void> {
    if (!this.stripe) return;
    try {
      await this.stripe.subscriptionSchedules.cancel(scheduleId);
    } catch (error) {
      console.error(`Failed to cancel Stripe schedule ${scheduleId}:`, error);
    }
  }

  async voidInvoice(invoiceId: string): Promise<void> {
    if (!this.stripe) return;
    try {
      await this.stripe.invoices.voidInvoice(invoiceId);
    } catch (error) {
      console.error(`Failed to void Stripe invoice ${invoiceId}:`, error);
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    if (!this.stripe) return;
    try {
      await this.stripe.customers.del(customerId);
    } catch (error) {
      console.error(`Failed to delete Stripe customer ${customerId}:`, error);
    }
  }

  /**
   * Verifica a assinatura HMAC de um webhook do Stripe usando o STRIPE_WEBHOOK_SECRET.
   * O `payload` deve ser o body raw (Buffer ou string), não JSON parseado.
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    if (!this.stripe) {
      throw new Error('Stripe is not enabled');
    }
    if (!STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }
    return this.stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  }
}

export const stripeService = new StripeService();
