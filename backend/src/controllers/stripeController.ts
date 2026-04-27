import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { stripeService } from '../services/stripeService';
import { ClientRepository } from '../repositories/clientRepository';
import { PaymentRepository } from '../repositories/paymentRepository';
import { createError } from '../middlewares/errorHandler';

export class StripeController {
  private readonly clientRepository: ClientRepository;
  private readonly paymentRepository: PaymentRepository;

  constructor() {
    this.clientRepository = new ClientRepository();
    this.paymentRepository = new PaymentRepository();
  }

  createSetupIntent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!stripeService.isEnabled()) {
        throw createError('Stripe is not enabled on this server', 503);
      }

      const { client_id } = req.body;
      if (!client_id) {
        throw createError('client_id is required', 400);
      }

      const client = await this.clientRepository.findById(client_id);
      if (!client) {
        throw createError('Client not found', 404);
      }

      const result = await stripeService.createSetupIntent(client);
      if (!result) {
        throw createError('Failed to create SetupIntent', 500);
      }

      // Persist customer id if it was just created
      if (!client.external_id && result.customerId) {
        await this.clientRepository.update(client.id, { external_id: result.customerId });
      }

      res.json({
        success: true,
        data: {
          client_secret: result.clientSecret,
          customer_id: result.customerId,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Stripe webhook endpoint. Receives raw body (configured at app level
   * via express.raw before express.json) so the signature can be verified.
   */
  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    if (!stripeService.isEnabled()) {
      res.status(503).json({ error: 'Stripe is not enabled' });
      return;
    }

    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripeService.verifyWebhookSignature(req.body, signature);
    } catch (error: any) {
      console.error('Stripe webhook signature verification failed:', error.message);
      res.status(400).json({ error: `Webhook signature verification failed: ${error.message}` });
      return;
    }

    try {
      await this.processEvent(event);
      res.json({ received: true });
    } catch (error) {
      console.error(`Error processing Stripe webhook event ${event.type}:`, error);
      res.status(500).json({ error: 'Internal error processing webhook' });
    }
  };

  private async processEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Stripe webhook event ignored: ${event.type}`);
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const payment = await this.findPaymentForInvoice(invoice);
    if (!payment) {
      console.warn(`No matching payment found for invoice ${invoice.id}`);
      return;
    }

    if (!payment.external_id && invoice.id) {
      await this.paymentRepository.update(payment.id, { external_id: invoice.id });
    }

    if (payment.status !== 'paid') {
      await this.paymentRepository.markAsPaid(payment.id);
      console.log(`Payment ${payment.id} marked as paid (Stripe invoice ${invoice.id})`);
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const payment = await this.findPaymentForInvoice(invoice);
    if (!payment) {
      console.warn(`No matching payment found for invoice ${invoice.id}`);
      return;
    }

    if (!payment.external_id && invoice.id) {
      await this.paymentRepository.update(payment.id, { external_id: invoice.id });
    }

    if (payment.status !== 'paid' && payment.status !== 'failed') {
      await this.paymentRepository.markAsFailed(payment.id);
      console.log(`Payment ${payment.id} marked as failed (Stripe invoice ${invoice.id})`);
    }
  }

  /**
   * Localiza o registro de payment correspondente a uma invoice do Stripe.
   * Estratégia:
   *   1. Se já guardamos o invoice.id em payments.external_id, usa direto.
   *   2. Caso contrário, usa metadata.internal_contract_id para achar o contrato
   *      e pega a próxima parcela pendente do tipo correspondente.
   */
  private async findPaymentForInvoice(invoice: Stripe.Invoice) {
    if (invoice.id) {
      const byExternal = await this.paymentRepository.findByExternalId(invoice.id);
      if (byExternal) return byExternal;
    }

    const contractId = invoice.metadata?.internal_contract_id;
    if (!contractId) return null;

    const paymentType = invoice.metadata?.payment_type === 'downPayment' ? 'downPayment' : 'normalPayment';
    return this.paymentRepository.findFirstPendingByContract(contractId, paymentType);
  }
}
