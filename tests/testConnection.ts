import { Connection, createConnection } from "typeorm";

let connection: Connection;

export async function createTestConnection(entities: Function[]) {
    connection = await createConnection({
        type: "sqljs",
        entities,
        logging: false,
        dropSchema: true, // Isolate each test case
        synchronize: true,
    });
    return connection;
}
export async function closeTestConnection() {
    await connection?.close();
}
