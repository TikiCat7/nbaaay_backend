import {Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn} from "typeorm";
import {Profile} from "./Profile";

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @OneToOne(type => Profile)
    @JoinColumn()
    profile: Profile;

}
