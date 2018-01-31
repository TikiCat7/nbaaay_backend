import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, CreateDateColumn} from "typeorm";
import 'reflect-metadata';

@Entity()
export class Test {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'timestamp with time zone' })
    publishedAt: Date
}
