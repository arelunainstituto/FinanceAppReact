import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { stripeService } from '../services/stripeService';
import { ClientRepository } from '../repositories/clientRepository';
import { PaymentRepository } from '../repositories/paymentRepository';
import { ContractRepository } from '../repositories/contractRepository';
import { createError } from '../middlewares/errorHandler';

export class StripeController {
  private readonly clientRepository: ClientRepository;
  private readonly paymentRepository: PaymentRepository;
  private readonly contractRepository: ContractRepository;

  constructor() {
    this.clientRepository = new ClientRepository();
    this.paymentRepository = new PaymentRepository();
    this.contractRepository = new ContractRepository();
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
   * Limpa invoice items pendentes (órfãos) de TODOS os clientes Stripe.
   * Estes itens foram criados pela lógica antiga de down payment que
   * criava invoiceItems mas falhava antes de finalizar a invoice.
   */
  cleanupPendingInvoiceItems = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!stripeService.isEnabled()) {
        throw createError('Stripe is not enabled on this server', 503);
      }

      // Buscar todos os clientes que têm external_id (Stripe customer)
      const allClients = await this.clientRepository.findAll();
      const stripeClients = allClients.filter(c => c.external_id);

      let totalCleared = 0;
      const results: { clientName: string; customerId: string; cleared: number }[] = [];

      for (const client of stripeClients) {
        const cleared = await stripeService.clearPendingInvoiceItems(client.external_id!);
        if (cleared > 0) {
          totalCleared += cleared;
          results.push({
            clientName: `${client.first_name} ${client.last_name || ''}`.trim(),
            customerId: client.external_id!,
            cleared,
          });
        }
      }

      res.json({
        success: true,
        message: `Cleared ${totalCleared} pending invoice items from ${results.length} customers`,
        data: results,
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
      console.warn(`[Webhook] No matching payment found for invoice ${invoice.id}`);
      return;
    }

    if (!payment.external_id && invoice.id) {
      await this.paymentRepository.update(payment.id, { external_id: invoice.id });
    }

    if (payment.status !== 'paid') {
      await this.paymentRepository.markAsPaid(payment.id);
      console.log(`[Webhook] ✅ Payment ${payment.id} marked as paid (Stripe invoice ${invoice.id})`);

      // Verificar se todas as parcelas do contrato foram pagas → marcar contrato como liquidado
      if (payment.contract_id) {
        await this.tryMarkContractAsLiquidado(payment.contract_id);
      }
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
   * Estratégia de fallback (4 níveis):
   *   1. Se já guardamos o invoice.id em payments.external_id, usa direto.
   *   2. invoice.subscription_details.metadata.internal_contract_id (propagado via phases[])
   *   3. invoice.lines.data[0].price.metadata.internal_contract_id (definido na criação do price)
   *   4. API call: buscar subscription metadata diretamente (último recurso)
   * Depois de encontrar o contractId, busca a próxima parcela pendente.
   */
  private async findPaymentForInvoice(invoice: Stripe.Invoice) {
    // 1. Lookup direto por external_id
    if (invoice.id) {
      const byExternal = await this.paymentRepository.findByExternalId(invoice.id);
      if (byExternal) {
        console.log(`[Webhook] Found payment by external_id: ${invoice.id}`);
        return byExternal;
      }
    }

    // 2-4. Resolver contractId por fallback
    const contractId = await this.resolveContractId(invoice);
    if (!contractId) {
      console.warn(`[Webhook] Could not resolve contractId for invoice ${invoice.id}`);
      return null;
    }

    console.log(`[Webhook] Resolved contractId: ${contractId} for invoice ${invoice.id}`);
    return this.paymentRepository.findFirstPendingByContract(contractId, 'normalPayment');
  }

  /**
   * Resolve o internal_contract_id de uma invoice do Stripe usando múltiplas fontes.
   */
  private async resolveContractId(invoice: Stripe.Invoice): Promise<string | null> {
    // Nível 1: invoice.metadata (raro, mas possível se definido manualmente)
    if (invoice.metadata?.internal_contract_id) {
      return invoice.metadata.internal_contract_id;
    }

    // Nível 2: subscription_details.metadata (propagado via phases[].metadata)
    const subDetails = (invoice as any).subscription_details;
    if (subDetails?.metadata?.internal_contract_id) {
      return subDetails.metadata.internal_contract_id;
    }

    // Nível 3: price metadata na primeira line item
    const firstLine = invoice.lines?.data?.[0];
    if (firstLine?.price?.metadata?.internal_contract_id) {
      return firstLine.price.metadata.internal_contract_id;
    }

    // Nível 4: API call para a subscription (último recurso)
    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : (invoice.subscription as any)?.id;

    if (subscriptionId) {
      console.log(`[Webhook] Falling back to API call for subscription ${subscriptionId}`);
      return stripeService.getContractIdFromSubscription(subscriptionId);
    }

    return null;
  }

  /**
   * Verifica se todas as parcelas de um contrato foram pagas e marca-o como liquidado.
   */
  private async tryMarkContractAsLiquidado(contractId: string): Promise<void> {
    try {
      const payments = await this.paymentRepository.findByContractId(contractId);
      const allPaid = payments.length > 0 && payments.every(p => p.status === 'paid');

      if (allPaid) {
        await this.contractRepository.update(contractId, { status: 'liquidado' });
        console.log(`[Webhook] ✅ Contract ${contractId} marked as liquidado (all payments paid)`);
      }
    } catch (error) {
      console.error(`[Webhook] Error checking liquidado status for contract ${contractId}:`, error);
    }
  }

  /**
   * Reconciliação diária: verifica invoices pagas recentemente no Stripe e
   * atualiza parcelas locais que ainda estejam pendentes.
   * Endpoint protegido por autenticação.
   */
  reconcile = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!stripeService.isEnabled()) {
        throw createError('Stripe is not enabled on this server', 503);
      }

      const paidInvoices = await stripeService.listRecentPaidInvoices(48);
      let updated = 0;
      let alreadyPaid = 0;
      let notFound = 0;
      const details: Array<{ invoiceId: string; contractId: string; paymentId?: string; action: string }> = [];

      for (const inv of paidInvoices) {
        if (!inv.contractId) {
          notFound++;
          continue;
        }

        // Verificar se já temos este invoice linkado
        const existing = await this.paymentRepository.findByExternalId(inv.invoiceId);
        if (existing) {
          if (existing.status === 'paid') {
            alreadyPaid++;
            continue;
          }
          // Parcela encontrada mas não paga — atualizar
          await this.paymentRepository.markAsPaid(existing.id);
          await this.paymentRepository.update(existing.id, { external_id: inv.invoiceId });
          updated++;
          details.push({ invoiceId: inv.invoiceId, contractId: inv.contractId, paymentId: existing.id, action: 'marked_paid' });
          await this.tryMarkContractAsLiquidado(existing.contract_id);
          continue;
        }

        // Procurar próxima parcela pendente para este contrato
        const pending = await this.paymentRepository.findFirstPendingByContract(inv.contractId, 'normalPayment');
        if (!pending) {
          notFound++;
          details.push({ invoiceId: inv.invoiceId, contractId: inv.contractId, action: 'no_pending_payment' });
          continue;
        }

        await this.paymentRepository.update(pending.id, { external_id: inv.invoiceId });
        await this.paymentRepository.markAsPaid(pending.id);
        updated++;
        details.push({ invoiceId: inv.invoiceId, contractId: inv.contractId, paymentId: pending.id, action: 'marked_paid' });
        await this.tryMarkContractAsLiquidado(pending.contract_id);
      }

      console.log(`[Reconcile] Processed ${paidInvoices.length} invoices: ${updated} updated, ${alreadyPaid} already paid, ${notFound} not found`);

      res.json({
        success: true,
        message: `Reconciliation complete: ${updated} payments updated`,
        data: {
          totalInvoices: paidInvoices.length,
          updated,
          alreadyPaid,
          notFound,
          details,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
