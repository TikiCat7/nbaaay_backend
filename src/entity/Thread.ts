import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class Thread {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    author: string;

    @Column()
    created: string;

    @Column('int')
    ups: number;

    @Column('int')
    down: number;

    @Column('int')
    score: number;

    @Column({ unique: true })
    matchId: string;

    @Column()
    url: string;

    @Column()
    title: string;

    @Column('int')
    numComments: number;

    @Column()
    postId: string;

    @Column('jsonb', { select: false })
    fullCommentsFromReddit: any;

    @Column('jsonb', { select: false })
    topComments: any;

}
