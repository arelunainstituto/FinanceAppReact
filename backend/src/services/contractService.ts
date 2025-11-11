import { ContractRepository, PaginationOptions, ContractFilters, PaginatedResult } from '../repositories/contractRepository';
import { ClientRepository } from '../repositories/clientRepository';
import { PaymentRepository } from '../repositories/paymentRepository';
import { Contract, Payment } from '../models';
import { createError } from '../middlewares/errorHandler';
import { divideIntoInstallments, subtractMoneyValues } from '../utils/moneyUtils';

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
    const paymentMethod = processedData.payment_method;
    delete processedData.payment_method;
    
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
    }

    return createdContract;
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

      // Criar parcelas mensais com valores precisos
      for (let i = 1; i <= numberOfPayments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);

        // Verificar se a data de vencimento não é anterior à data atual
        const today = new Date();
        const status = dueDate < today ? 'overdue' : 'pending';

        payments.push({
          contract_id: contract.id,
          amount: installmentValues[i - 1], // Usar valor preciso da parcela
          due_date: dueDate,
          status: status,
          payment_method: paymentMethod,
          payment_type: 'normalPayment',
          notes: `${i}/${numberOfPayments}`,
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