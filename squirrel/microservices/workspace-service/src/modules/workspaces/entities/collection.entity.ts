import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Project } from './project.entity';
import { Request } from './request.entity';

@Entity('collections')
export class Collection {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    projectId: string;

    @ManyToOne(() => Project, (project) => project.collections, { onDelete: 'CASCADE' })
    project: Project;

    @Column({ length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'int', default: 0 })
    position: number;

    @OneToMany(() => Request, (request) => request.collection, { cascade: true })
    requests: Request[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
