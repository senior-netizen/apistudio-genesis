import { Controller, Get } from '@nestjs/common';
import {
  OrganizationSchema,
  TeamSchema,
  MemberSchema,
  InviteSchema,
  SharedWorkspaceSchema,
  OrganizationBillingStateSchema,
  OrganizationUsageEventSchema,
  TeamMemberSchema,
} from '../../shared/schemas';

@Controller('organizations/schemas')
export class SchemasController {
  @Get()
  listSchemas() {
    return {
      organization: OrganizationSchema,
      team: TeamSchema,
      member: MemberSchema,
      invite: InviteSchema,
      sharedWorkspace: SharedWorkspaceSchema,
      organizationBillingState: OrganizationBillingStateSchema,
      organizationUsageEvent: OrganizationUsageEventSchema,
      teamMember: TeamMemberSchema,
    };
  }
}
