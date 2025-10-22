import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateToken } from '../middlewares/auth';
import multer from 'multer';

const router = Router();
const paymentController = new PaymentController();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Accept Excel files only
    const allowedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos Excel (.xlsx, .xls) são permitidos'));
    }
  }
});

// All payment routes require authentication
router.use(authenticateToken);

// Specific routes first (to avoid conflicts with /:id)
router.post('/import', upload.single('file'), paymentController.importPaymentsFromExcel);
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