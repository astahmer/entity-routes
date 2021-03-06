import { IncomingMessage, ServerResponse } from "http";

import { ObjectLiteral } from "@entity-routes/shared";

export type Middleware = (ctx: Context, next: NextFn) => any;
export type BaseContext = { req: IncomingMessage; res: ServerResponse };
export type Context<QueryParams = any, State = ObjectLiteral> = BaseContext & ContextAdapter<QueryParams, State>;
export type NextFn = (err?: any) => void | Promise<any>;

export type ContextAdapter<QueryParams = any, State = ObjectLiteral> = {
    readonly method: string;
    readonly requestBody: any;
    readonly params: Record<string, string>;
    readonly query: QueryParams;
    readonly state: State;
    status: number;
    responseBody: any;
};
