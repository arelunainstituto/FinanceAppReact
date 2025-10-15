import { PaymentRepository, PaginationOptions, PaginatedResult, PaymentFilters } from '../repositories/paymentRepository';
import { ContractRepository } from '../repositories/contractRepository';
import { Payment } from '../models';
import { createError } from '../middlewares/errorHandler';
import { getCurrentOrLastBusinessDay } from '../utils/dateUtils';

export class PaymentService {
  private paymentRepository: PaymentRepository;
  private contractRepository: ContractRepository;

  constructor() {
    this.paymentRepository = new PaymentRepository();
    this.contractRepository = new ContractRepository();
  }

  async getAllPayments(): Promise<Payment[]> {
    return this.paymentRepository.findAll();
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
    // Check if payment exists
    const existingPayment = await this.paymentRepository.findById(id);
    if (!existingPayment) {
      throw createError('Payment not found', 404);
    }

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

    const updatedPayment = await this.paymentRepository.update(id, cleanedData);
    if (!updatedPayment) {
      throw createError('Failed to update payment', 500);
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

    // Calcular valor final da parcela após aplicar saldo positivo
    const finalInstallmentValue = Math.max(0, originalAmount - usePositiveBalance);
    
    // Validar se o valor pago é positivo
    if (amount <= 0) {
      throw createError('Payment amount must be greater than zero', 400);
    }

    let contractUpdated = false;
    let newPositiveBalance = contractPositiveBalance - usePositiveBalance;
    let newNegativeBalance = contractNegativeBalance;
    let message = '';
    
    // Caso 1: Pagamento parcial (menor que o valor da parcela)
    if (amount < finalInstallmentValue) {
      const remainingDebt = finalInstallmentValue - amount;
      
      // Atualizar pagamento como pago com valor parcial e data automática
      const businessDay = getCurrentOrLastBusinessDay();
      const updatedPayment = await this.paymentRepository.update(paymentId, {
        status: 'paid',
        paid_amount: amount + usePositiveBalance, // Valor efetivamente pago + saldo usado
        paid_date: businessDay,
        payment_method: paymentMethod
      });
      
      // Adicionar valor restante ao saldo negativo do contrato
      newNegativeBalance = contractNegativeBalance + remainingDebt;
      
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
      
      return {
        payment: updatedPayment!,
        contractUpdated,
        message
      };
    }
    
    // Caso 3: Pagamento excedente
    if (amount > finalInstallmentValue) {
      const excessAmount = amount - finalInstallmentValue;
      
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
          const remainingExcess = excessAmount - contractNegativeBalance;
          newNegativeBalance = 0;
          newPositiveBalance += remainingExcess;
          message = `Payment completed with excess. Debt of R$ ${contractNegativeBalance.toFixed(2)} cleared.`;
          
          if (remainingExcess > 0) {
            message += ` Remaining R$ ${remainingExcess.toFixed(2)} added to positive balance.`;
          }
          
          if (usePositiveBalance > 0) {
            message += ` Used R$ ${usePositiveBalance.toFixed(2)} from previous positive balance.`;
          }
        } else {
          // Excesso não cobre toda a dívida
          newNegativeBalance = contractNegativeBalance - excessAmount;
          message = `Payment completed with excess applied to debt. Remaining debt: R$ ${newNegativeBalance.toFixed(2)}`;
          
          if (usePositiveBalance > 0) {
            message += ` Used R$ ${usePositiveBalance.toFixed(2)} from positive balance.`;
          }
        }
      } else {
        // Não há dívida, adicionar excesso ao saldo positivo
        newPositiveBalance += excessAmount;
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
      
      return {
        payment: updatedPayment!,
        contractUpdated: true,
        message
      };
    }

    throw createError('Invalid payment amount', 400);
  }
}