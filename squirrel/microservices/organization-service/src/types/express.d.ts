// Extend the Express request type so controllers can access the authenticated user injected by guards/middleware.
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id?: string;
      [key: string]: unknown;
    };
  }
}
