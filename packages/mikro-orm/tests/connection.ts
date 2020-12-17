import { BaseEntity, EntityRepository, MikroORM, Options } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/knex";
import { SqlHighlighter } from "@mikro-orm/sql-highlighter";

import { Author, Book, BookTag, Publisher } from "./entities";

const config: Options = {
    type: "sqlite",
    dbName: "test.db",
    entities: [Author, Book, BookTag, Publisher, BaseEntity],
    highlighter: new SqlHighlighter(),
    debug: false,
};

const DI = {} as {
    orm: MikroORM;
    em: EntityManager;
    authorRepository: EntityRepository<Author>;
    bookRepository: EntityRepository<Book>;
};

export async function createTestConnection(entities: Function[] = config.entities as Function[]) {
    try {
        DI.orm?.isConnected && (await closeTestConnection());
    } catch (error) {
        // getRepository threw an error since it couldn't get a repo from constructor.name
        // TODO ?
    }

    DI.orm = await MikroORM.init({ ...config, entities });
    DI.em = DI.orm.em as EntityManager;
    DI.authorRepository = DI.orm.em.getRepository(Author);
    DI.bookRepository = DI.orm.em.getRepository(Book);
    return DI;
}

export async function closeTestConnection() {
    await DI?.orm?.close();
}
