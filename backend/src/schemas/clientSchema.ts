import { z } from 'zod';

export const createClientSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  tax_id: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(['ativo', 'inativo']).optional(),
  rating: z.number().min(0).max(5).optional().nullable(),
}).strict();

export const updateClientSchema = createClientSchema.partial();
