import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'usage_events' })
export class UsageEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string | null;

  @Column({ name: 'organization_id', nullable: true })
  organizationId?: string | null;

  @Column()
  type!: string;

  @Column({ type: 'integer', default: 0 })
  amount!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
