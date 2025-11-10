import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  birthdate: z.string().refine((date) => !isNaN(Date.parse(date))),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const profileSchema = z.object({
  bio: z.string().max(500).optional(),
  interests: z.array(z.string()).max(10).optional(),
  gender: z.enum(['M', 'F', 'Other']),
  looking_for: z.enum(['M', 'F', 'Other', 'All']),
  photos: z.array(z.string().url()).max(6).optional(),
});

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
  };
};
