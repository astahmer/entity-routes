import { Context } from "koa";

export const makeKoaContextAdapter = (ctx: Context) => new KoaContextAdapter(ctx)
export class KoaContextAdapter {
    req: Context["req"];
    res: Context["res"];
    constructor(public ctx: Context) {
        this.req = ctx.req;
        this.res = ctx.res;
    }

    get method() {
        return this.req.method;
    }
    get requestBody() {
        return this.ctx.request.body;
    }
    get params() {
        return this.ctx.params;
    }
    get searchParams() {
        return new URLSearchParams(this.ctx.URL.search);
    }
    get query() {
        return this.ctx.query
    }
    get state() {
        return this.ctx.state;
    }
    get responseBody() {
        return this.ctx.body;
    }
    set responseBody(value: any) {
        this.ctx.body = value;
    }
    get status() {
        return this.ctx.status;
    }
    set status(value) {
        this.ctx.status = value;
    }
}

