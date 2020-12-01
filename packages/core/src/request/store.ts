import { ObjectLiteral } from "typeorm";
import { v4 as uuidv4 } from "uuid";

import {
    Context,
    GenericEntity,
    GroupsOperation,
    QueryParams,
    RequestContext,
    RequestState,
} from "@entity-routes/core";

/** Map<uuid/ContextAdapter> for each request, last until request is done and then gets removed from the Map */
const requestStore = new Map<string, ContextWithState>();

/**
 * Add current request ContextAdapter to requestStore
 * So that it can be retrieved later from anywhere with its key in the request-lifespan
 */
export const addRequestContext = (ctx: ContextWithState) => {
    const key = uuidv4();
    requestStore.set(key, ctx);
    ctx.state.requestId = key;
    return key;
};

/** Remove entry from requestStore on request end */
export const removeRequestContext = (key: string) => requestStore.delete(key);

/** Get request ContextAdapter from its unique key */
export const getRequestContext = (key: string) => requestStore.get(key);

export type EntityRouteState<
    Entity extends GenericEntity = GenericEntity,
    Operation extends GroupsOperation = GroupsOperation
> = ObjectLiteral & RequestState<Entity, Operation>;
export type ContextWithState<
    Entity extends GenericEntity = GenericEntity,
    Operation extends GroupsOperation = GroupsOperation
> = Context<any, EntityRouteState<Entity, Operation>>;
export type RequestContextWithState<
    Entity extends GenericEntity = GenericEntity,
    Operation extends GroupsOperation = GroupsOperation
> = RequestContext<any, Operation, QueryParams, EntityRouteState<Entity, Operation>>;
