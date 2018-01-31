import {Entity, PrimaryGeneratedColumn, Column, ManyToOne} from "typeorm";
import {Match} from './Match';

@Entity()
export class Streamable {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    matchId: string;

    @Column()
    title: string;

    @Column()
    created: string;

    @Column({ type: 'timestamp with time zone' })
    createdISODate: Date;

    @Column()
    postId: string;

    @Column()
    numComments: string;

    @Column()
    score: string;

    @Column()
    author: string;

    @Column({ unique: true })
    url: string;

    @Column('jsonb', {select: false})
    fullCommentsFromReddit: any;

    @Column('jsonb', {select: false})
    topComments: any;

    @ManyToOne(type => Match, match => match.streamables)
    match: Match;
}
