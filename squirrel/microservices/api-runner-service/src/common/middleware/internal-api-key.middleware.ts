import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class InternalApiKeyMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
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
