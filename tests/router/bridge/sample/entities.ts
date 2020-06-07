import { PrimaryGeneratedColumn, Entity, Column } from "typeorm";
import { EntityRoute, Groups } from "@/index";
import { IsString } from "class-validator";

export class AbstractEntity {
    @PrimaryGeneratedColumn()
    id: number;
}

@EntityRoute({ operations: ["create", "list"] })
@Entity()
export class User extends AbstractEntity {
    @Groups("all")
    @IsString()
    @Column()
    name: string;
}
