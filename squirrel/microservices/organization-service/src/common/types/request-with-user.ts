import { Request } from 'express';

// Minimal extension of Express Request to include auth context and basic fields used in controllers/middleware.
export type RequestWithUser = Request & {
  user?: { id?: string; [key: string]: unknown };
  headers: Record<string, unknown>;
  path?: string;
};
