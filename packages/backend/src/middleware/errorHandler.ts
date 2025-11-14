import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(err);

  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation error',
      issues: err.issues
    });
    return;
  }

  const status = (err as { status?: number }).status ?? 500;
  const message = (err as { message?: string }).message ?? 'Internal server error';

  res.status(status).json({ message });
};
