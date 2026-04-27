import { z } from 'zod';

export const createPaymentSchema = z.object({
  contract_id: z.string().uuid('Invalid contract ID format'),
  amount: z.number().positive('Payment amount must be positive'),
  due_date: z.string().or(z.date()),
  status: z.enum(['pending', 'paid', 'overdue', 'failed', 'renegociado']).optional(),
  payment_method: z.string().max(50).optional().nullable(),
  payment_type: z.enum(['normalPayment', 'downPayment']).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  external_id: z.string().max(255).optional().nullable(),
  paid_date: z.string().or(z.date()).optional().nullable(),
  paid_amount: z.number().min(0).optional().nullable(),
}).strict();

export const updatePaymentSchema = createPaymentSchema.partial();

export const manualPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  usePositiveBalance: z.number().min(0).optional(),
  paymentMethod: z.string().max(50).optional(),
}).strict();

export const confirmImportSchema = z.object({
  paymentIds: z.array(z.string().uuid('Invalid payment ID')).min(1, 'At least one payment ID is required'),
}).strict();
