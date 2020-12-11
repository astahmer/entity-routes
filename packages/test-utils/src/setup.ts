import { AddressInfo } from "net";

import axios from "axios";

import { EntityRouteOptions } from "@entity-routes/core";

import { makeTestEntityRouters } from "./adapter";
import { createTestConnection } from "./connection";
import { createTestServer } from "./server";

export async function setupTestApp(entities: Function[], options?: EntityRouteOptions) {
    const connection = await createTestConnection(entities);

    const bridgeRouters = await makeTestEntityRouters({ connection, entities, options });
    const app = createTestServer();

    // Register all routes on koa server
    bridgeRouters.forEach((router) => app.use(router.instance.make()));

    const server = app.listen(); // random port
    const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const client = axios.create({ baseURL });
    return { baseURL, server, client };
}
