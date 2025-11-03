import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runWithRequestContext } from '../utils/requestContext';

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const incomingId = (req.headers['x-request-id'] as string | undefined)?.trim();
  const requestId = incomingId && incomingId.length > 5 ? incomingId : uuidv4();

  res.setHeader('X-Request-Id', requestId);
  (req as any).requestId = requestId;
  res.locals.requestId = requestId;

  runWithRequestContext(requestId, () => {
    next();
  });
};
