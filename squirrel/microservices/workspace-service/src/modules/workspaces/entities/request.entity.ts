import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Collection } from './collection.entity';

@Entity('requests')
export class Request {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    collectionId: string;

    @ManyToOne(() => Collection, (collection) => collection.requests, { onDelete: 'CASCADE' })
    collection: Collection;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 10 })
    method: string;

    @Column({ type: 'text' })
    url: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    body: any;

    @Column({ type: 'jsonb', default: '[]' })
    headers: any[];

    @Column({ type: 'jsonb', default: '[]' })
    params: any[];

    @Column({ type: 'jsonb', nullable: true })
    auth: any;

    @Column({ type: 'jsonb', nullable: true })
    scripts: any;

    @Column({ type: 'jsonb', default: '[]' })
    tags: string[];

    @Column({ type: 'jsonb', default: '[]' })
    examples: any[];

    @Column({ type: 'int', default: 0 })
    position: number;

    @Column({ type: 'timestamp', nullable: true })
    lastRunAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
