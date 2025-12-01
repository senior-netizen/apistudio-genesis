import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TeamEntity } from './team.entity';
import { TeamRole } from '../constants/organization-roles';

@Entity({ name: 'team_members' })
export class TeamMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 32 })
  role!: TeamRole;

  @ManyToOne(() => TeamEntity, (team) => team.members, { onDelete: 'CASCADE' })
  team!: TeamEntity;
}
