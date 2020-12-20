import { Container } from "typedi";

import { deepMerge, fromEntries, isType, last, parseStringAsBoolean } from "@entity-routes/shared";

import {
    AliasHandler,
    EntityErrorResponse,
    Persistor,
    Reader,
    ReaderOptions,
    RelationManager,
    SaveItemArgs,
} from "../database";
import { GroupsOperation } from "../decorators";
import { AbstractFilter, AbstractFilterConfig, QueryParams } from "../filters";
import { BaseQueryBuilder, BaseRepository, OrmProvider } from "../orm";
import { Handler } from "../request/Handler";
import { GenericEntity } from "../types";
import { DeleteResult, UnlinkResult } from "./MiddlewareMaker";
import { CollectionResult, RequestContext, RouteFiltersMeta, getRouteFiltersMeta } from ".";

export class RouteController<Entity extends GenericEntity> {
    private filtersMeta: RouteFiltersMeta;

    get ormProvider() {
        return OrmProvider.get();
    }

    get reader() {
        return Container.get(Reader);
    }

    get persistor() {
        return Container.get(Persistor);
    }

    get relationManager() {
        return Container.get(RelationManager);
    }

    get metadata() {
        return this.repository.metadata;
    }

    get filters() {
        return Object.values(this.filtersMeta || {});
    }

    private cachedFilters: Record<string, AbstractFilter>;

    constructor(private repository: BaseRepository<Entity>, private options: Handler<Entity>["options"] = {}) {
        this.filtersMeta = getRouteFiltersMeta(repository.metadata.target as Function);
        this.cachedFilters = fromEntries(this.filters.map((config) => [config.class.name, this.makeFilter(config)]));
    }

    public async create(requestContext: RequestContext<Entity>, innerOptions: CreateUpdateOptions = {}) {
        const { operation = "create", values, subresourceRelations, requestId } = requestContext;
        const options = deepMerge({}, this.options.defaultCreateUpdateOptions, innerOptions);
        const subresourceRelation = last(subresourceRelations || []); // Should only contain 1 item at most

        if (!subresourceRelation && !Object.keys(values).length) {
            return { error: "Body can't be empty on create operation" };
        }

        const result = await this.persistor.saveItem({
            ctx: { operation, values },
            rootMetadata: this.metadata,
            mapperMakeOptions: options?.mapperMakeOptions || {},
            validatorOptions: options?.validatorOptions || {},
            subresourceRelation,
            hooks: this.options.hooks,
        });

        if (isType<EntityErrorResponse>(result, "hasValidationErrors" in result)) {
            return result;
        }

        const inverseRelation = subresourceRelation?.relation?.inverseRelation;
        if (inverseRelation && (inverseRelation.isOneToMany || inverseRelation.isManyToMany)) {
            const inverseEntityMetadata = subresourceRelation.relation.inverseEntityMetadata;
            await this.ormProvider
                .createQueryBuilder(inverseRelation.target, inverseEntityMetadata.tableName)
                .update({ [subresourceRelation.relation.databaseName]: result.id })
                .where(inverseEntityMetadata.tableName + ".id = :id", { id: subresourceRelation.id })
                .execute();
        }

        // TODO beforeReload hook ?
        if (!options?.shouldAutoReload) return result;
        requestContext.wasAutoReloaded = true;

        requestContext.responseOperation =
            options?.responseOperation ||
            (requestContext.operation === "create" ? "details" : requestContext.operation || "details");
        return this.getDetails({ operation: requestContext.responseOperation, entityId: result.id, requestId });
    }

    public async update(requestContext: RequestContext<Entity>, innerOptions?: CreateUpdateOptions) {
        const { operation = "update", values, entityId, requestId } = requestContext;
        const options = deepMerge({}, this.options.defaultCreateUpdateOptions, innerOptions);

        if (!values?.id) (values as Entity).id = entityId;
        const result = await this.persistor.saveItem({
            ctx: { operation, values },
            rootMetadata: this.metadata,
            mapperMakeOptions: options.mapperMakeOptions || {},
            validatorOptions: options?.validatorOptions || {},
            hooks: this.options.hooks,
        });

        if (isType<EntityErrorResponse>(result, "hasValidationErrors" in result)) {
            return result;
        }

        // TODO beforeReload hook ?
        if (!options?.shouldAutoReload) return result;
        requestContext.wasAutoReloaded = true;

        requestContext.responseOperation =
            options?.responseOperation ||
            (requestContext.operation === "update" ? "details" : requestContext.operation || "details");
        return this.getDetails({ operation: requestContext.responseOperation, entityId, requestId });
    }

    /** Returns a list of entity with every mapped props (from groups) */
    public async getList(
        requestContext?: Pick<
            RequestContext<Entity>,
            "requestId" | "operation" | "queryParams" | "subresourceRelations"
        >,
        innerOptions?: ListDetailsOptions
    ): Promise<CollectionResult<Entity>> {
        const { requestId, operation = "list", queryParams = {}, subresourceRelations } = requestContext || {};
        const options = deepMerge({}, this.options.defaultListDetailsOptions, innerOptions);

        const qb = this.repository.createQueryBuilder(this.metadata.tableName);

        // Apply a max item to retrieve
        qb.take(100);

        const aliasHandler = new AliasHandler();
        if (subresourceRelations) {
            let prevAlias: string;
            subresourceRelations.reverse().forEach((subresource) => {
                prevAlias = this.relationManager.joinSubresourceOnInverseSide({
                    qb,
                    entityMetadata: this.metadata,
                    aliasHandler,
                    subresourceRelation: subresource,
                    prevAlias,
                });
            });
        }

        if (this.filtersMeta) {
            this.applyFilters(queryParams, qb, aliasHandler);
        }

        const collectionResult = await this.reader.getCollection({
            entityMetadata: this.metadata,
            qb,
            aliasHandler,
            operation,
            options,
            hooks: this.options.hooks,
            requestId,
        });

        return { items: collectionResult[0], totalItems: collectionResult[1] };
    }

    /** Returns an entity with every mapped props (from groups) for a given id */
    public async getDetails(ctx: RequestContext<Entity>, innerOptions?: ListDetailsOptions) {
        const { requestId, operation = "details", entityId, subresourceRelations } = ctx;
        const options = deepMerge({}, this.options.defaultListDetailsOptions, innerOptions);

        const qb = this.repository.createQueryBuilder(this.metadata.tableName);

        const aliasHandler = new AliasHandler();
        if (subresourceRelations) {
            let prevAlias: string;
            subresourceRelations.reverse().forEach((subresource) => {
                prevAlias = this.relationManager.joinSubresourceOnInverseSide({
                    qb,
                    entityMetadata: this.metadata,
                    aliasHandler,
                    subresourceRelation: subresource,
                    prevAlias,
                });
            });
        }

        const result = await this.reader.getItem<Entity>({
            entityMetadata: this.metadata,
            qb,
            aliasHandler,
            entityId,
            operation,
            options,
            hooks: this.options.hooks,
            requestId,
        });

        return result;
    }

    public async delete(ctx: RequestContext<Entity>): Promise<DeleteResult | UnlinkResult> {
        const { entityId, subresourceRelations } = ctx;
        const subresourceRelation = last(subresourceRelations || []);

        await this.options.hooks?.beforeRemove?.({ entityId, subresourceRelation });

        let result;
        // Remove relation if used on a subresource
        if (subresourceRelation) {
            await this.repository
                .createQueryBuilder(this.metadata.tableName)
                .update({ [subresourceRelation.relation.inverseRelation.databaseName]: null })
                .where(this.metadata.tableName + ".id = :id", { id: entityId })
                .execute();

            result = { unlinked: entityId } as UnlinkResult;
        }

        if (!result) {
            result = await this.repository.delete(entityId);
        }

        await this.options.hooks?.afterRemove?.({ entityId, subresourceRelation, result });

        return result;
    }

    /** Creates a new instance of a given Filter */
    private makeFilter<Filter extends AbstractFilter>(config: AbstractFilterConfig): Filter {
        return new config.class({
            config,
            entityMetadata: this.metadata,
        });
    }

    /** Apply every registered filters on this route */
    private applyFilters(queryParams: QueryParams, qb: BaseQueryBuilder<Entity>, aliasHandler: AliasHandler) {
        this.filters.forEach((config) =>
            this.cachedFilters[config.class.name].apply({ queryParams, qb, aliasHandler })
        );
    }
}

export type CreateUpdateOptions = Pick<SaveItemArgs<any>, "validatorOptions" | "mapperMakeOptions"> & {
    responseOperation?: GroupsOperation;
    shouldAutoReload?: boolean;
};

export type ListDetailsOptions = ReaderOptions;

export type OperationKind = "persist" | "read";
