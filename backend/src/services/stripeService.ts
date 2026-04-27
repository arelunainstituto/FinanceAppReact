import Stripe from 'stripe';
import { Client } from '../models';

const STRIPE_ENABLED = process.env.STRIPE_ENABLED === 'true';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_CURRENCY = 'eur';

console.log('🔵 StripeService - Initialization:');
console.log('  STRIPE_ENABLED env var:', process.env.STRIPE_ENABLED);
console.log('  STRIPE_ENABLED === "true":', STRIPE_ENABLED);
console.log('  STRIPE_SECRET_KEY present:', !!STRIPE_SECRET_KEY);

export interface CreateScheduleParams {
  stripeCustomerId: string;
  installmentAmount: number;
  numberOfPayments: number;
  firstInstallmentDate: Date;
  contractId: string;
  contractDescription: string;
}

export interface CreateDownPaymentInvoiceParams {
  stripeCustomerId: string;
  amount: number;
  contractId: string;
  description: string;
}

export class StripeService {
  private stripe: Stripe | null;

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

  async createSubscriptionSchedule(params: CreateScheduleParams): Promise<string | null> {
    if (!this.stripe) return null;

    const price = await this.stripe.prices.create({
      currency: STRIPE_CURRENCY,
      unit_amount: this.toCents(params.installmentAmount),
      recurring: { interval: 'month' },
      product_data: { name: params.contractDescription },
      metadata: { internal_contract_id: params.contractId },
    });

    const schedule = await this.stripe.subscriptionSchedules.create({
      customer: params.stripeCustomerId,
      start_date: Math.floor(params.firstInstallmentDate.getTime() / 1000),
      end_behavior: 'cancel',
      phases: [{
        items: [{ price: price.id, quantity: 1 }],
        iterations: params.numberOfPayments,
      }],
      metadata: { internal_contract_id: params.contractId },
    });

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

    const invoice = await this.stripe.invoices.create({
      customer: params.stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: 7,
      metadata: { internal_contract_id: params.contractId, payment_type: 'downPayment' },
    });

    if (!invoice.id) {
      throw new Error('Stripe returned invoice without id');
    }
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
}

export const stripeService = new StripeService();
