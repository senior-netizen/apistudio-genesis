import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { InfraModule } from '../../infra/infra.module';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceGatewayService } from './marketplace.gateway.service';
import { MarketplaceProxyController } from './marketplace.proxy.controller';
import { MarketplaceApiKeyMiddleware } from './marketplace-api-key.middleware';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [InfraModule, BillingModule],
  controllers: [MarketplaceController, MarketplaceProxyController],
  providers: [MarketplaceService, MarketplaceGatewayService, MarketplaceApiKeyMiddleware],
  exports: [MarketplaceService],
})
export class MarketplaceModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MarketplaceApiKeyMiddleware)
      .forRoutes(
        { path: 'marketplace/:apiId/proxy', method: RequestMethod.ALL },
        { path: 'v1/marketplace/:apiId/proxy', method: RequestMethod.ALL },
      );
  }
}
