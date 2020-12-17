import { Cascade, Collection, Entity, ManyToMany, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";

import { BaseEntity } from "./BaseEntity";
import { Author, BookTag, Publisher } from "./index";

@Entity()
export class Book extends BaseEntity {
    @PrimaryKey()
    id!: number;

    @Property()
    title: string;

    @ManyToOne(() => Author)
    author: Author;

    @ManyToOne(() => Publisher, { cascade: [Cascade.PERSIST, Cascade.REMOVE], nullable: true })
    publisher?: Publisher;

    @ManyToMany(() => BookTag)
    tags = new Collection<BookTag>(this);

    @Property({ nullable: true })
    metaObject?: object;

    @Property({ nullable: true })
    metaArray?: any[];

    @Property({ nullable: true })
    metaArrayOfStrings?: string[];

    constructor(title: string, author: Author) {
        super();
        this.title = title;
        this.author = author;
    }
}
