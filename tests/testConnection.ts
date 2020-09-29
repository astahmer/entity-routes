import { Connection, createConnection, getConnection } from "typeorm";
import { QueryParams, Context, deepMerge, RequestContextWithState, RequestState } from "@/index";

let connection: Connection;

export async function createTestConnection(entities: Function[]) {
    try {
        getConnection()?.isConnected && (await closeTestConnection());
    } catch (error) {}
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

export const makeTestCtx = <State extends object>(ctx?: Partial<MockContext<State>>) =>
    deepMerge({}, ctx || {}, {
        params: {},
        request: { body: {} },
        query: {},
        state: {},
        status: undefined as number,
        body: undefined as any,
    }) as MockContext<State>;

export const makeReqCtxWithState = (requestContext: RequestContextWithState) =>
    makeTestCtx<RequestState>({ state: { requestContext } });
export type MockContext<State extends object = object> = {
    params: Record<string, string | number>;
    request: { body: any };
    query: QueryParams;
    state: Partial<State>;
    status: number;
    body: any;
} & Context;
