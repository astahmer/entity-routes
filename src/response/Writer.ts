import { Container } from "typedi";
import { DeleteResult, Repository } from "typeorm";

import { EntityErrorResponse } from "@/database/Persistor";
import { isDev, isObject, isType } from "@/functions/asserts";
import { GenericEntity } from "@/router/EntityRouter";
import { RouteController } from "@/router/RouteController";
import { CollectionResult, RequestContext, RequestState, RouteResponse } from "@/router/MiddlewareMaker";
import { ContextWithState, EntityRouteState } from "@/request";
import { Context, RouteControllerResult } from "@/router";
import { DecorateFn, Decorator } from "@/response/Decorator";
import {
    setComputedPropsOnItem,
    setSubresourcesIriOnItem,
    BaseFlattenItemOptions,
    flattenItem,
} from "@/response//functions";
import { ObjectLiteral } from "@/utils-types";
import { pipe } from "@/functions/utils";
import { ComparatorFn, deepSort } from "@/functions/object";

// TODO tests
/** Write response from result & decorators */
export class Writer<Entity extends GenericEntity> {
    get metadata() {
        return this.repository.metadata;
    }

    get decorator() {
        return Container.get(Decorator);
    }

    get options() {
        return this.routeOptions.defaultWriterOptions;
    }

    constructor(
        private repository: Repository<Entity>,
        private routeOptions: RouteController<Entity>["options"] = {}
    ) {}

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
    async fromItem({ item, requestContext, innerOptions }: FromItemArgs<Entity>) {
        const options = innerOptions || this.options || {};
        const operation = requestContext.operation;
        const flattenItemOptions = {
            operation,
            ...options,
            shouldOnlyFlattenNested: options.shouldOnlyFlattenNested ?? requestContext.wasAutoReloaded,
        };
        const decorate = this.makeDecoratorFor.bind(this);

        // Shortcuts for readability
        const withComputedProps =
            options.shouldSetComputedPropsOnItem &&
            ((item: any) => decorate(setComputedPropsOnItem, { operation }, item));
        const withSubresourcesIris =
            options.shouldSetSubresourcesIriOnItem &&
            ((item: any) => decorate(setSubresourcesIriOnItem, { operation, useIris: options.useIris }, item));

        // Decorator called only on objects item (!= flattened IRI/id)
        const decorateEntities = pipe(...[withComputedProps, withSubresourcesIris].filter(Boolean));

        // Flatten item and then decorate entity if not flattened
        const decorateWithFlatten = pipe(
            (item) => decorate(flattenItem, flattenItemOptions, item),
            (item) => (isObject(item) ? decorateEntities(item) : item)
        );

        // Either with flatten or directly entities
        const decorateFn = options.shouldEntityWithOnlyIdBeFlattenedToIri ? decorateWithFlatten : decorateEntities;
        const clone = await decorateFn(item);

        // TODO Decorate: custom

        // TODO test
        options.shouldSortItemKeys ? deepSort(clone, options.sortComparatorFn) : clone;

        return clone;
    }

    /** Apply the same process for each item for that collection */
    fromCollection({ items, requestContext, innerOptions }: FromCollectionArgs<Entity>) {
        return items.map((item) => this.fromItem({ item, requestContext, innerOptions }));
    }

    async makeResponse(ctx: ContextWithState, result: RouteControllerResult, options?: WriterOptions) {
        const { requestContext = {} as RequestContext<Entity> } = ctx.state as RequestState<Entity>;
        const operation = requestContext?.operation;

        let response: RouteResponse = { "@context": { operation, entity: this.metadata.tableName } };
        if (isType<RouteResponse<"persist">>(response, requestContext.isUpdateOrCreate))
            response["@context"].validationErrors = null;
        const args = { result, response, ctx, requestContext, options };

        try {
            await this.handleResult(args);
        } catch (error) {
            (args.response as RouteResponse<"error">)["@context"].error = isDev() ? error.message : "Bad request";
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
        options?: WriterOptions;
    }) {
        const { result, response, ctx, requestContext } = args;
        const { operation, entityId } = requestContext || {};

        if (isType<EntityErrorResponse>(result, "hasValidationErrors" in result)) {
            (response as RouteResponse<"persist">)["@context"].validationErrors = result.errors;
            ctx.status = 400;
        } else if ("error" in result) {
            (response as RouteResponse<"error">)["@context"].error = result.error;
            ctx.status = 400;
        }

        if (isType<DeleteResult>(result, "raw" in result)) {
            (response as RouteResponse<"delete">).deleted = result.affected ? entityId : null;
        } else if (
            isType<CollectionResult<Entity>>(result, operation === "list") &&
            isType<RouteResponse<"collection">>(response, true)
        ) {
            response["@context"].retrievedItems = result.items.length;
            response["@context"].totalItems = result.totalItems;
            const items = await Promise.all(
                this.fromCollection({ items: result.items, requestContext, innerOptions: args.options })
            );
            response.items = items;
        } else if (isType<Entity>(result, ["details", "create", "update"].includes(operation))) {
            const item = await this.fromItem({ item: result, requestContext, innerOptions: args.options });
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

export type FromCollectionArgs<Entity extends GenericEntity = GenericEntity> = {
    items: Entity[];
    requestContext: RequestContext;
    innerOptions?: WriterOptions;
};
export type FromItemArgs<Entity extends GenericEntity = GenericEntity> = Omit<FromCollectionArgs, "items"> & {
    item: Entity;
};
