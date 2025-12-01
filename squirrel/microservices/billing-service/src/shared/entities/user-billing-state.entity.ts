import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BillingPlanEntity } from './billing-plan.entity';

@Entity({ name: 'user_billing_state' })
export class UserBillingStateEntity {
  @PrimaryColumn({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => BillingPlanEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'current_plan_id' })
  currentPlan?: BillingPlanEntity | null;

  @Column({ name: 'current_plan_id', nullable: true })
  currentPlanId?: string | null;

  @Column({ name: 'credits_balance', type: 'integer', default: 0 })
  creditsBalance!: number;

  @Column({ name: 'renew_date', type: 'timestamptz', nullable: true })
  renewDate?: Date | null;

  @Column({ default: 'active' })
  status!: 'active' | 'past_due' | 'canceled' | 'paused';
}
