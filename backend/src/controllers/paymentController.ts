import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/paymentService';

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  getAllPayments = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payments = await this.paymentService.getAllPayments();
      
      res.status(200).json({
        success: true,
        message: 'Payments retrieved successfully',
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  };

  getRecentPayments = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payments = await this.paymentService.getRecentPayments(5);
      
      res.status(200).json({
        success: true,
        message: 'Recent payments retrieved successfully',
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  };

  getUpcomingPayments = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payments = await this.paymentService.getUpcomingPayments(5);
      
      res.status(200).json({
        success: true,
        message: 'Upcoming payments retrieved successfully',
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllPaymentsForExport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extrair filtros dos query parameters
      const filters = {
        status: req.query.status as string,
        search: req.query.search as string,
        contractId: req.query.contractId as string,
        // Date filters
        due_date_from: req.query.due_date_from as string,
        due_date_to: req.query.due_date_to as string,
        paid_date_from: req.query.paid_date_from as string,
        paid_date_to: req.query.paid_date_to as string,
        created_at_from: req.query.created_at_from as string,
        created_at_to: req.query.created_at_to as string,
        // Amount filters
        amount_min: req.query.amount_min ? parseFloat(req.query.amount_min as string) : undefined,
        amount_max: req.query.amount_max ? parseFloat(req.query.amount_max as string) : undefined,
        // Payment method and type
        payment_method: req.query.payment_method as string,
        payment_type: req.query.payment_type as string,
        // Contract filters
        contract_number: req.query.contract_number as string,
        contract_status: req.query.contract_status as string,
        // Client filters
        client_name: req.query.client_name as string,
        client_email: req.query.client_email as string,
        client_phone: req.query.client_phone as string,
        tax_id: req.query.tax_id as string,
      };

      const payments = await this.paymentService.getAllPaymentsForExport(filters);
      
      res.status(200).json({
        success: true,
        message: 'Payments for export retrieved successfully',
        data: payments,
        total: payments.length,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllPaymentsPaginated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Extrair filtros dos query parameters
      const filters = {
        status: req.query.status as string,
        search: req.query.search as string,
        contractId: req.query.contractId as string,
        // Date filters
        due_date_from: req.query.due_date_from as string,
        due_date_to: req.query.due_date_to as string,
        paid_date_from: req.query.paid_date_from as string,
        paid_date_to: req.query.paid_date_to as string,
        created_at_from: req.query.created_at_from as string,
        created_at_to: req.query.created_at_to as string,
        // Amount filters
        amount_min: req.query.amount_min ? parseFloat(req.query.amount_min as string) : undefined,
        amount_max: req.query.amount_max ? parseFloat(req.query.amount_max as string) : undefined,
        // Payment method and type
        payment_method: req.query.payment_method as string,
        payment_type: req.query.payment_type as string,
        // Contract filters
        contract_number: req.query.contract_number as string,
        contract_status: req.query.contract_status as string,
        // Client filters
        client_name: req.query.client_name as string,
        client_email: req.query.client_email as string,
        client_phone: req.query.client_phone as string,
        tax_id: req.query.tax_id as string,
      };

      // Remover filtros vazios
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        if (value === undefined || value === null || value === '') {
          delete filters[key as keyof typeof filters];
        }
      });
      
      const result = await this.paymentService.getAllPaymentsPaginated({ page, limit }, filters);
      
      res.status(200).json({
        success: true,
        message: 'Paginated payments retrieved successfully',
        data: {
          data: result.data,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPreviousPage: result.hasPreviousPage
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getPaymentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const payment = await this.paymentService.getPaymentById(id);
      
      res.status(200).json({
        success: true,
        message: 'Payment retrieved successfully',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  };

  getPaymentsByContractId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { contractId } = req.params;
      const payments = await this.paymentService.getPaymentsByContractId(contractId);
      
      res.status(200).json({
        success: true,
        message: 'Payments retrieved successfully',
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  };

  getPaymentsByContractIdPaginated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { contractId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Extrair filtros dos query parameters
      const filters = {
        status: req.query.status as string,
        search: req.query.search as string
      };

      // Remover filtros vazios
      Object.keys(filters).forEach(key => {
        if (!filters[key as keyof typeof filters]) {
          delete filters[key as keyof typeof filters];
        }
      });
      
      const result = await this.paymentService.getPaymentsByContractIdPaginated(contractId, { page, limit }, filters);
      
      res.status(200).json({
        success: true,
        message: 'Paginated payments by contract retrieved successfully',
        data: {
          data: result.data,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPreviousPage: result.hasPreviousPage
        }
      });
    } catch (error) {
      next(error);
    }
  };

  createPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paymentData = req.body;
      const payment = await this.paymentService.createPayment(paymentData);
      
      res.status(201).json({
        success: true,
        message: 'Payment created successfully',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  };

  updatePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const paymentData = req.body;
      const payment = await this.paymentService.updatePayment(id, paymentData);
      
      res.status(200).json({
        success: true,
        message: 'Payment updated successfully',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  };

  deletePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.paymentService.deletePayment(id);
      
      res.status(200).json({
        success: true,
        message: 'Payment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getPaymentsByStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.params;
      const payments = await this.paymentService.getPaymentsByStatus(status as any);
      
      res.status(200).json({
        success: true,
        message: 'Payments retrieved successfully',
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  };

  getOverduePayments = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payments = await this.paymentService.getOverduePayments();
      
      res.status(200).json({
        success: true,
        message: 'Overdue payments retrieved successfully',
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  };

  markPaymentAsPaid = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.paymentService.markPaymentAsPaid(id);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getPaymentStatistics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const statistics = await this.paymentService.getPaymentStatistics();
      
      res.status(200).json({
        success: true,
        message: 'Payment statistics retrieved successfully',
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  };

  processManualPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔄 processManualPayment called');
      const { id } = req.params;
      const { amount, usePositiveBalance, paymentMethod } = req.body;
      
      console.log('📋 Request params:', { id, amount, usePositiveBalance, paymentMethod });
      
      if (!amount || amount <= 0) {
        console.log('❌ Invalid amount:', amount);
        res.status(400).json({
          success: false,
          message: 'Amount must be a positive number',
        });
        return;
      }

      // Validar usePositiveBalance se fornecido
      if (usePositiveBalance !== undefined && usePositiveBalance < 0) {
        console.log('❌ Invalid usePositiveBalance:', usePositiveBalance);
        res.status(400).json({
          success: false,
          message: 'Positive balance usage cannot be negative',
        });
        return;
      }

      console.log('🚀 Calling paymentService.processManualPayment...');
      const result = await this.paymentService.processManualPayment(
        id, 
        amount, 
        usePositiveBalance || 0,
        paymentMethod
      );
      
      console.log('✅ Payment service result:', result);
      console.log('📤 Sending response with status 200');
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
      
      console.log('✅ Response sent successfully');
    } catch (error) {
      console.log('❌ Error in processManualPayment:', error);
      next(error);
    }
  };

  importPaymentsFromExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('📥 importPaymentsFromExcel called');
      
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      console.log('📄 File uploaded:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const result = await this.paymentService.processExcelImport(req.file.buffer);
      
      console.log('✅ Import completed:', {
        successCount: result.success.length,
        errorCount: result.errors.length
      });
      
      res.status(200).json({
        success: true,
        message: `Importação concluída. ${result.success.length} pagamento(s) processado(s) com sucesso, ${result.errors.length} erro(s).`,
        data: result,
      });
    } catch (error) {
      console.log('❌ Error in importPaymentsFromExcel:', error);
      next(error);
    }
  };

  previewImportFromExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔍 previewImportFromExcel called');
      
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      console.log('📄 File uploaded for preview:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const result = await this.paymentService.previewExcelImport(req.file.buffer);
      
      console.log('✅ Preview completed:', {
        matchesCount: result.matches.length,
        errorCount: result.errors.length
      });
      
      res.status(200).json({
        success: true,
        message: `Pré-visualização concluída. ${result.matches.length} pagamento(s) encontrado(s), ${result.errors.length} erro(s).`,
        data: result,
      });
    } catch (error) {
      console.log('❌ Error in previewImportFromExcel:', error);
      next(error);
    }
  };

  confirmImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('✅ confirmImport called');
      
      const { paymentIds } = req.body;

      if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Lista de IDs de pagamentos não fornecida ou vazia',
        });
        return;
      }

      console.log('📋 Payment IDs to confirm:', paymentIds);

      const result = await this.paymentService.confirmExcelImport(paymentIds);
      
      console.log('✅ Confirmation completed:', {
        successCount: result.success.length,
        errorCount: result.errors.length
      });
      
      res.status(200).json({
        success: true,
        message: `Importação confirmada. ${result.success.length} pagamento(s) processado(s) com sucesso, ${result.errors.length} erro(s).`,
        data: result,
      });
    } catch (error) {
      console.log('❌ Error in confirmImport:', error);
      next(error);
    }
  };
}