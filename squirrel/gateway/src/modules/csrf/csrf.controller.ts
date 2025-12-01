import { Controller, Get, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { randomBytes } from 'crypto';
import type { Response } from 'express';

@ApiTags('csrf')
@Controller({ path: 'auth', version: ['1', VERSION_NEUTRAL] })
export class CsrfController {
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  @Get('csrf')
  @ApiExcludeEndpoint()
  csrf(@Res() res: Response) {
    const csrfToken = this.generateToken();
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false,
      secure: (process.env.NODE_ENV ?? 'development') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.json({ csrfToken });
  }
}
