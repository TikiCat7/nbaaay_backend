import {Entity, PrimaryColumn, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany, ManyToMany, JoinTable} from "typeorm";
import { YoutubeVideo } from "./YoutubeVideo";
import { MatchStat } from "./MatchStat";

@Entity()
export class Player {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({ nullable: true, unique: true })
    playerId: string;

    @Column()
    number: string;

    @Column()
    position: string;

    @Column()
    height: string;

    @Column()
    weight: string;

    @Column()
    birthdate: string;

    @Column()
    age: string;

    @Column()
    teamId: string;

    @Column()
    teamTriCode: string;

    @Column()
    teamName: string;

    @ManyToMany(type => YoutubeVideo, youtubevideos => youtubevideos.player)
    youtubevideos: YoutubeVideo[];

    @OneToMany(type => MatchStat, matchStats => matchStats.player)
    matchStats: MatchStat[];
}
