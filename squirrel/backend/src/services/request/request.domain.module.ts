import { Module } from "@nestjs/common";
import { RequestsModule } from "../../modules/requests/requests.module";
import { RequestDomainService } from "./request.domain.service";

@Module({
  imports: [RequestsModule],
  providers: [RequestDomainService],
  exports: [RequestDomainService],
})
export class RequestDomainModule {}
