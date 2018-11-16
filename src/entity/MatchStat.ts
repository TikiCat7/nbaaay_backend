import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne, AfterUpdate} from "typeorm";
import {Player} from './Player';
import {Match} from './Match';

@Entity()
export class MatchStat {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    matchIdFull: string;

    @Column()
    playerIdFull: string;

    @Column('jsonb')
    statsJSON: JSON;

    @OneToOne(type => Player)
    @JoinColumn()
    player: Player;

    @ManyToOne(type => Match, match => match.matchStats)
    match: Match;

    @AfterUpdate()
    updateCounters() {
      // console.log('something got updated');
    }
}
