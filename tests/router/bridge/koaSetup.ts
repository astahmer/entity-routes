import axios from "axios";
import { AddressInfo } from "net";
import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import { createTestConnection } from "@@/tests/testConnection";
import { makeKoaEntityRouters, getAppRoutes } from "@/index";
import { log } from "@/functions/utils";

export async function setupKoaApp(entities: Function[]) {
    const connection = await createTestConnection(entities);

    const bridgeRouters = await makeKoaEntityRouters({ connection, entities });
    const app = new Koa();
    app.use(bodyParser());

    // Register all routes on koa server
    bridgeRouters.forEach((router) => app.use(router.instance.routes()));

    const server = app.listen(); // random port
    const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const client = axios.create({ baseURL });
    return { baseURL, server, client };
}
