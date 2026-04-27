import { Router } from 'express';
import { StripeController } from '../controllers/stripeController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();
const stripeController = new StripeController();

// Authenticated route to obtain a SetupIntent client_secret.
// The frontend uses this to capture card/SEPA data via Stripe Embedded Payment Element.
router.post('/setup-intent', authenticateToken, stripeController.createSetupIntent);

export default router;
