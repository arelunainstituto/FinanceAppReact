import { PaymentRepository, PaginationOptions, PaginatedResult, PaymentFilters } from '../repositories/paymentRepository';
import { ContractRepository } from '../repositories/contractRepository';
import { ClientRepository } from '../repositories/clientRepository';
import { Payment } from '../models';
import { createError } from '../middlewares/errorHandler';
import { getCurrentOrLastBusinessDay } from '../utils/dateUtils';
import * as XLSX from 'xlsx';
import { sumMoneyValues, subtractMoneyValues } from '../utils/moneyUtils';

export class PaymentService {
  private paymentRepository: PaymentRepository;
  private contractRepository: ContractRepository;
  private clientRepository: ClientRepository;

  constructor() {
    this.paymentRepository = new PaymentRepository();
    this.contractRepository = new ContractRepository();
    this.clientRepository = new ClientRepository();
  }

  /**
   * Verifica se todos os pagamentos de um contrato estão pagos e marca como liquidado se sim
   */
  private async checkAndMarkContractAsLiquidado(contractId: string): Promise<void> {
    try {
      const contract = await this.contractRepository.findById(contractId);
      if (!contract || contract.status === 'liquidado') {
        return;
      }

      const payments = await this.paymentRepository.findByContractId(contractId);
      if (payments.length === 0) {
        return;
      }

      const allPaid = payments.every(payment => payment.status === 'paid');
      if (allPaid) {
        await this.contractRepository.update(contractId, { status: 'liquidado' });
        console.log(`✅ Contrato ${contractId} marcado como LIQUIDADO automaticamente`);
      }
    } catch (error) {
      console.error('Error checking contract liquidation status:', error);
      // Não falhar a operação se houver erro ao verificar status do contrato
    }
  }

  async getAllPayments(): Promise<Payment[]> {
    return this.paymentRepository.findAll();
  }

  async getRecentPayments(limit: number = 5): Promise<Payment[]> {
    return this.paymentRepository.findRecent(limit);
  }

  async getUpcomingPayments(limit: number = 5): Promise<Payment[]> {
    return this.paymentRepository.findUpcoming(limit);
  }

  async getAllPaymentsForExport(filters: PaymentFilters = {}): Promise<Payment[]> {
    return this.paymentRepository.findAllForExport(filters);
  }

  async getAllPaymentsPaginated(options: PaginationOptions = {}, filters: PaymentFilters = {}): Promise<PaginatedResult<Payment>> {
    return this.paymentRepository.findAllPaginated(options, filters);
  }

  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw createError('Payment not found', 404);
    }
    return payment;
  }

  async getPaymentsByContractId(contractId: string): Promise<Payment[]> {
    // Verify contract exists
    const contract = await this.contractRepository.findById(contractId);
    if (!contract) {
      throw createError('Contract not found', 404);
    }

    return this.paymentRepository.findByContractId(contractId);
  }

  async getPaymentsByContractIdPaginated(contractId: string, options: PaginationOptions = {}, filters: PaymentFilters = {}): Promise<PaginatedResult<Payment>> {
    // Verify contract exists
    const contract = await this.contractRepository.findById(contractId);
    if (!contract) {
      throw createError('Contract not found', 404);
    }

    return this.paymentRepository.findByContractIdPaginated(contractId, options, filters);
  }

  async createPayment(paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
    // Validate required fields
    if (!paymentData.contract_id || !paymentData.amount || !paymentData.due_date) {
      throw createError('Contract ID, amount, and due date are required', 400);
    }

    // Validate amount is positive
    if (paymentData.amount <= 0) {
      throw createError('Payment amount must be positive', 400);
    }

    // Verify contract exists
    const contract = await this.contractRepository.findById(paymentData.contract_id);
    if (!contract) {
      throw createError('Contract not found', 404);
    }

    // Validate due date is not in the past (unless it's intentional)
    const dueDate = new Date(paymentData.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate < today && paymentData.status === 'pending') {
      // If due date is in the past and status is pending, mark as overdue
      paymentData.status = 'overdue';
    }

    // Clean up empty string fields to prevent enum errors
    const cleanedData = {
      ...paymentData,
      notes: paymentData.notes === '' ? undefined : paymentData.notes,
    };

    return this.paymentRepository.create(cleanedData);
  }

  async updatePayment(id: string, paymentData: Partial<Omit<Payment, 'id' | 'created_at' | 'updated_at'>>): Promise<Payment> {
    console.log('🔍 [PaymentService] updatePayment called:', {
      paymentId: id,
      paymentData
    });

    // Check if payment exists
    const existingPayment = await this.paymentRepository.findById(id);
    if (!existingPayment) {
      throw createError('Payment not found', 404);
    }

    console.log('🔍 [PaymentService] Existing payment:', existingPayment);

    // Validate amount if being updated
    if (paymentData.amount !== undefined && paymentData.amount <= 0) {
      throw createError('Payment amount must be positive', 400);
    }

    // Verify contract exists if contract_id is being updated
    if (paymentData.contract_id) {
      const contract = await this.contractRepository.findById(paymentData.contract_id);
      if (!contract) {
        throw createError('Contract not found', 404);
      }
    }

    // If marking as paid, set paid_date to current or last business day and paid_amount if not provided
    if (paymentData.status === 'paid') {
      if (!paymentData.paid_date) {
        const businessDay = getCurrentOrLastBusinessDay();
        paymentData.paid_date = businessDay;
      }

      // If paid_amount is not provided or is 0, set it to the original payment amount
      if (paymentData.paid_amount === undefined || paymentData.paid_amount === 0) {
        paymentData.paid_amount = existingPayment.amount;
      }
    }

    // If marking as pending, clear paid_date and paid_amount
    if (paymentData.status === 'pending') {
      paymentData.paid_date = undefined;
      paymentData.paid_amount = undefined;
    }

    // Clean up empty string fields to prevent enum errors
    const cleanedData = {
      ...paymentData,
      notes: paymentData.notes === '' ? undefined : paymentData.notes,
    };

    console.log('🔍 [PaymentService] Cleaned data to be saved:', cleanedData);

    const updatedPayment = await this.paymentRepository.update(id, cleanedData);
    if (!updatedPayment) {
      throw createError('Failed to update payment', 500);
    }

    console.log('🔍 [PaymentService] Updated payment from database:', updatedPayment);

    // Se o pagamento foi marcado como 'paid', verificar se o contrato deve ser marcado como liquidado
    if (updatedPayment.status === 'paid') {
      await this.checkAndMarkContractAsLiquidado(updatedPayment.contract_id);
    }

    return updatedPayment;
  }

  async deletePayment(id: string): Promise<void> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw createError('Payment not found', 404);
    }

    await this.paymentRepository.delete(id);
  }

  async getPaymentsByStatus(status: Payment['status']): Promise<Payment[]> {
    return this.paymentRepository.findByStatus(status);
  }

  async getOverduePayments(): Promise<Payment[]> {
    return this.paymentRepository.findOverduePayments();
  }

  async markPaymentAsPaid(id: string): Promise<{
    payment: Payment;
    contractUpdated?: boolean;
    message: string;
  }> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw createError('Payment not found', 404);
    }

    if (payment.status === 'paid') {
      throw createError('Payment is already marked as paid', 400);
    }

    // Buscar contrato para verificar saldos
    const contract = await this.contractRepository.findById(payment.contract_id);
    if (!contract) {
      throw createError('Contract not found', 404);
    }

    const originalAmount = payment.amount;
    const contractPositiveBalance = contract.positive_balance || 0;
    const contractNegativeBalance = contract.negative_balance || 0;
    
    let finalAmount = originalAmount;
    let contractUpdated = false;
    let newPositiveBalance = contractPositiveBalance;
    let newNegativeBalance = contractNegativeBalance;
    let message = 'Payment marked as paid successfully';

    // Aplicar lógica de pagamento automático conforme especificado no documento
    
    // 1. Se há saldo negativo (dívida), primeiro quitar a dívida
    if (contractNegativeBalance > 0) {
      if (originalAmount >= contractNegativeBalance) {
        // Pagamento cobre toda a dívida
        finalAmount = originalAmount - contractNegativeBalance;
        newNegativeBalance = 0;
        contractUpdated = true;
        message = `Payment processed. Debt of R$ ${contractNegativeBalance.toFixed(2)} cleared.`;
        
        // Se ainda sobrar valor após quitar a dívida, adicionar ao saldo positivo
        if (finalAmount > 0) {
          newPositiveBalance = contractPositiveBalance + finalAmount;
          message += ` Remaining R$ ${finalAmount.toFixed(2)} added to positive balance.`;
        }
      } else {
        // Pagamento não cobre toda a dívida
        newNegativeBalance = contractNegativeBalance - originalAmount;
        finalAmount = 0;
        contractUpdated = true;
        message = `Payment applied to debt. Remaining debt: R$ ${newNegativeBalance.toFixed(2)}`;
      }
    } else {
      // 2. Se não há dívida, adicionar valor ao saldo positivo
      newPositiveBalance = contractPositiveBalance + originalAmount;
      contractUpdated = true;
      message = `Payment processed. R$ ${originalAmount.toFixed(2)} added to positive balance. New balance: R$ ${newPositiveBalance.toFixed(2)}`;
    }

    // Atualizar saldos do contrato se necessário
    if (contractUpdated) {
      await this.contractRepository.update(payment.contract_id, {
        positive_balance: newPositiveBalance,
        negative_balance: newNegativeBalance
      });
    }

    // Marcar pagamento como pago com o valor original e data automática (dia útil atual ou anterior)
    const businessDay = getCurrentOrLastBusinessDay();
    const updatedPayment = await this.paymentRepository.update(id, {
      status: 'paid',
      paid_amount: originalAmount,
      paid_date: businessDay
    });

    if (!updatedPayment) {
      throw createError('Failed to mark payment as paid', 500);
    }

    // Verificar se o contrato deve ser marcado como liquidado
    await this.checkAndMarkContractAsLiquidado(payment.contract_id);

    return {
      payment: updatedPayment,
      contractUpdated,
      message
    };
  }

  async updateOverduePayments(): Promise<void> {
    // This method can be called periodically to update overdue payments
    const pendingPayments = await this.paymentRepository.findByStatus('pending');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const payment of pendingPayments) {
      const dueDate = new Date(payment.due_date);
      if (dueDate < today) {
        await this.paymentRepository.update(payment.id, { status: 'overdue' });
      }
    }
  }

  async getPaymentStatistics() {
    const allPayments = await this.paymentRepository.findAll();
    
    const totalPayments = allPayments.length;
    const paidPayments = allPayments.filter(p => p.status === 'paid');
    const pendingPayments = allPayments.filter(p => p.status === 'pending');
    const overduePayments = allPayments.filter(p => p.status === 'overdue');

    const totalAmount = allPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const paidAmount = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const pendingAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const overdueAmount = overduePayments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      totalPayments,
      paidPayments: paidPayments.length,
      pendingPayments: pendingPayments.length,
      overduePayments: overduePayments.length,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
    };
  }

  async processManualPayment(paymentId: string, amount: number, usePositiveBalance: number = 0, paymentMethod?: string): Promise<{
    payment: Payment;
    newPayment?: Payment;
    contractUpdated?: boolean;
    message: string;
  }> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw createError('Payment not found', 404);
    }

    if (payment.status === 'paid') {
      throw createError('Payment is already marked as paid', 400);
    }

    // Buscar contrato para verificar saldos
    const contract = await this.contractRepository.findById(payment.contract_id);
    if (!contract) {
      throw createError('Contract not found', 404);
    }

    const originalAmount = payment.amount;
    const contractPositiveBalance = contract.positive_balance || 0;
    const contractNegativeBalance = contract.negative_balance || 0;
    
    // Validar se o valor de saldo positivo a ser usado é válido
    if (usePositiveBalance > contractPositiveBalance) {
      throw createError(`Cannot use R$ ${usePositiveBalance.toFixed(2)} from positive balance. Available: R$ ${contractPositiveBalance.toFixed(2)}`, 400);
    }

    if (usePositiveBalance < 0) {
      throw createError('Positive balance usage cannot be negative', 400);
    }

    // Calcular valor final da parcela após aplicar saldo positivo (usando operações precisas)
    const finalInstallmentValue = Math.max(0, subtractMoneyValues(originalAmount, usePositiveBalance));
    
    // Validar se o valor pago é positivo
    if (amount <= 0) {
      throw createError('Payment amount must be greater than zero', 400);
    }

    let contractUpdated = false;
    let newPositiveBalance = subtractMoneyValues(contractPositiveBalance, usePositiveBalance);
    let newNegativeBalance = contractNegativeBalance;
    let message = '';
    
    // Caso 1: Pagamento parcial (menor que o valor da parcela)
    if (amount < finalInstallmentValue) {
      const remainingDebt = subtractMoneyValues(finalInstallmentValue, amount);

      // Atualizar pagamento como pago com valor parcial e data automática
      const businessDay = getCurrentOrLastBusinessDay();
      const updatedPayment = await this.paymentRepository.update(paymentId, {
        status: 'paid',
        paid_amount: sumMoneyValues(amount, usePositiveBalance), // Valor efetivamente pago + saldo usado
        paid_date: businessDay,
        payment_method: paymentMethod
      });
      
      // Adicionar valor restante ao saldo negativo do contrato
      newNegativeBalance = sumMoneyValues(contractNegativeBalance, remainingDebt);
      
      // Atualizar saldos do contrato
      await this.contractRepository.update(payment.contract_id, {
        positive_balance: newPositiveBalance,
        negative_balance: newNegativeBalance
      });
      
      contractUpdated = true;
      message = `Partial payment processed. R$ ${amount.toFixed(2)} paid`;
      
      if (usePositiveBalance > 0) {
        message += ` + R$ ${usePositiveBalance.toFixed(2)} from positive balance`;
      }
      
      message += `. Remaining debt of R$ ${remainingDebt.toFixed(2)} added to contract balance. Total debt: R$ ${newNegativeBalance.toFixed(2)}`;

      // Verificar se o contrato deve ser marcado como liquidado
      await this.checkAndMarkContractAsLiquidado(payment.contract_id);

      return {
        payment: updatedPayment!,
        contractUpdated,
        message
      };
    }
    
    // Caso 2: Pagamento exato (após aplicar saldo positivo)
    if (amount === finalInstallmentValue) {
      // Atualizar pagamento como pago com data automática (dia útil atual ou anterior)
      const businessDay = getCurrentOrLastBusinessDay();
      const updatedPayment = await this.paymentRepository.update(paymentId, {
        status: 'paid',
        paid_amount: originalAmount, // Valor original da parcela
        paid_date: businessDay,
        payment_method: paymentMethod
      });
      
      // Atualizar saldo positivo do contrato se foi usado
      if (usePositiveBalance > 0) {
        await this.contractRepository.update(payment.contract_id, {
          positive_balance: newPositiveBalance
        });
        contractUpdated = true;
        message = `Payment completed. Used R$ ${usePositiveBalance.toFixed(2)} from positive balance. New balance: R$ ${newPositiveBalance.toFixed(2)}`;
      } else {
        message = 'Payment completed successfully';
      }

      // Verificar se o contrato deve ser marcado como liquidado
      await this.checkAndMarkContractAsLiquidado(payment.contract_id);

      return {
        payment: updatedPayment!,
        contractUpdated,
        message
      };
    }
    
    // Caso 3: Pagamento excedente
    if (amount > finalInstallmentValue) {
      const excessAmount = subtractMoneyValues(amount, finalInstallmentValue);
      
      // Atualizar pagamento como pago com data automática (dia útil atual ou anterior)
      const businessDay = getCurrentOrLastBusinessDay();
      const updatedPayment = await this.paymentRepository.update(paymentId, {
        status: 'paid',
        paid_amount: originalAmount, // Valor original da parcela
        paid_date: businessDay,
        payment_method: paymentMethod
      });
      
      // Primeiro aplicar o excesso para quitar dívidas (saldo negativo)
      if (contractNegativeBalance > 0) {
        if (excessAmount >= contractNegativeBalance) {
          // Excesso cobre toda a dívida
          const remainingExcess = subtractMoneyValues(excessAmount, contractNegativeBalance);
          newNegativeBalance = 0;
          newPositiveBalance = sumMoneyValues(newPositiveBalance, remainingExcess);
          message = `Payment completed with excess. Debt of R$ ${contractNegativeBalance.toFixed(2)} cleared.`;
          
          if (remainingExcess > 0) {
            message += ` Remaining R$ ${remainingExcess.toFixed(2)} added to positive balance.`;
          }
          
          if (usePositiveBalance > 0) {
            message += ` Used R$ ${usePositiveBalance.toFixed(2)} from previous positive balance.`;
          }
        } else {
          // Excesso não cobre toda a dívida
          newNegativeBalance = subtractMoneyValues(contractNegativeBalance, excessAmount);
          message = `Payment completed with excess applied to debt. Remaining debt: R$ ${newNegativeBalance.toFixed(2)}`;
          
          if (usePositiveBalance > 0) {
            message += ` Used R$ ${usePositiveBalance.toFixed(2)} from positive balance.`;
          }
        }
      } else {
        // Não há dívida, adicionar excesso ao saldo positivo
        newPositiveBalance = sumMoneyValues(newPositiveBalance, excessAmount);
        message = `Payment completed with excess. R$ ${excessAmount.toFixed(2)} added to positive balance.`;
        
        if (usePositiveBalance > 0) {
          message += ` Used R$ ${usePositiveBalance.toFixed(2)} from previous positive balance.`;
        }
        
        message += ` New balance: R$ ${newPositiveBalance.toFixed(2)}`;
      }
      
      // Atualizar saldos do contrato
      await this.contractRepository.update(payment.contract_id, {
        positive_balance: newPositiveBalance,
        negative_balance: newNegativeBalance
      });

      // Verificar se o contrato deve ser marcado como liquidado
      await this.checkAndMarkContractAsLiquidado(payment.contract_id);

      return {
        payment: updatedPayment!,
        contractUpdated: true,
        message
      };
    }

    throw createError('Invalid payment amount', 400);
  }

  async processExcelImport(fileBuffer: Buffer): Promise<{
    success: {
      clientName: string;
      amount: number;
      contractNumber: string;
      dueDate: string;
      paymentId: string;
    }[];
    errors: {
      row: number;
      clientName?: string;
      amount?: number;
      error: string;
    }[];
  }> {
    console.log('🚀 processExcelImport CALLED! Buffer size:', fileBuffer.length);
    
    const successfulPayments: {
      clientName: string;
      amount: number;
      contractNumber: string;
      dueDate: string;
      paymentId: string;
    }[] = [];
    
    const errors: {
      row: number;
      clientName?: string;
      amount?: number;
      error: string;
    }[] = [];

    try {
      // Ler arquivo Excel
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw createError('Planilha vazia ou sem abas', 400);
      }
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converter para JSON
      const data: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (!data || data.length === 0) {
        throw createError('Planilha completamente vazia', 400);
      }
      
      if (data.length <= 1) {
        throw createError('Planilha vazia ou sem dados (apenas cabeçalho)', 400);
      }

      // Encontrar índices das colunas
      const headers = data[0] as string[];
      
      if (!headers || headers.length === 0) {
        throw createError('Cabeçalho da planilha vazio', 400);
      }
      const descricaoIndex = headers.findIndex(h => 
        h && h.toLowerCase().includes('descri')
      );
      const statusIndex = headers.findIndex(h => 
        h && (h.toLowerCase() === 'status' || h.toLowerCase() === 'ok')
      );
      const amountIndex = headers.findIndex(h => 
        h && (h.toLowerCase().includes('amount') || h.toLowerCase().includes('valor') || h.toLowerCase().includes('total'))
      );

      if (descricaoIndex === -1) {
        throw createError('Coluna "Descrição" não encontrada na planilha', 400);
      }

      if (statusIndex === -1) {
        throw createError('Coluna "Status" não encontrada na planilha', 400);
      }

      // ⚡ OTIMIZAÇÃO: Cache de dados para evitar queries repetidas
      console.log('📦 Loading all data into cache...');
      const allClients = await this.clientRepository.findAll();
      const allContracts = await this.contractRepository.findAll();
      const allPayments = await this.paymentRepository.findAll();
      console.log(`📦 Cache loaded: ${allClients.length} clients, ${allContracts.length} contracts, ${allPayments.length} payments`);

      // Processar cada linha (começando da linha 2, pulando o header)
      console.log(`📊 Processing ${data.length - 1} rows...`);
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        
        if (!row || row.length === 0) continue;
        
        try {
          const descricao = row[descricaoIndex];
          const status = row[statusIndex];
          const amountValue = amountIndex !== -1 ? row[amountIndex] : null;
          
          // Verificar se contém "SEPA PAYMENT FOR" (case insensitive)
          if (!descricao || typeof descricao !== 'string' || !descricao.toUpperCase().includes('SEPA PAYMENT FOR')) {
            continue;
          }
          
          console.log(`✓ Row ${i}: Found SEPA payment, Status: ${status}`);
          
          // Verificar se status é APENAS "OK" (não processar "Pendente")
          const statusUpper = status ? status.toString().toUpperCase() : '';
          if (!statusUpper || statusUpper !== 'OK') {
            console.log(`✗ Row ${i}: Status not OK: ${statusUpper} - SKIPPING`);
            continue;
          }
          
          console.log(`✓ Row ${i}: Status is OK, processing...`);

          
          // Extrair nome do cliente após "SEPA PAYMENT FOR"
          const clientNameMatch = descricao.match(/SEPA PAYMENT FOR\s+(.+)/i);
          if (!clientNameMatch || !clientNameMatch[1]) {
            errors.push({
              row: i + 1,
              error: 'Não foi possível extrair o nome do cliente da descrição'
            });
            continue;
          }
          
          const clientName = clientNameMatch[1].trim();
          
          // ⚡ Usar cache ao invés de query
          const client = allClients.find(c => 
            c.first_name.toLowerCase() === clientName.toLowerCase()
          );
          
          if (!client) {
            errors.push({
              row: i + 1,
              clientName,
              error: `Cliente "${clientName}" não encontrado no banco de dados`
            });
            continue;
          }
          
          // ⚡ Usar cache ao invés de query
          const clientContracts = allContracts.filter(c => c.client_id === client.id);
          
          if (clientContracts.length === 0) {
            errors.push({
              row: i + 1,
              clientName,
              error: `Cliente "${clientName}" não possui contratos`
            });
            continue;
          }
          
          // ⚡ Buscar todos os pagamentos pendentes do cliente em todos os seus contratos (usando cache)
          let oldestPendingPayment: Payment | null = null;
          let oldestDueDate: Date | null = null;
          
          for (const contract of clientContracts) {
            const payments = allPayments.filter(p => p.contract_id === contract.id);
            const pendingPayments = payments.filter(p => p.status === 'pending');
            
            for (const payment of pendingPayments) {
              const dueDate = new Date(payment.due_date);
              if (!oldestDueDate || dueDate < oldestDueDate) {
                oldestDueDate = dueDate;
                oldestPendingPayment = payment;
              }
            }
          }
          
          if (!oldestPendingPayment) {
            errors.push({
              row: i + 1,
              clientName,
              error: `Cliente "${clientName}" não possui pagamentos pendentes`
            });
            continue;
          }
          
          // Verificar se o valor bate (se houver valor na planilha)
          if (amountValue !== null && amountValue !== undefined && amountValue !== '') {
            let excelAmount: number;
            
            if (typeof amountValue === 'number') {
              excelAmount = Math.abs(amountValue); // Garantir valor positivo
            } else {
              // Remover símbolos de moeda (€, R$, $, etc.) e espaços
              const cleanedValue = amountValue.toString()
                .replace(/[€$R\s]/g, '')  // Remove €, $, R e espaços
                .replace(',', '.');         // Troca vírgula por ponto
              
              excelAmount = Math.abs(parseFloat(cleanedValue)); // Garantir valor positivo
            }
            
            if (!isNaN(excelAmount)) {
              // Comparar com tolerância de 0.01 para erros de arredondamento
              const difference = Math.abs(excelAmount - oldestPendingPayment.amount);
              if (difference > 0.01) {
                errors.push({
                  row: i + 1,
                  clientName,
                  amount: excelAmount,
                  error: `Valor da planilha (R$ ${excelAmount.toFixed(2)}) não corresponde ao valor do pagamento (R$ ${oldestPendingPayment.amount.toFixed(2)})`
                });
                continue;
              }
            }
          }
          
          // Dar baixa no pagamento com método "Stripe"
          const businessDay = getCurrentOrLastBusinessDay();
          const updatedPayment = await this.paymentRepository.update(oldestPendingPayment.id, {
            status: 'paid',
            paid_amount: oldestPendingPayment.amount,
            paid_date: businessDay,
            payment_method: 'Stripe'
          });
          
          if (!updatedPayment) {
            errors.push({
              row: i + 1,
              clientName,
              error: 'Erro ao atualizar o pagamento'
            });
            continue;
          }
          
          // ⚡ Buscar contrato para obter o número (usando cache)
          const contract = allContracts.find(c => c.id === oldestPendingPayment.contract_id);
          
          successfulPayments.push({
            clientName,
            amount: oldestPendingPayment.amount,
            contractNumber: contract?.contract_number || 'N/A',
            dueDate: new Date(oldestPendingPayment.due_date).toLocaleDateString('pt-BR'),
            paymentId: updatedPayment.id
          });
          
        } catch (rowError) {
          errors.push({
            row: i + 1,
            error: `Erro ao processar linha: ${rowError instanceof Error ? rowError.message : 'Erro desconhecido'}`
          });
        }
      }
      
      return {
        success: successfulPayments,
        errors
      };
      
    } catch (error) {
      console.error('Error processing Excel import:', error);
      throw createError(
        `Erro ao processar planilha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        500
      );
    }
  }

  async previewExcelImport(fileBuffer: Buffer): Promise<{
    matches: {
      excelRow: number;
      clientName: string;
      amount: number;
      description: string;
      status: string;
      matchedPayment: {
        paymentId: string;
        contractNumber: string;
        dueDate: string;
        amount: number;
        clientName: string;
      } | null;
      error?: string;
    }[];
    errors: {
      row: number;
      error: string;
    }[];
  }> {
    console.log('🔍 previewExcelImport CALLED! Buffer size:', fileBuffer.length);
    
    const matches: {
      excelRow: number;
      clientName: string;
      amount: number;
      description: string;
      status: string;
      matchedPayment: {
        paymentId: string;
        contractNumber: string;
        dueDate: string;
        amount: number;
        clientName: string;
      } | null;
      error?: string;
    }[] = [];
    
    const errors: {
      row: number;
      error: string;
    }[] = [];

    try {
      // Ler arquivo Excel
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw createError('Planilha vazia ou sem abas', 400);
      }
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converter para JSON
      const data: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (!data || data.length === 0) {
        throw createError('Planilha completamente vazia', 400);
      }
      
      if (data.length <= 1) {
        throw createError('Planilha vazia ou sem dados (apenas cabeçalho)', 400);
      }

      // Encontrar índices das colunas
      const headers = data[0] as string[];
      
      if (!headers || headers.length === 0) {
        throw createError('Cabeçalho da planilha vazio', 400);
      }
      
      const descricaoIndex = headers.findIndex(h => 
        h && h.toLowerCase().includes('descri')
      );
      const statusIndex = headers.findIndex(h => 
        h && (h.toLowerCase() === 'status' || h.toLowerCase() === 'ok')
      );
      const amountIndex = headers.findIndex(h => 
        h && (h.toLowerCase().includes('amount') || h.toLowerCase().includes('valor') || h.toLowerCase().includes('total'))
      );

      if (descricaoIndex === -1) {
        throw createError('Coluna "Descrição" não encontrada na planilha', 400);
      }

      if (statusIndex === -1) {
        throw createError('Coluna "Status" não encontrada na planilha', 400);
      }

      // Cache de dados
      console.log('📦 Loading all data into cache...');
      const allClients = await this.clientRepository.findAll();
      const allContracts = await this.contractRepository.findAll();
      const allPayments = await this.paymentRepository.findAll();
      console.log(`📦 Cache loaded: ${allClients.length} clients, ${allContracts.length} contracts, ${allPayments.length} payments`);

      // Processar cada linha
      console.log(`📊 Processing ${data.length - 1} rows for preview...`);
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        
        if (!row || row.length === 0) continue;
        
        try {
          const descricao = row[descricaoIndex];
          const status = row[statusIndex];
          const amountValue = amountIndex !== -1 ? row[amountIndex] : null;
          
          // Verificar se contém "SEPA PAYMENT FOR"
          if (!descricao || typeof descricao !== 'string' || !descricao.toUpperCase().includes('SEPA PAYMENT FOR')) {
            continue;
          }
          
          // Verificar se status é "OK"
          const statusUpper = status ? status.toString().toUpperCase() : '';
          if (!statusUpper || statusUpper !== 'OK') {
            continue;
          }

          // Extrair nome do cliente
          const clientNameMatch = descricao.match(/SEPA PAYMENT FOR\s+(.+)/i);
          if (!clientNameMatch || !clientNameMatch[1]) {
            errors.push({
              row: i + 1,
              error: 'Não foi possível extrair o nome do cliente da descrição'
            });
            continue;
          }
          
          const clientName = clientNameMatch[1].trim();
          
          // Buscar cliente
          const client = allClients.find(c => 
            c.first_name.toLowerCase() === clientName.toLowerCase()
          );
          
          let matchedPayment = null;
          let errorMessage: string | undefined = undefined;
          let excelAmount = 0;

          // Processar valor do Excel
          if (amountValue !== null && amountValue !== undefined && amountValue !== '') {
            if (typeof amountValue === 'number') {
              excelAmount = Math.abs(amountValue);
            } else {
              const cleanedValue = amountValue.toString()
                .replace(/[€$R\s]/g, '')
                .replace(',', '.');
              excelAmount = Math.abs(parseFloat(cleanedValue));
            }
          }
          
          if (!client) {
            errorMessage = `Cliente "${clientName}" não encontrado no banco de dados`;
          } else {
            // Buscar contratos do cliente
            const clientContracts = allContracts.filter(c => c.client_id === client.id);
            
            if (clientContracts.length === 0) {
              errorMessage = `Cliente "${clientName}" não possui contratos`;
            } else {
              // Buscar o pagamento pendente mais antigo
              let oldestPendingPayment: Payment | null = null;
              let oldestDueDate: Date | null = null;
              
              for (const contract of clientContracts) {
                const payments = allPayments.filter(p => p.contract_id === contract.id);
                const pendingPayments = payments.filter(p => p.status === 'pending');
                
                for (const payment of pendingPayments) {
                  const dueDate = new Date(payment.due_date);
                  if (!oldestDueDate || dueDate < oldestDueDate) {
                    oldestDueDate = dueDate;
                    oldestPendingPayment = payment;
                  }
                }
              }
              
              if (!oldestPendingPayment) {
                errorMessage = `Cliente "${clientName}" não possui pagamentos pendentes`;
              } else {
                // Verificar se o valor bate
                if (excelAmount > 0) {
                  const difference = Math.abs(excelAmount - oldestPendingPayment.amount);
                  if (difference > 0.01) {
                    errorMessage = `Valor da planilha (€${excelAmount.toFixed(2)}) não corresponde ao valor do pagamento (€${oldestPendingPayment.amount.toFixed(2)})`;
                  }
                }
                
                // Se não houver erro, criar o match
                if (!errorMessage) {
                  const contract = allContracts.find(c => c.id === oldestPendingPayment!.contract_id);
                  matchedPayment = {
                    paymentId: oldestPendingPayment.id,
                    contractNumber: contract?.contract_number || 'N/A',
                    dueDate: new Date(oldestPendingPayment.due_date).toLocaleDateString('pt-BR'),
                    amount: oldestPendingPayment.amount,
                    clientName: client.first_name
                  };
                }
              }
            }
          }
          
          matches.push({
            excelRow: i + 1,
            clientName,
            amount: excelAmount,
            description: descricao,
            status: statusUpper,
            matchedPayment,
            error: errorMessage
          });
          
        } catch (rowError) {
          errors.push({
            row: i + 1,
            error: `Erro ao processar linha: ${rowError instanceof Error ? rowError.message : 'Erro desconhecido'}`
          });
        }
      }
      
      return {
        matches,
        errors
      };
      
    } catch (error) {
      console.error('Error processing Excel preview:', error);
      throw createError(
        `Erro ao processar planilha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        500
      );
    }
  }

  async confirmExcelImport(paymentIds: string[]): Promise<{
    success: {
      paymentId: string;
      clientName: string;
      amount: number;
      contractNumber: string;
      dueDate: string;
    }[];
    errors: {
      paymentId: string;
      error: string;
    }[];
  }> {
    console.log('✅ confirmExcelImport CALLED! Processing', paymentIds.length, 'payments');
    
    const successfulPayments: {
      paymentId: string;
      clientName: string;
      amount: number;
      contractNumber: string;
      dueDate: string;
    }[] = [];
    
    const errors: {
      paymentId: string;
      error: string;
    }[] = [];

    // Cache de dados
    const allContracts = await this.contractRepository.findAll();
    const allClients = await this.clientRepository.findAll();
    const businessDay = getCurrentOrLastBusinessDay();

    for (const paymentId of paymentIds) {
      try {
        // Buscar o pagamento
        const payment = await this.paymentRepository.findById(paymentId);
        
        if (!payment) {
          errors.push({
            paymentId,
            error: 'Pagamento não encontrado'
          });
          continue;
        }

        if (payment.status !== 'pending') {
          errors.push({
            paymentId,
            error: 'Pagamento já foi processado'
          });
          continue;
        }

        // Atualizar o pagamento
        const updatedPayment = await this.paymentRepository.update(paymentId, {
          status: 'paid',
          paid_amount: payment.amount,
          paid_date: businessDay,
          payment_method: 'Stripe'
        });
        
        if (!updatedPayment) {
          errors.push({
            paymentId,
            error: 'Erro ao atualizar o pagamento'
          });
          continue;
        }

        // Buscar informações do contrato e cliente
        const contract = allContracts.find(c => c.id === payment.contract_id);
        const client = contract ? allClients.find(c => c.id === contract.client_id) : null;
        
        successfulPayments.push({
          paymentId: updatedPayment.id,
          clientName: client?.first_name || 'Desconhecido',
          amount: payment.amount,
          contractNumber: contract?.contract_number || 'N/A',
          dueDate: new Date(payment.due_date).toLocaleDateString('pt-BR')
        });
        
      } catch (rowError) {
        errors.push({
          paymentId,
          error: `Erro ao processar pagamento: ${rowError instanceof Error ? rowError.message : 'Erro desconhecido'}`
        });
      }
    }
    
    return {
      success: successfulPayments,
      errors
    };
  }
}