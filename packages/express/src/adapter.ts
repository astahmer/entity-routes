import { Request, Response } from "express";

import { ContextAdapter } from "@entity-routes/core";

export const makeExpressContextAdapter = (req: Request, res: Response) => new ExpressContextAdapter(req, res);

interface WithContext {
    req: Request;
    res: Response;
}
export interface ExpressContextAdapter extends ContextAdapter, WithContext {}
export class ExpressContextAdapter {
    constructor(public req: Request, public res: Response) {}

    get method() {
        return this.req.method;
    }
    get requestBody() {
        return this.req.body;
    }
    get params() {
        return this.req.params;
    }
    get URL() {
        return new URL("http://" + this.req.headers.host + this.req.url);
    }
    get searchParams() {
        return new URLSearchParams(this.URL.search);
    }
    get query() {
        return this.req.query;
    }
    get state() {
        return this.res.locals;
    }
    get responseBody() {
        return this.state.responseBody;
    }
    set responseBody(value: any) {
        this.res.locals.responseBody = value;
        this.res.send(value).end();
    }
    get status() {
        return this.res.statusCode;
    }
    set status(value) {
        this.res.status(value);
    }
}
