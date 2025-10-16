import { Router } from 'express';
import { ContractController } from '../controllers/contractController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();
const contractController = new ContractController();

// All contract routes require authentication
router.use(authenticateToken);

// Contract CRUD routes
router.get('/', contractController.getAllContracts);
router.get('/:id', contractController.getContractById);
router.get('/:id/details', contractController.getContractDetails);
router.get('/:id/balances', contractController.getContractBalances);
router.post('/', contractController.createContract);
router.put('/:id', contractController.updateContract);
router.delete('/:id', contractController.deleteContract);

// Bulk operations
router.delete('/:id/payments', contractController.deleteContractPayments);

// Additional routes for filtering
router.get('/client/:clientId', contractController.getContractsByClientId);
router.get('/status/:status', contractController.getContractsByStatus);

export default router;