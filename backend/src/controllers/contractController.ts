import { Request, Response, NextFunction } from 'express';
import { ContractService } from '../services/contractService';

export class ContractController {
  private contractService: ContractService;

  constructor() {
    this.contractService = new ContractService();
  }

  getRecentContracts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contracts = await this.contractService.getRecentContracts(5);
      
      res.status(200).json({
        success: true,
        message: 'Recent contracts retrieved successfully',
        data: contracts,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllContracts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      console.log('🔍 Query parameters recebidos:', req.query);
      
      // Extrair filtros dos query parameters
      const filters = {
        search: req.query.search as string,
        status: req.query.status as string,
        client_id: req.query.client_id as string,
        client_name: req.query.client_name as string,
        client_email: req.query.client_email as string,
        client_phone: req.query.client_phone as string,
        tax_id: req.query.tax_id as string,
        contract_number: req.query.contract_number as string,
        // Novos campos
        local: req.query.local as string,
        area: req.query.area as string,
        gestora: req.query.gestora as string,
        medico: req.query.medico as string,
        // Filtros de valor
        value_min: req.query.value_min ? parseFloat(req.query.value_min as string) : undefined,
        value_max: req.query.value_max ? parseFloat(req.query.value_max as string) : undefined,
        // Filtros de data
        start_date_from: req.query.start_date_from as string,
        start_date_to: req.query.start_date_to as string,
        end_date_from: req.query.end_date_from as string,
        end_date_to: req.query.end_date_to as string,
        created_at_from: req.query.created_at_from as string,
        created_at_to: req.query.created_at_to as string,
        // Filtros de quantidade de parcelas
        number_of_payments_from: req.query.number_of_payments_from ? parseInt(req.query.number_of_payments_from as string) : undefined,
        number_of_payments_to: req.query.number_of_payments_to ? parseInt(req.query.number_of_payments_to as string) : undefined,
      };

      console.log('📋 Filtros extraídos:', filters);

      // Remover filtros vazios
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        if (value === undefined || value === null || value === '') {
          delete filters[key as keyof typeof filters];
        }
      });

      console.log('✅ Filtros após limpeza:', filters);

      // Se há filtros ou paginação, usar método paginado
      if (Object.keys(filters).length > 0 || page > 1 || limit !== 50) {
        const result = await this.contractService.getAllContractsPaginated({ page, limit }, filters);
        
        res.json({
          success: true,
          data: result.data,
          pagination: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages
          }
        });
      } else {
        // Caso contrário, usar método padrão
        const contracts = await this.contractService.getAllContracts();
        
        res.status(200).json({
          success: true,
          message: 'Contracts retrieved successfully',
          data: contracts,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  getContractById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const contract = await this.contractService.getContractById(id);
      
      res.status(200).json({
        success: true,
        message: 'Contract retrieved successfully',
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  };

  getContractsByClientId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId } = req.params;
      const contracts = await this.contractService.getContractsByClientId(clientId);
      
      res.status(200).json({
        success: true,
        message: 'Contracts retrieved successfully',
        data: contracts,
      });
    } catch (error) {
      next(error);
    }
  };

  createContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contractData = req.body;
      const contract = await this.contractService.createContract(contractData);
      
      res.status(201).json({
        success: true,
        message: 'Contract created successfully',
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  };

  updateContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const contractData = req.body;
      const contract = await this.contractService.updateContract(id, contractData);
      
      res.status(200).json({
        success: true,
        message: 'Contract updated successfully',
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.contractService.deleteContract(id);
      
      res.status(200).json({
        success: true,
        message: 'Contract deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getContractsByStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.params;
      const contracts = await this.contractService.getContractsByStatus(status);
      res.json(contracts);
    } catch (error) {
      next(error);
    }
  };

  getContractDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const contractDetails = await this.contractService.getContractDetails(id);
      res.json(contractDetails);
    } catch (error) {
      next(error);
    }
  };

  deleteContractPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.contractService.deleteContractPayments(id);
      
      res.status(200).json({
        success: true,
        message: 'Contract payments deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getContractBalances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const balances = await this.contractService.getContractBalances(id);
      
      res.status(200).json({
        success: true,
        message: 'Contract balances retrieved successfully',
        data: balances,
      });
    } catch (error) {
      next(error);
    }
  };
}