import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { OrganizationRole } from '../constants/organization-roles';

@Entity({ name: 'organization_invites' })
export class OrganizationInviteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'invited_by_user_id', type: 'uuid' })
  invitedByUserId!: string;

  @Column({ type: 'varchar', length: 32 })
  role!: OrganizationRole;

  @Column({ type: 'varchar', length: 32 })
  status!: 'pending' | 'accepted' | 'revoked';

  @Column({ type: 'varchar', length: 255 })
  token!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => OrganizationEntity, (organization) => organization.invites, { onDelete: 'CASCADE' })
  organization!: OrganizationEntity;
}
