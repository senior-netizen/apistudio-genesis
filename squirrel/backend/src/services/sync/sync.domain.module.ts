import { Module } from "@nestjs/common";
import { SyncModule } from "../../sync/sync.module";
import { SyncDomainService } from "./sync.domain.service";

@Module({
  imports: [SyncModule],
  providers: [SyncDomainService],
  exports: [SyncDomainService],
})
export class SyncDomainModule {}
