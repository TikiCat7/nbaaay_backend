import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, CreateDateColumn, OneToOne, JoinColumn, JoinTable} from "typeorm";
import {Match} from './Match';
import {Player} from './Player';

@Entity()
export class YoutubeVideo {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(type => Match, match => match.youtubevideos)
    match: Match;

    @ManyToMany(type => Player, player => player.youtubevideos)
    @JoinTable()
    player: Player[];

    @Column()
    channelTitle: string;

    @Column()
    channelId: string;

    @Column({unique: true})
    videoId: string;

    @Column()
    matchId: string;

    @Column({ type: 'timestamp with time zone' })
    publishedAt: Date;

    @Column()
    publishedAtString: string;

    @Column()
    description: string;

    @Column()
    title: string;

    @Column()
    thumbnailUrlLarge: string;

    @Column()
    thumbnailUrlMedium: string;

    @Column()
    thumbnailUrlSmall: string;

    @Column()
    videoType: string;
}
