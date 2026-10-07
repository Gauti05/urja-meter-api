import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (axios.isAxiosError(err)) {
    console.error('Upstream error:', err.message);
    res.status(502).json({
      error: {
        code: 'UPSTREAM_ERROR',
        message: 'Failed to fetch meters from the Urja portal',
      },
    });
    return;
  }

  console.error('Unhandled error:', err instanceof Error ? err.stack : err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal Server Error',
    },
  });
};
