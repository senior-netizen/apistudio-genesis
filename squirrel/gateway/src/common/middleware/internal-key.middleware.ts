import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class InternalKeyMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    delete req.headers['x-internal-key'];
    const internalKey = this.configService.get<string>('SQUIRREL_INTERNAL_KEY');
    if (internalKey) {
      (req as Request & { internalKey?: string }).internalKey = internalKey;
    }
    next();
  }
}
