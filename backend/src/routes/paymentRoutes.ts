import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();
const paymentController = new PaymentController();

// All payment routes require authentication
router.use(authenticateToken);

// Specific routes first (to avoid conflicts with /:id)
router.get('/paginated', paymentController.getAllPaymentsPaginated);
router.get('/contract/:contractId', paymentController.getPaymentsByContractId);
router.get('/contract/:contractId/paginated', paymentController.getPaymentsByContractIdPaginated);
router.get('/status/:status', paymentController.getPaymentsByStatus);
router.get('/overdue/list', paymentController.getOverduePayments);
router.get('/statistics/summary', paymentController.getPaymentStatistics);

// Generic routes last
router.get('/', paymentController.getAllPaymentsPaginated);
router.get('/all', paymentController.getAllPayments);
router.get('/export', paymentController.getAllPaymentsForExport);
router.get('/:id', paymentController.getPaymentById);
router.post('/', paymentController.createPayment);
router.put('/:id', paymentController.updatePayment);
router.delete('/:id', paymentController.deletePayment);
router.patch('/:id/mark-paid', paymentController.markPaymentAsPaid);
router.post('/:id/manual-payment', paymentController.processManualPayment);

export default router;