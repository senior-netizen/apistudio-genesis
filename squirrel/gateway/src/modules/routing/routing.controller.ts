import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RoutingService } from './routing.service';
import { randomBytes } from 'crypto';

@ApiTags('gateway')
@Controller({ path: '', version: '1' })
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @All('*')
  @ApiExcludeEndpoint()
  async proxy(@Req() req: Request, @Res() res: Response) {
    // Serve CSRF token directly without forwarding
    const path = (req.originalUrl || '').split('?')[0]?.replace(/\/+$/, '') ?? '';
    if (/^\/?api\/v\d+\/auth\/csrf$/.test(path) || /^\/?auth\/csrf$/.test(path) || /^\/?api\/auth\/csrf$/.test(path)) {
      const csrfToken = randomBytes(32).toString('hex');
      res.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false,
        secure: (process.env.NODE_ENV ?? 'development') === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      res.json({ csrfToken });
      return;
    }

    await this.routingService.forward(req, res);
  }
}
