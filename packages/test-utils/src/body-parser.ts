import { IncomingMessage } from "http";

import { ObjectLiteral } from "@entity-routes/core";

import { TestContext } from "./context";
import { TestNextFn } from "./server";

const methodsWithBody = ["POST", "PUT", "PATCH"];
/** Ultra basic body parser for very basic testing purpose only, do NOT use in production */
export async function bodyParser(ctx: TestContext, next: TestNextFn) {
    if (methodsWithBody.includes(ctx.req.method)) {
        ctx.requestBody = await getRawBody(ctx.req).catch(console.warn);
    }
    next();
}

/** Only retrieves JSON request body */
async function getRawBody(req: IncomingMessage): Promise<ObjectLiteral> {
    return new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => {
            data += chunk;
        });
        req.on("end", () => {
            resolve(data ? JSON.parse(data) : null);
        });
    });
}
