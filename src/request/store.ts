import { v4 as uuidv4 } from "uuid";
import { Container } from "typedi";
import { ObjectLiteral } from "typeorm";

import { Context, NextFn } from "../router/bridge/ContextAdapter";
import { RequestContext, RequestState } from "../router/MiddlewareMaker";
import { QueryParams } from "../filters";

/** Map<uuid/ContextAdapter> for each request, last until request is done and then gets removed from the Map */
const requestStore = new Map<string, ContextWithState>();
Container.set("requestStore", requestStore);

const addRequestContext = (ctx: ContextWithState) => {
    const key = uuidv4();
    requestStore.set(key, ctx);
    ctx.state.requestId = key;
    return key;
};
const removeRequestContext = (key: string) => requestStore.delete(key);

/** Get request ContextAdapter from its unique key */
export const getRequestContext = (key: string) => requestStore.get(key);

export type EntityRouteState = ObjectLiteral & RequestState;
export type ContextWithState = Context<any, EntityRouteState>;
export type RequestContextWithState = RequestContext<any, QueryParams, EntityRouteState>;

/**
 * Add current request ContextAdapter to requestStore
 * So that it can be retrieved later from anywhere with its key in the request-lifespan
 * Remove entry from requestStore on request end
 */
export const addCtxToStoreMw = async (ctx: Context, next: NextFn) => {
    const key = addRequestContext(ctx as any);

    await next();

    removeRequestContext(key);
};
