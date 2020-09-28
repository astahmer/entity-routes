import { Container } from "typedi";

import { EntityErrorResponse } from "@/database/Persistor";
import { isDev, isObject, isType } from "@/functions/asserts";
import { MappingManager } from "@/mapping/MappingManager";
import { DeleteResult, Repository } from "typeorm";
import { GenericEntity } from "@/router/EntityRouter";
import { RouteController } from "@/router/RouteController";
import { CollectionResult, RequestContext, RequestState, RouteResponse } from "@/router/MiddlewareMaker";
import { ContextWithState, EntityRouteState } from "@/request";
import { Context, RouteControllerResult } from "@/router";
import { DecorateFn, Decorator } from "./Decorator";
import { setComputedPropsOnItem } from "./functions/setComputedPropsOnItem";
import { setSubresourcesIriOnItem } from "./functions/setSubresourcesIriOnItem";
import { BaseFlattenItemOptions, flattenItem, FlattenItemOptions } from "./functions/flattenItem";
import { ObjectLiteral } from "@/utils-types";
import { pipe } from "@/functions/utils";
import { ComparatorFn, deepSort } from "@/functions/object";

// TODO tests
/** Write response from result & decorators */
export class Writer<Entity extends GenericEntity> {
    get metadata() {
        return this.repository.metadata;
    }

    get mappingManager() {
        return Container.get(MappingManager);
    }

    get decorator() {
        return Container.get(Decorator);
    }

    constructor(private repository: Repository<Entity>, private options: RouteController<Entity>["options"] = {}) {}

    makeDecoratorFor<Fn = DecorateFn, Data = Fn extends DecorateFn<any, infer Data> ? Data : ObjectLiteral>(
        decorateFn: Fn,
        data: Data,
        item: Entity
    ) {
        return this.decorator.decorateItem({
            rootItem: item,
            rootMetadata: this.repository.metadata,
            data: data as any,
            decorateFn,
        });
    }

    /** Apply default & custom route decorators on item */
    async fromItem(baseItem: Entity, requestContext: RequestContext) {
        // TODO Decorate: custom

        const operation = requestContext.operation;
        const options = this.options.defaultWriterOptions;
        const flattenItemOptions = {
            operation,
            ...options,
            shouldOnlyFlattenNested: options?.shouldOnlyFlattenNested ?? requestContext.wasAutoReloaded,
        };
        const decorate = this.makeDecoratorFor.bind(this);

        // Decorator called only on objects item (!= flattened IRI/id)
        const decorateEntities = pipe(
            ...[
                options.shouldSetComputedPropsOnItem &&
                    ((item: any) => decorate(setComputedPropsOnItem, { operation }, item)),
                options.shouldSetSubresourcesIriOnItem &&
                    ((item: any) => decorate(setSubresourcesIriOnItem, { operation, useIris: options?.useIris }, item)),
            ].filter(Boolean)
        );

        // Flatten item and then decorate entity if not flattened
        const decorateWithFlatten = pipe(
            (item) => decorate(flattenItem, flattenItemOptions, item),
            (item) => (isObject(item) ? decorateEntities(item) : item)
        );

        // Either with flatten or directly entities
        const decorateFn = options.shouldEntityWithOnlyIdBeFlattenedToIri ? decorateWithFlatten : decorateEntities;
        const clone = await decorateFn(baseItem);

        // TODO test
        options.shouldSortItemKeys ? deepSort(clone, options.sortComparatorFn) : clone;

        return clone;
    }

    /** Apply the same process for each item for that collection */
    fromCollection(items: Entity[], requestContext: RequestContext) {
        return items.map((item) => this.fromItem(item, requestContext));
    }

    async makeResponse(ctx: ContextWithState, result: RouteControllerResult) {
        const { requestContext = {} as RequestContext<Entity> } = ctx.state as RequestState<Entity>;
        const operation = requestContext?.operation;

        let response: RouteResponse = { "@context": { operation, entity: this.metadata.tableName } };
        if (requestContext.isUpdateOrCreate) response["@context"].validationErrors = null;
        const args = { result, response, ctx, requestContext };

        try {
            await this.handleResult(args);
        } catch (error) {
            args.response["@context"].error = isDev() ? error.message : "Bad request";
            isDev() && console.error(error);
            ctx.status = 500;
        }

        return args.response;
    }

    /** Add keys depending on the route scope & result */
    private async handleResult(args: {
        result: RouteControllerResult;
        response: RouteResponse;
        ctx: Context<any, EntityRouteState>;
        requestContext: RequestContext<Entity>;
    }) {
        const { result, response, ctx, requestContext } = args;
        const { operation, entityId } = requestContext || {};

        if (isType<EntityErrorResponse>(result, "hasValidationErrors" in result)) {
            response["@context"].validationErrors = result.errors;
            ctx.status = 400;
        } else if ("error" in result) {
            response["@context"].error = result.error;
            ctx.status = 400;
        }

        if (isType<DeleteResult>(result, "raw" in result)) {
            response.deleted = result.affected ? entityId : null;
        } else if (isType<CollectionResult<Entity>>(result, operation === "list")) {
            response["@context"].retrievedItems = result.items.length;
            response["@context"].totalItems = result.totalItems;
            const items = await Promise.all(this.fromCollection(result.items, requestContext));
            response.items = items;
        } else if (isType<Entity>(result, ["details", "create", "update"].includes(operation))) {
            const item = await this.fromItem(result, requestContext);
            args.response = { ...response, ...item };
        }
    }
}

export type WriterOptions = BaseFlattenItemOptions & {
    /** Allow to opt-out of IRI's and directly return ids instead */
    useIris?: boolean;
    /** Should set subresource IRI for prop decorated with @Subresource */
    shouldSetSubresourcesIriOnItem?: boolean;
    /** Should set computed for methods prop decorated with @Groups */
    shouldSetComputedPropsOnItem?: boolean;
    /** Should deep sort response keys alphabetically or using custom comparator function */
    shouldSortItemKeys?: boolean;
    /** Allow passing a custom comparator function */
    sortComparatorFn?: ComparatorFn;
};
