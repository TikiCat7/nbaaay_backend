import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class MatchStats {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    matchId: string;

    @Column()
    url: string;

    @Column('jsonb')
    matchStats: JSON;
}
