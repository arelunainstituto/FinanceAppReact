import { ContractRepository, PaginationOptions, ContractFilters, PaginatedResult } from '../repositories/contractRepository';
import { ClientRepository } from '../repositories/clientRepository';
import { PaymentRepository } from '../repositories/paymentRepository';
import { Contract, Payment, Client } from '../models';
import { createError } from '../middlewares/errorHandler';
import { divideIntoInstallments, subtractMoneyValues } from '../utils/moneyUtils';
import { addMonthsClamped, getMonthsForPaymentFrequency } from '../utils/dateUtils';
import { stripeService } from './stripeService';

export class ContractService {
  private contractRepository: ContractRepository;
  private clientRepository: ClientRepository;
  private paymentRepository: PaymentRepository;

  constructor() {
    this.contractRepository = new ContractRepository();
    this.clientRepository = new ClientRepository();
    this.paymentRepository = new PaymentRepository();
  }

  async getAllContracts(): Promise<Contract[]> {
    return this.contractRepository.findAll();
  }

  async getRecentContracts(limit: number = 5): Promise<Contract[]> {
    return this.contractRepository.findRecent(limit);
  }

  async getAllContractsPaginated(options: PaginationOptions = {}, filters: ContractFilters = {}): Promise<PaginatedResult<Contract>> {
    return this.contractRepository.findAllPaginated(options, filters);
  }

  async getContractById(id: string): Promise<Contract> {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw createError('Contract not found', 404);
    }
    return contract;
  }

  async getContractsByClientId(clientId: string): Promise<Contract[]> {
    // Verify client exists
    const client = await this.clientRepository.findById(clientId);
    if (!client) {
      throw createError('Client not found', 404);
    }

    return this.contractRepository.findByClientId(clientId);
  }

  // Helper function to convert DD/MM/YYYY to YYYY-MM-DD
  private convertDateFormat(dateString: string): string {
    if (!dateString) return dateString;
    
    // Check if it's DD/MM/YYYY format
    const ddmmyyyyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateString.match(ddmmyyyyRegex);
    
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month}-${day}`;
    }
    
    // If it's already in YYYY-MM-DD format or other format, return as is
    return dateString;
  }

  async createContract(contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>): Promise<Contract> {
    // Validate required fields
    if (!contractData.client_id || !contractData.value) {
      throw createError('Client ID and value are required', 400);
    }

    // Validate value is positive
    if (contractData.value <= 0) {
      throw createError('Contract value must be positive', 400);
    }

    // Check if client exists
    const client = await this.clientRepository.findById(contractData.client_id);
    if (!client) {
      throw createError('Client not found', 404);
    }

    // Process date fields - convert empty strings to null and format dates
    const processedData = { ...contractData } as any;

    // Extract payment_method (será usado nas parcelas, não no contrato)
    const paymentMethod: string | undefined = processedData.payment_method;
    delete processedData.payment_method;

    // Extract payment_method_id (Stripe PaymentMethod, não persistido no contrato)
    const paymentMethodId: string | undefined = processedData.payment_method_id ?? undefined;
    delete processedData.payment_method_id;

    const isStripePayment = paymentMethod === 'Stripe';
    
    // Set default status if not provided
    if (!processedData.status) {
      processedData.status = 'ativo';
    }
    
    if (processedData.start_date === '') {
      processedData.start_date = null;
    } else if (processedData.start_date) {
      processedData.start_date = this.convertDateFormat(processedData.start_date);
    }
    
    if (processedData.end_date === '') {
      processedData.end_date = null;
    } else if (processedData.end_date) {
      processedData.end_date = this.convertDateFormat(processedData.end_date);
    }

    if (processedData.first_installment_date === '') {
      processedData.first_installment_date = null;
    } else if (processedData.first_installment_date) {
      processedData.first_installment_date = this.convertDateFormat(processedData.first_installment_date);
    }

    // Validate date formats if they are provided
    if (processedData.start_date && typeof processedData.start_date === 'string') {
      const dateRegex = /^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/;
      if (!dateRegex.test(processedData.start_date)) {
        throw createError('Start date must be in DD/MM/YYYY or YYYY-MM-DD format', 400);
      }
    }

    if (processedData.end_date && typeof processedData.end_date === 'string') {
      const dateRegex = /^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/;
      if (!dateRegex.test(processedData.end_date)) {
        throw createError('End date must be in DD/MM/YYYY or YYYY-MM-DD format', 400);
      }
    }

    // Validate dates
    if (processedData.start_date && processedData.end_date) {
      const startDate = new Date(processedData.start_date);
      const endDate = new Date(processedData.end_date);

      if (endDate <= startDate) {
        throw createError('End date must be after start date', 400);
      }
    }

    // Create contract first
    const createdContract = await this.contractRepository.create(processedData);

    // Generate automatic payments if required fields are present
    if (createdContract.start_date && createdContract.number_of_payments && createdContract.number_of_payments > 0) {
      await this.generateAutomaticPayments(createdContract, paymentMethod);

      // Só sincronizar com a Stripe quando o método de pagamento é explicitamente "Stripe"
      // e o serviço está habilitado. Outros métodos (DD, TRF, etc.) ficam apenas no DB.
      if (isStripePayment && stripeService.isEnabled()) {
        console.log(`[Stripe] Syncing contract ${createdContract.id} to Stripe (payment_method: ${paymentMethod})`);
        await this.syncContractToStripe(createdContract, client, paymentMethodId);
        const updatedContract = await this.contractRepository.findById(createdContract.id);
        if (updatedContract) {
          return updatedContract;
        }
      } else if (isStripePayment && !stripeService.isEnabled()) {
        console.warn(`[Stripe] Payment method is Stripe but Stripe service is not enabled. Skipping sync.`);
      }
    }

    return createdContract;
  }

  /**
   * Sincroniza o contrato com o Stripe: garante Customer e cria Subscription Schedule
   * para as parcelas. A entrada (down payment) NÃO é enviada para a Stripe — é gerida
   * localmente. Em caso de falha, faz rollback total (cancela schedule no Stripe,
   * apaga parcelas e contrato no banco).
   */
  private async syncContractToStripe(contract: Contract, client: Client, paymentMethodId?: string): Promise<void> {
    let createdScheduleId: string | null = null;
    let stripeCustomerId = client.external_id || null;
    let createdNewCustomer = false;

    try {
      if (!stripeCustomerId) {
        stripeCustomerId = await stripeService.createCustomer(client);
        if (stripeCustomerId) {
          createdNewCustomer = true;
          await this.clientRepository.update(client.id, { external_id: stripeCustomerId });
          console.log(`[Stripe] Created new customer ${stripeCustomerId} for client ${client.id}`);
        }
      }

      if (!stripeCustomerId) {
        throw new Error('Stripe customer id is unavailable');
      }

      // Limpar invoice items pendentes órfãos (de tentativas anteriores falhadas)
      // para evitar que sejam anexados à primeira invoice da nova subscription.
      await stripeService.clearPendingInvoiceItems(stripeCustomerId);

      const totalValue = Number(contract.value);
      const downPaymentValue = Number(contract.down_payment) || 0;
      const numberOfPayments = Number(contract.number_of_payments);
      const remainingValue = subtractMoneyValues(totalValue, downPaymentValue);
      const installmentValues = divideIntoInstallments(remainingValue, numberOfPayments);
      const installmentAmount = installmentValues[0];

      console.log(`[Stripe] 📊 Contract value calculation:`, {
        contractId: contract.id,
        contractNumber: contract.contract_number,
        'contract.value (raw)': contract.value,
        'contract.down_payment (raw)': contract.down_payment,
        totalValue,
        downPaymentValue,
        numberOfPayments,
        remainingValue,
        installmentAmount,
      });

      const intervalMonths = getMonthsForPaymentFrequency(contract.payment_frequency);
      const startDate = new Date(contract.start_date as any);
      // Se houver first_installment_date no contrato, usa-o como âncora para a Stripe
      // (mantém alinhamento com generateAutomaticPayments). Caso contrário, usa o
      // comportamento legado: start_date + 1 intervalo.
      let firstInstallmentDate = contract.first_installment_date
        ? new Date(contract.first_installment_date as any)
        : addMonthsClamped(startDate, intervalMonths);

      // Se a data da 1ª parcela ficou no passado, ajustar para o futuro mais próximo
      const now = new Date();
      if (firstInstallmentDate <= now) {
        console.warn(`[Stripe] firstInstallmentDate (${firstInstallmentDate.toISOString()}) is in the past. Adjusting to tomorrow.`);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        firstInstallmentDate = tomorrow;
      }

      console.log(`[Stripe] Creating subscription schedule:`, {
        customer: stripeCustomerId,
        installmentAmount,
        numberOfPayments,
        firstInstallmentDate: firstInstallmentDate.toISOString(),
        intervalMonths,
        contractId: contract.id,
        hasPaymentMethod: !!paymentMethodId,
      });

      createdScheduleId = await stripeService.createSubscriptionSchedule({
        stripeCustomerId,
        installmentAmount,
        numberOfPayments,
        firstInstallmentDate,
        contractId: contract.id,
        contractDescription: `Contrato ${contract.contract_number ?? contract.id}`,
        paymentMethodId,
        intervalMonths,
      });

      // Nota: A entrada (down payment) NÃO é lançada na Stripe.
      // A entrada fica apenas no DB local como parcela do tipo 'downPayment'.

      if (createdScheduleId) {
        await this.contractRepository.update(contract.id, { stripe_schedule_id: createdScheduleId });
        console.log(`[Stripe] Subscription schedule ${createdScheduleId} created and linked to contract ${contract.id}`);
      }
    } catch (error) {
      console.error(`[Stripe] Sync failed for contract ${contract.id}, rolling back:`, error);

      if (createdScheduleId) {
        await stripeService.cancelSchedule(createdScheduleId);
      }
      if (createdNewCustomer && stripeCustomerId) {
        await stripeService.deleteCustomer(stripeCustomerId);
        await this.clientRepository.update(client.id, { external_id: undefined });
      }

      try {
        await this.paymentRepository.deleteByContractId(contract.id);
        await this.contractRepository.delete(contract.id);
      } catch (rollbackError) {
        console.error(`[Stripe] Rollback in DB failed for contract ${contract.id}:`, rollbackError);
      }

      throw createError('Failed to sync contract with Stripe', 502);
    }
  }

  /**
   * Pré-visualização de quais parcelas seriam sincronizadas no Stripe para um
   * contrato existente. Filtra apenas as pendentes (não-atrasadas, não-pagas)
   * do tipo normalPayment.
   */
  async getStripeSyncPreview(contractId: string): Promise<{
    contract: Contract;
    client: Client;
    eligiblePayments: Payment[];
    installmentAmount: number;
    firstInstallmentDate: Date;
    intervalMonths: number;
    alreadySynced: boolean;
  }> {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract) throw createError('Contract not found', 404);

    const client = await this.clientRepository.findById(contract.client_id);
    if (!client) throw createError('Client not found', 404);

    const allPayments = await this.paymentRepository.findByContractId(contractId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eligiblePayments = allPayments
      .filter(
        (p) =>
          p.payment_type === 'normalPayment' &&
          p.status === 'pending' &&
          new Date(p.due_date) >= today,
      )
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const intervalMonths = getMonthsForPaymentFrequency(contract.payment_frequency);
    const firstInstallmentDate = eligiblePayments[0]
      ? new Date(eligiblePayments[0].due_date)
      : new Date();
    const installmentAmount = eligiblePayments[0] ? Number(eligiblePayments[0].amount) : 0;

    return {
      contract,
      client,
      eligiblePayments,
      installmentAmount,
      firstInstallmentDate,
      intervalMonths,
      alreadySynced: !!contract.stripe_schedule_id,
    };
  }

  /**
   * Sincroniza um contrato existente com o Stripe (caso de uso: contrato criado
   * sem Stripe inicialmente, ou com pagamentos parciais já feitos localmente).
   * Cria SubscriptionSchedule a partir das parcelas pendentes não-atrasadas.
   * Atrasadas e pagas permanecem no DB sem alteração.
   */
  async syncExistingContractToStripe(contractId: string, paymentMethodId?: string): Promise<Contract> {
    if (!stripeService.isEnabled()) {
      throw createError('Stripe service is not enabled', 503);
    }

    const preview = await this.getStripeSyncPreview(contractId);
    const { contract, client, eligiblePayments, installmentAmount, firstInstallmentDate, intervalMonths } = preview;

    if (preview.alreadySynced) {
      throw createError('Contract is already synced with Stripe', 409);
    }

    if (eligiblePayments.length === 0) {
      throw createError('No eligible installments to sync (all payments are paid, overdue, or absent)', 422);
    }

    let createdScheduleId: string | null = null;
    let stripeCustomerId = client.external_id || null;
    let createdNewCustomer = false;

    try {
      if (!stripeCustomerId) {
        stripeCustomerId = await stripeService.createCustomer(client);
        if (stripeCustomerId) {
          createdNewCustomer = true;
          await this.clientRepository.update(client.id, { external_id: stripeCustomerId });
          console.log(`[Stripe Sync] Created customer ${stripeCustomerId} for client ${client.id}`);
        }
      }
      if (!stripeCustomerId) {
        throw new Error('Stripe customer id is unavailable');
      }

      await stripeService.clearPendingInvoiceItems(stripeCustomerId);

      console.log(`[Stripe Sync] Creating schedule for contract ${contract.id}:`, {
        eligibleCount: eligiblePayments.length,
        installmentAmount,
        firstInstallmentDate: firstInstallmentDate.toISOString(),
        intervalMonths,
        hasPaymentMethod: !!paymentMethodId,
      });

      createdScheduleId = await stripeService.createSubscriptionSchedule({
        stripeCustomerId,
        installmentAmount,
        numberOfPayments: eligiblePayments.length,
        firstInstallmentDate,
        contractId: contract.id,
        contractDescription: `Contrato ${contract.contract_number ?? contract.id}`,
        paymentMethodId,
        intervalMonths,
      });

      if (createdScheduleId) {
        await this.contractRepository.update(contract.id, { stripe_schedule_id: createdScheduleId });
        console.log(`[Stripe Sync] Schedule ${createdScheduleId} linked to contract ${contract.id}`);
      }

      const updated = await this.contractRepository.findById(contract.id);
      return updated || contract;
    } catch (error) {
      console.error(`[Stripe Sync] Failed for contract ${contract.id}, rolling back:`, error);

      if (createdScheduleId) {
        await stripeService.cancelSchedule(createdScheduleId);
      }
      // Não apagar customer nem parcelas locais — só desfazer o que foi criado no Stripe.
      // Se acabámos de criar o customer agora, mantemo-lo (pode ser reutilizado).
      if (createdNewCustomer) {
        console.log(`[Stripe Sync] Keeping newly-created customer ${stripeCustomerId} for future use`);
      }

      throw createError('Failed to sync existing contract with Stripe', 502);
    }
  }

  async updateContract(id: string, contractData: Partial<Omit<Contract, 'id' | 'created_at' | 'updated_at'>>): Promise<Contract> {
    // Check if contract exists
    const existingContract = await this.contractRepository.findById(id);
    if (!existingContract) {
      throw createError('Contract not found', 404);
    }

    // Validate value if being updated
    if (contractData.value !== undefined && contractData.value <= 0) {
      throw createError('Contract value must be positive', 400);
    }

    // Verify client exists if client_id is being updated
    if (contractData.client_id) {
      const client = await this.clientRepository.findById(contractData.client_id);
      if (!client) {
        throw createError('Client not found', 404);
      }
    }

    // Se estiver tentando mudar para 'liquidado', validar se todos os pagamentos estão pagos
    if (contractData.status === 'liquidado' && existingContract.status !== 'liquidado') {
      await this.validateLiquidadoStatus(id);
    }

    // Process date fields - convert empty strings to null and format dates
    const processedData = { ...contractData } as any;

    // IMPORTANTE: Remover payment_method se existir (esse campo não existe em contracts)
    if (processedData.payment_method) {
      delete processedData.payment_method;
    }
    
    if (processedData.start_date === '') {
      processedData.start_date = null;
    } else if (processedData.start_date) {
      processedData.start_date = this.convertDateFormat(processedData.start_date);
    }
    
    if (processedData.end_date === '') {
      processedData.end_date = null;
    } else if (processedData.end_date) {
      processedData.end_date = this.convertDateFormat(processedData.end_date);
    }

    if (processedData.first_installment_date === '') {
      processedData.first_installment_date = null;
    } else if (processedData.first_installment_date) {
      processedData.first_installment_date = this.convertDateFormat(processedData.first_installment_date);
    }

    // Validate date formats if they are provided
    if (processedData.start_date && typeof processedData.start_date === 'string') {
      const dateRegex = /^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/;
      if (!dateRegex.test(processedData.start_date)) {
        throw createError('Start date must be in DD/MM/YYYY or YYYY-MM-DD format', 400);
      }
    }

    if (processedData.end_date && typeof processedData.end_date === 'string') {
      const dateRegex = /^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/;
      if (!dateRegex.test(processedData.end_date)) {
        throw createError('End date must be in DD/MM/YYYY or YYYY-MM-DD format', 400);
      }
    }

    // Validate dates if being updated
    if (processedData.start_date || processedData.end_date) {
      const startDateValue = processedData.start_date || existingContract.start_date;
      const endDateValue = processedData.end_date || existingContract.end_date;
      
      if (startDateValue && endDateValue) {
        const startDate = new Date(startDateValue);
        const endDate = new Date(endDateValue);
        
        if (endDate <= startDate) {
          throw createError('End date must be after start date', 400);
        }
      }
    }

    const updatedContract = await this.contractRepository.update(id, processedData);
    if (!updatedContract) {
      throw createError('Failed to update contract', 500);
    }

    return updatedContract;
  }

  async deleteContract(id: string): Promise<void> {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw createError('Contract not found', 404);
    }

    await this.contractRepository.delete(id);
  }

  async getContractsByStatus(status: string): Promise<Contract[]> {
    return this.contractRepository.findByStatus(status);
  }

  async getContractDetails(id: string): Promise<any> {
    const contractDetails = await this.contractRepository.findContractDetails(id);
    if (!contractDetails) {
      throw createError('Contract not found', 404);
    }
    return contractDetails;
  }

  /**
   * Gera pagamentos automáticos para um contrato
   * Baseado nas regras de negócio definidas no newFunctionality.md
   */
  private async generateAutomaticPayments(contract: Contract, paymentMethod?: string): Promise<void> {
    try {
      // Validações antes de gerar pagamentos
      if (!contract.start_date || !contract.number_of_payments || contract.number_of_payments <= 0) {
        console.log('Skipping automatic payment generation: missing required fields');
        return;
      }

      // Verificar se o contrato ainda existe
      const existingContract = await this.contractRepository.findById(contract.id);
      if (!existingContract) {
        throw createError('Contract not found during payment generation', 404);
      }

      const payments: Omit<Payment, 'id' | 'created_at' | 'updated_at'>[] = [];
      const startDate = new Date(contract.start_date);
      const totalValue = Number(contract.value);
      const downPaymentValue = Number(contract.down_payment) || 0;
      const numberOfPayments = Number(contract.number_of_payments);

      // Calcular valor das parcelas usando função precisa (evita erros de arredondamento)
      const remainingValue = subtractMoneyValues(totalValue, downPaymentValue);
      const installmentValues = divideIntoInstallments(remainingValue, numberOfPayments);

      // Criar entrada se houver
      if (downPaymentValue > 0) {
        payments.push({
          contract_id: contract.id,
          amount: downPaymentValue,
          due_date: startDate,
          status: 'pending',
          payment_method: paymentMethod,
          payment_type: 'downPayment',
          notes: 'Entrada do contrato',
          external_id: undefined,
          paid_date: undefined,
        });
      }

      // Calcular intervalo entre parcelas (em meses) com base na frequência
      const intervalMonths = getMonthsForPaymentFrequency(contract.payment_frequency);

      // Âncora da 1ª parcela: campo opcional first_installment_date tem prioridade.
      // Se ausente, mantém o comportamento legado (start_date + 1 intervalo).
      const anchor = contract.first_installment_date
        ? new Date(contract.first_installment_date as any)
        : addMonthsClamped(startDate, intervalMonths);

      // Criar parcelas com valores precisos e datas alinhadas à Stripe
      // (clamping de fim-de-mês: 31/jan + 1 mês = 28/fev no DB e na Stripe)
      for (let i = 0; i < numberOfPayments; i++) {
        const dueDate = addMonthsClamped(anchor, i * intervalMonths);

        // Verificar se a data de vencimento não é anterior à data atual
        const today = new Date();
        const status = dueDate < today ? 'overdue' : 'pending';

        payments.push({
          contract_id: contract.id,
          amount: installmentValues[i], // Usar valor preciso da parcela
          due_date: dueDate,
          status: status,
          payment_method: paymentMethod,
          payment_type: 'normalPayment',
          notes: `${i + 1}/${numberOfPayments}`,
          external_id: undefined,
          paid_date: undefined,
        });
      }

      // Criar todos os pagamentos
      for (const paymentData of payments) {
        try {
          await this.paymentRepository.create(paymentData);
        } catch (error) {
          console.error(`Error creating payment for contract ${contract.id}:`, error);
          // Em caso de erro, tentar limpar pagamentos já criados
          await this.paymentRepository.deleteByContractId(contract.id);
          throw createError('Failed to generate automatic payments', 500);
        }
      }

      console.log(`Generated ${payments.length} automatic payments for contract ${contract.id}`);
    } catch (error) {
      console.error('Error generating automatic payments:', error);
      throw error;
    }
  }

  /**
   * Remove todos os pagamentos de um contrato
   */
  async deleteContractPayments(contractId: string): Promise<void> {
    try {
      // First check if contract exists
      const contract = await this.contractRepository.findById(contractId);
      if (!contract) {
        throw createError('Contract not found', 404);
      }

      // Delete all payments for this contract
      await this.paymentRepository.deleteByContractId(contractId);
    } catch (error) {
      console.error('Error deleting contract payments:', error);
      throw error;
    }
  }

  async getContractBalances(contractId: string): Promise<{ positive_balance: number; negative_balance: number }> {
    try {
      const contract = await this.contractRepository.findById(contractId);
      if (!contract) {
        throw createError('Contract not found', 404);
      }

      return {
        positive_balance: contract.positive_balance || 0,
        negative_balance: contract.negative_balance || 0
      };
    } catch (error) {
      console.error('Error fetching contract balances:', error);
      throw error;
    }
  }

  /**
   * Verifica se todos os pagamentos de um contrato estão pagos
   */
  async areAllPaymentsPaid(contractId: string): Promise<boolean> {
    try {
      const payments = await this.paymentRepository.findByContractId(contractId);

      // Se não há pagamentos, considerar como não pago
      if (payments.length === 0) {
        return false;
      }

      // Verificar se todos os pagamentos estão com status 'paid'
      const allPaid = payments.every(payment => payment.status === 'paid');

      return allPaid;
    } catch (error) {
      console.error('Error checking if all payments are paid:', error);
      throw error;
    }
  }

  /**
   * Marca o contrato como liquidado se todos os pagamentos estiverem pagos
   * Retorna true se o status foi alterado, false caso contrário
   */
  async checkAndMarkAsLiquidado(contractId: string): Promise<boolean> {
    try {
      const contract = await this.contractRepository.findById(contractId);
      if (!contract) {
        throw createError('Contract not found', 404);
      }

      // Se já está liquidado, não fazer nada
      if (contract.status === 'liquidado') {
        return false;
      }

      // Verificar se todos os pagamentos estão pagos
      const allPaid = await this.areAllPaymentsPaid(contractId);

      if (allPaid) {
        // Marcar como liquidado
        await this.contractRepository.update(contractId, { status: 'liquidado' });
        console.log(`✅ Contrato ${contractId} marcado como LIQUIDADO automaticamente`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking and marking contract as liquidado:', error);
      throw error;
    }
  }

  /**
   * Valida se um contrato pode ser marcado como liquidado manualmente
   * Lança erro se não puder
   */
  async validateLiquidadoStatus(contractId: string): Promise<void> {
    const allPaid = await this.areAllPaymentsPaid(contractId);

    if (!allPaid) {
      throw createError('Não é possível marcar o contrato como liquidado. Existem pagamentos pendentes.', 400);
    }
  }
}