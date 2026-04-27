import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware to validate request body against a Zod schema.
 * Strips unknown fields (mass assignment protection) and returns 
 * structured validation errors.
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(400).json({
        error: 'Validation error',
        details: errors,
      });
      return;
    }

    // Replace body with parsed (sanitized) data — strips unknown fields
    req.body = result.data;
    next();
  };
};
