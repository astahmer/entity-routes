import axios from "axios";
import { AddressInfo } from "net";
import * as express from "express";
import * as bodyParser from "body-parser";
import { createTestConnection } from "@@/tests/testConnection";
import { makeExpressEntityRouters, EntityRouteOptions } from "@/index";

export async function setupExpressApp(entities: Function[], options?: EntityRouteOptions) {
    const connection = await createTestConnection(entities);

    const bridgeRouters = await makeExpressEntityRouters({ connection, entities, options });
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Register all routes on Express server
    bridgeRouters.forEach((router) => app.use(router.instance));

    const server = app.listen(); // random port
    const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const client = axios.create({ baseURL });
    return { baseURL, server, client };
}
