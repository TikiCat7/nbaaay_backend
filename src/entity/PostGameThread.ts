import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class PostGameThread {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    author: string;

    @Column()
    created: string;

    @Column()
    ups: string;

    @Column()
    down: string;

    @Column()
    score: string;

    @Column({ unique: true })
    matchId: string;

    @Column()
    url: string;

    @Column()
    title: string;

    @Column()
    numComments: string;

    @Column()
    postId: string;

    @Column('jsonb', { select: false })
    fullCommentsFromReddit: any;

    @Column('jsonb', { select: false })
    topComments: any;

}
