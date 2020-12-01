import { IncomingMessage, ServerResponse } from "http";

import { QueryParams } from "@entity-routes/core";

export const createTestContext = (req: IncomingMessage, res: ServerResponse): TestContext => ({
    req,
    res,
    params: {},
    requestBody: undefined,
    state: { responseBody: undefined },
    get responseBody() {
        return this.state.responseBody;
    },
    set responseBody(value) {
        this.state.responseBody = value;
        if (this.res.statusCode === 404) {
            this.res.statusCode = 200;
        }
    },
    get url() {
        return new URL("http://" + this.req.headers.host + this.req.url);
    },
    get searchParams() {
        return new URLSearchParams(this.url.search);
    },
    get queryParams() {
        const queryParams: QueryParams = {};
        (this.searchParams as URLSearchParams).forEach((value, key) => {
            if (!key.endsWith("[]")) {
                // single
                queryParams[key] = value;
            } else {
                // multiple
                const actualKey = key.slice(0, -2);
                const currentValue = queryParams[actualKey];
                const currentArray = Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : [];
                queryParams[actualKey] = [...currentArray, value];
            }
        });
        return queryParams;
    },
});

export type TestContext = {
    req: IncomingMessage;
    res: ServerResponse;
    params: Record<string, any>;
    state: Record<string, any> & { responseBody: any };
    requestBody: any;
    responseBody: any;
    url: URL;
    searchParams: URLSearchParams;
    queryParams: QueryParams;
};
