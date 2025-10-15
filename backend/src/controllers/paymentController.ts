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
      const { id } = req.params;
      const { amount, usePositiveBalance, paymentMethod } = req.body;
      
      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Amount must be a positive number',
        });
        return;
      }

      // Validar usePositiveBalance se fornecido
      if (usePositiveBalance !== undefined && usePositiveBalance < 0) {
        res.status(400).json({
          success: false,
          message: 'Positive balance usage cannot be negative',
        });
        return;
      }

      const result = await this.paymentService.processManualPayment(
        id, 
        amount, 
        usePositiveBalance || 0,
        paymentMethod
      );
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}