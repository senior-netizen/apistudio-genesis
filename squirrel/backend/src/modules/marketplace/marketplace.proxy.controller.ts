import { All, Controller, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MarketplaceGatewayService } from './marketplace.gateway.service';
import { MarketplaceRequestContext } from './marketplace-api-key.middleware';

@Controller({ path: 'marketplace', version: '1' })
export class MarketplaceProxyController {
  constructor(private readonly gateway: MarketplaceGatewayService) {}

  @All(':apiId/proxy')
  async proxy(@Param('apiId') apiId: string, @Req() req: Request, @Res() res: Response) {
    const context = (req as any).marketplace as MarketplaceRequestContext | undefined;
    if (!context) {
      res.status(401).json({ code: 'API_KEY_REQUIRED', message: 'Marketplace API key missing' });
      return;
    }
    const result = await this.gateway.proxy(apiId, req, context);
    res.status(result.status);
    if (result.cookies && result.cookies.length > 0) {
      res.setHeader('set-cookie', result.cookies);
    }
    for (const [key, value] of Object.entries(result.headers)) {
      if (key.toLowerCase() === 'set-cookie') continue;
      res.setHeader(key, value as any);
    }
    res.send(result.body);
  }
}
