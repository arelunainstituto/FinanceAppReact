import { z } from 'zod';

// Helper: transforms empty strings to null so optional form fields
// (which send '' when blank) pass validation instead of failing.
const emptyStringToNull = z.preprocess(
  (val) => (val === '' ? null : val),
  z.string().nullable().optional()
);

const emptyEmailToNull = z.preprocess(
  (val) => (val === '' ? null : val),
  z.string().email('Invalid email format').nullable().optional()
);

export const createClientSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().max(100).nullable().optional()
  ),
  email: emptyEmailToNull,
  phone: emptyStringToNull,
  mobile: emptyStringToNull,
  tax_id: emptyStringToNull,
  birth_date: emptyStringToNull,
  address: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().max(500).nullable().optional()
  ),
  city: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().max(100).nullable().optional()
  ),
  postal_code: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().max(20).nullable().optional()
  ),
  country: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().max(100).nullable().optional()
  ),
  notes: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().max(2000).nullable().optional()
  ),
  status: z.enum(['ativo', 'inativo']).optional(),
  rating: z.number().min(0).max(5).optional().nullable(),
}).strict();

export const updateClientSchema = createClientSchema.partial();

