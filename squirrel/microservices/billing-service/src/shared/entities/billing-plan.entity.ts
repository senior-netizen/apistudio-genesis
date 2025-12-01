import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'billing_plans' })
export class BillingPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ type: 'jsonb' })
  limits!: Record<string, unknown>;

  @Column({ name: 'monthly_price', type: 'numeric', precision: 10, scale: 2, default: 0 })
  monthlyPrice!: string;
}
