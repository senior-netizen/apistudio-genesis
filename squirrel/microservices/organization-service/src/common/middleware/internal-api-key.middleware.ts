import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { RequestWithUser } from '../types/request-with-user';

@Injectable()
export class InternalApiKeyMiddleware implements NestMiddleware {
  use(req: RequestWithUser, _res: Response, next: () => void) {
    if (req.path === '/health') {
      return next();
    }

    const incomingKey = req.headers['x-internal-key'];

    if (!incomingKey || incomingKey !== process.env.SQUIRREL_INTERNAL_KEY) {
      throw new UnauthorizedException('Missing or invalid internal API key');
    }

    next();
  }
}
