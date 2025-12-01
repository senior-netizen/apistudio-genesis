import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { SharedWorkspacePermission } from '../constants/organization-roles';

@Entity({ name: 'shared_workspaces' })
export class SharedWorkspaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 32 })
  permission!: SharedWorkspacePermission;

  @ManyToOne(() => OrganizationEntity, (organization) => organization.sharedWorkspaces, { onDelete: 'CASCADE' })
  organization!: OrganizationEntity;
}
