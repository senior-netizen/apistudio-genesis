import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

type SessionData = {
  id: string;
  csrfToken?: string;
  [key: string]: unknown;
};

const sessionStore = new Map<string, SessionData>();
const SESSION_COOKIE_NAME = 'sessionId';

declare module 'express-serve-static-core' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Request {
    session?: SessionData;
  }
}

const sessionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incomingId = (req.cookies && req.cookies[SESSION_COOKIE_NAME]) as string | undefined;
  let sessionId = incomingId && sessionStore.has(incomingId) ? incomingId : undefined;

  if (!sessionId) {
    sessionId = randomUUID();
    sessionStore.set(sessionId, { id: sessionId });
  }

  const session = sessionStore.get(sessionId) as SessionData;
  req.session = session;

  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  next();
};

export default sessionMiddleware;
export { SESSION_COOKIE_NAME, sessionStore, type SessionData };
