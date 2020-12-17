import { Cascade, Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property, Unique } from "@mikro-orm/core";

import { BaseEntity } from "./BaseEntity";
import { Book } from ".";

@Entity()
export class Author extends BaseEntity {
    @PrimaryKey()
    id!: number;

    @Property()
    name: string;

    @Property()
    @Unique()
    email: string;

    @Property({ nullable: true })
    age?: number;

    @Property()
    termsAccepted = false;

    @Property({ nullable: true })
    born?: Date;

    @OneToMany(() => Book, (b) => b.author, { cascade: [Cascade.ALL] })
    books = new Collection<Book>(this);

    @ManyToOne(() => Book, { nullable: true })
    favouriteBook?: Book;

    constructor(name: string, email: string) {
        super();
        this.name = name;
        this.email = email;
    }
}
