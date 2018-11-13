import {Entity, PrimaryColumn, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany, CreateDateColumn, ObjectType} from "typeorm";
import {Thread} from './Thread';
import {PostGameThread} from './PostGameThread';
import { YoutubeVideo } from "./YoutubeVideo";
import { PBP } from "./PBP";
import { MatchStats } from "./MatchStats";
import { Streamable } from "./Streamable";

@Entity()
export class Match {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    matchId: string;

    @Column()
    isGameActivated: boolean;

    @Column()
    startDateEastern: string;

    @Column()
    startTimeUTCString: string;

    @Column({ type: 'timestamp with time zone' })
    startTimeUTC: Date;

    @Column({ type: 'timestamp with time zone'})
    endTimeUTC: Date;

    @Column()
    hTeamId: string;

    @Column()
    hTeamWins: string;

    @Column()
    hTeamLosses: string;

    @Column()
    hTeamTriCode: string;

    @Column()
    hTeamScore: string

    @Column()
    vTeamId: string;

    @Column()
    vTeamWins: string;

    @Column()
    vTeamLosses: string;

    @Column()
    vTeamTriCode: string;

    @Column()
    vTeamScore: string;

    @Column('int')
    statusNum: number;

    @Column({ nullable: true })
    gameClock: string;

    @Column({ nullable: true })
    currentPeriod: number;

    @Column({ nullable: true })
    periodType: number;

    @Column({ nullable: true })
    maxRegular: number;

    @Column({ nullable: true })
    isHalfTime: boolean;

    @Column({ nullable: true })
    isEndOfPeriod: boolean;

    @Column({ nullable: true, type: 'json' })
    hTeamQScore: any;

    @Column({ nullable: true, type: 'json' })
    vTeamQScore: any;

    @OneToOne(type => Thread)
    @JoinColumn()
    thread: Thread;

    @OneToOne(type => PostGameThread)
    @JoinColumn()
    postGameThread: PostGameThread;

    @OneToOne(type => PBP)
    @JoinColumn()
    pbp: PBP;

    @OneToOne(type => MatchStats)
    @JoinColumn()
    matchStats: MatchStats;

    @OneToMany(type => YoutubeVideo, youtubevideos => youtubevideos.match, { cascadeInsert: true, cascadeUpdate: true})
    youtubevideos: YoutubeVideo[];

    @OneToMany(type => Streamable, streamables => streamables.match, { cascadeInsert: true, cascadeUpdate: true})
    streamables: Streamable[];
}
