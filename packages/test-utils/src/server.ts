import { IncomingMessage, Server, ServerResponse, createServer } from "http";

import { bodyParser } from "./body-parser";
import { compose } from "./compose";
import { TestContext, createTestContext } from "./context";

// Pretty much a mini-Koa server
// So we do not actually depend on koa or express for testing purpose

export function createTestServer(
    { withBodyParser }: { withBodyParser?: boolean } = { withBodyParser: true }
): TestServer {
    const stack: TestMiddleware[] = [].concat(withBodyParser ? bodyParser : []);

    const use = (fn: TestMiddleware) => stack.push(fn);
    const handler = (req: IncomingMessage, res: ServerResponse) =>
        handleRequest(createTestContext(req, res), compose(stack));
    const listen = (cb?: Function) => createServer(handler).listen(cb);

    return { use, listen };
}
export type TestServer = {
    use: (fn: TestMiddleware) => number;
    listen: (cb?: Function) => Server;
};

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type RouteConfig = { path: string; method: Method; name?: string; middlewares: TestMiddleware[] };
export type TestNextFn = () => void | Promise<void>;
export type TestMiddleware = (ctx: TestContext, next?: TestNextFn) => any | Promise<any>;

async function handleRequest(ctx: TestContext, next: TestMiddleware) {
    ctx.res.statusCode = 404;

    try {
        await next(ctx);
        return respond(ctx);
    } catch (err) {
        console.error(err);
    }
}

async function respond(ctx: TestContext) {
    if ("HEAD" === ctx.req.method) {
        return ctx.res.end();
    }

    const isText = typeof ctx.responseBody === "string";
    const contentType = isText ? "text/html" : "application/json";
    if (!ctx.res.headersSent) {
        ctx.res.writeHead(ctx.res.statusCode, { "Content-Type": contentType });
    }

    const body = isText ? ctx.responseBody : JSON.stringify(ctx.responseBody, null, 2);
    if (body && ctx.res.statusCode === 404) {
        ctx.res.statusCode = 200;
    }

    ctx.res.end(body || "");
}
