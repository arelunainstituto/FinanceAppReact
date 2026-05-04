import { Router } from 'express';
import { ContractController } from '../controllers/contractController';
import { authenticateToken } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createContractSchema, updateContractSchema } from '../schemas/contractSchema';

const router = Router();
const contractController = new ContractController();

// All contract routes require authentication
router.use(authenticateToken);

// Contract CRUD routes
router.get('/recent', contractController.getRecentContracts);
router.get('/', contractController.getAllContracts);
router.get('/:id', contractController.getContractById);
router.get('/:id/details', contractController.getContractDetails);
router.get('/:id/balances', contractController.getContractBalances);
router.get('/:id/stripe-sync-preview', contractController.getStripeSyncPreview);
router.post('/:id/stripe-sync', contractController.syncStripe);
router.post('/', validate(createContractSchema), contractController.createContract);
router.put('/:id', validate(updateContractSchema), contractController.updateContract);
router.delete('/:id', contractController.deleteContract);

// Bulk operations
router.delete('/:id/payments', contractController.deleteContractPayments);

// Additional routes for filtering
router.get('/client/:clientId', contractController.getContractsByClientId);
router.get('/status/:status', contractController.getContractsByStatus);

export default router;