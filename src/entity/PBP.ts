import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class PBP {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    matchId: string;

    @Column()
    url: string;

    @Column('jsonb')
    pbpData: JSON;
}
