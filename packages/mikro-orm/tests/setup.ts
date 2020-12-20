import { AddressInfo } from "net";

import { RequestContext } from "@mikro-orm/core";
import axios from "axios";
import Koa from "koa";
import bodyParser from "koa-bodyparser";

import { EntityRouteOptions } from "@entity-routes/core";
import { makeKoaEntityRouters } from "@entity-routes/koa";

import { MikroOrmProvider } from "../src";
import { createTestConnection } from "./connection";

export async function setupTestApp(entities: Function[], options?: EntityRouteOptions) {
    const orm = await createTestConnection(entities);
    const ormProvider = new MikroOrmProvider(orm);

    const bridgeRouters = await makeKoaEntityRouters({ ormProvider, entities, options });
    const app = new Koa();
    app.use(bodyParser());
    app.use((_ctx, next) => RequestContext.createAsync(orm.em, next));

    // Register all routes on koa server
    bridgeRouters.forEach((router) => app.use(router.instance.routes()));

    const server = app.listen(); // random port
    const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const client = axios.create({ baseURL });
    return { baseURL, server, client, ormProvider };
}
