import { MikroORM, Options } from "@mikro-orm/core";
import { SchemaGenerator, SqlEntityManager } from "@mikro-orm/knex";
import { SqlHighlighter } from "@mikro-orm/sql-highlighter";

import { getTestEntities } from "./entities";

const config: Options = {
    type: "sqlite",
    dbName: "test.db",
    // dbName: ":memory:",
    entities: getTestEntities(),
    highlighter: new SqlHighlighter(),
    // debug: ["query"],
    debug: false,
};

let orm: MikroORM;

export const closeTestConnection = () => orm?.close();
export async function createTestConnection(entities: Function[] = config.entities as Function[]) {
    const isConnected = await orm?.isConnected();
    isConnected && (await closeTestConnection());
    orm = await MikroORM.init({ ...config, entities });

    const schemaGenerator = new SchemaGenerator(orm.em as SqlEntityManager);
    await schemaGenerator.dropSchema();
    await schemaGenerator.createSchema();

    return orm;
}
