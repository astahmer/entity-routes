import { AddressInfo } from "net";

import axios from "axios";
import Koa from "koa";
import bodyParser from "koa-bodyparser";

import { EntityRouteOptions } from "@entity-routes/core";
import { makeKoaEntityRouters } from "@entity-routes/koa";
import { createTestConnection } from "@entity-routes/test-utils";

export async function setupTestKoaApp(entities: Function[], options?: EntityRouteOptions) {
    const connection = await createTestConnection(entities);

    const bridgeRouters = await makeKoaEntityRouters({ connection, entities, options });
    const app = new Koa();
    app.use(bodyParser());

    // Register all routes on koa server
    bridgeRouters.forEach((router) => app.use(router.instance.routes()));

    const server = app.listen(); // random port
    const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const client = axios.create({ baseURL });
    return { baseURL, server, client };
}
