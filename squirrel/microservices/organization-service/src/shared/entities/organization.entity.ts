import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TeamEntity } from './team.entity';
import { OrganizationMemberEntity } from './organization-member.entity';
import { OrganizationInviteEntity } from './organization-invite.entity';
import { SharedWorkspaceEntity } from './shared-workspace.entity';

@Entity({ name: 'organizations' })
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => TeamEntity, (team) => team.organization)
  teams?: TeamEntity[];

  @OneToMany(() => OrganizationMemberEntity, (member) => member.organization)
  members?: OrganizationMemberEntity[];

  @OneToMany(() => OrganizationInviteEntity, (invite) => invite.organization)
  invites?: OrganizationInviteEntity[];

  @OneToMany(() => SharedWorkspaceEntity, (sharedWorkspace) => sharedWorkspace.organization)
  sharedWorkspaces?: SharedWorkspaceEntity[];
}
