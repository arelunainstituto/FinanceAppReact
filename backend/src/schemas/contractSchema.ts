import { z } from 'zod';

const dateRegex = /^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})$/;

export const createContractSchema = z.object({
  client_id: z.string().uuid('Invalid client ID format'),
  contract_number: z.string().max(100).optional().nullable(),
  value: z.number().positive('Contract value must be positive'),
  down_payment: z.number().min(0).optional().nullable(),
  number_of_payments: z.number().int().min(0).optional().nullable(),
  start_date: z.string().regex(dateRegex, 'Date must be in DD/MM/YYYY or YYYY-MM-DD format').optional().nullable(),
  end_date: z.string().regex(dateRegex, 'Date must be in DD/MM/YYYY or YYYY-MM-DD format').optional().nullable(),
  status: z.enum(['ativo', 'liquidado', 'cancelado', 'suspenso']).optional(),
  notes: z.string().max(2000).optional().nullable(),
  payment_method: z.string().max(50).optional().nullable(),
  payment_method_id: z.string().max(255).optional().nullable(),
  positive_balance: z.number().min(0).optional().nullable(),
  negative_balance: z.number().min(0).optional().nullable(),
}).strict();

export const updateContractSchema = createContractSchema.partial();
