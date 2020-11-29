import { AddressInfo } from "net";

import axios from "axios";

import { TestMiddleware, TestServer } from "../src";

export const mwRespondWith = (body: string): TestMiddleware => async (ctx, next) => {
    ctx.responseBody = body;
    next();
};

export const getClient = (app: TestServer) => {
    const server = app.listen(); // random port
    const address = server.address() as AddressInfo;
    const baseURL = `http://127.0.0.1:${address.port}`;

    return axios.create({ baseURL });
};
