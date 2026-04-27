import { Router } from 'express';
import { ClientController } from '../controllers/clientController';
import { authenticateToken } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createClientSchema, updateClientSchema } from '../schemas/clientSchema';

const router = Router();
const clientController = new ClientController();

// All client routes require authentication
router.use(authenticateToken);

// Client CRUD routes
router.get('/', clientController.getAllClients);
router.get('/:id', clientController.getClientById);
router.post('/', validate(createClientSchema), clientController.createClient);
router.put('/:id', validate(updateClientSchema), clientController.updateClient);
router.delete('/:id', clientController.deleteClient);

export default router;