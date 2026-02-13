import { Module } from "@nestjs/common";
import { WorkspacesModule } from "../../modules/workspaces/workspaces.module";
import { WorkspaceDomainService } from "./workspace.domain.service";

@Module({
  imports: [WorkspacesModule],
  providers: [WorkspaceDomainService],
  exports: [WorkspaceDomainService],
})
export class WorkspaceDomainModule {}
