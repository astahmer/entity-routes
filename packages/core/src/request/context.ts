import { MakeRequestContextMwArgs, RequestContext } from "../router";
import { GenericEntity } from "../types";
import { ContextWithState, addRequestContext } from "./store";

export function makeRequestContext<Entity extends GenericEntity>(
    { operation, subresourceRelations }: MakeRequestContextMwArgs,
    ctx: ContextWithState
) {
    addRequestContext(ctx as ContextWithState);

    if (subresourceRelations?.length) {
        subresourceRelations[0].id = parseInt(ctx.params[subresourceRelations[0].param]);
    }

    const { requestId } = ctx.state;
    const requestContext: RequestContext<Entity> = {
        requestId,
        ctx,
        operation,
        isUpdateOrCreate: ctx.requestBody && (ctx.method === "POST" || ctx.method === "PUT"),
        queryParams: ctx.query || {},
        subresourceRelations,
    };

    if (ctx.params.id) requestContext.entityId = parseInt(ctx.params.id);
    if (requestContext.isUpdateOrCreate) requestContext.values = ctx.requestBody;

    return requestContext;
}
