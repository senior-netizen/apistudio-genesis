import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('mocks')
export class Mock {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @Column({ length: 10 })
    method: string;

    @Column({ type: 'text' })
    url: string;

    @Column({ type: 'boolean', default: true })
    enabled: boolean;

    @Column({ type: 'int' })
    responseStatus: number;

    @Column({ type: 'jsonb', default: '[]' })
    responseHeaders: any[];

    @Column({ type: 'text' })
    responseBody: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
