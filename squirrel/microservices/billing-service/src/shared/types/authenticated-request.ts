import type { Request } from 'express';

export interface AuthenticatedRequestUser {
  id: string;
  [key: string]: unknown;
}

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedRequestUser;
};
