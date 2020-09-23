import { Repository, SelectQueryBuilder, DeleteResult } from "typeorm";
import { Container } from "typedi";

import { getRouteFiltersMeta, RouteFiltersMeta, GenericEntity, EntityRouteOptions } from "@/router/EntityRouter";
import { AbstractFilter, AbstractFilterConfig, QueryParams } from "@/filters/AbstractFilter";
import { EntityErrorResponse, Persistor, SaveItemArgs } from "@/database/Persistor";
import { Reader, ReaderOptions } from "@/database/Reader";
import { AliasHandler } from "@/database/AliasHandler";

import { isType } from "@/functions/asserts";
import { RelationManager } from "@/database/RelationManager";
import { fromEntries } from "@/functions/object";
import { RequestContext, CollectionResult } from "@/router/MiddlewareMaker";
import { Formater, FormaterOptions } from "@/response/Formater";
import { RouteOperation } from "@/decorators/index";
import { last } from "@/functions/array";
import { isRelationSingle } from "@/functions/entity";
import { deepMerge, parseStringAsBoolean } from "@/functions/index";

export class RouteController<Entity extends GenericEntity> {
    private filtersMeta: RouteFiltersMeta;

    get reader() {
        return Container.get(Reader);
    }

    get persistor() {
        return Container.get(Persistor);
    }

    get relationManager() {
        return Container.get(RelationManager);
    }

    get formater() {
        return Container.get(Formater);
    }

    get metadata() {
        return this.repository.metadata;
    }

    get filters() {
        return Object.values(this.filtersMeta || {});
    }

    private cachedFilters: Record<string, AbstractFilter>;

    constructor(private repository: Repository<Entity>, private options: EntityRouteOptions = {}) {
        this.filtersMeta = getRouteFiltersMeta(repository.metadata.target as Function);
        this.cachedFilters = fromEntries(this.filters.map((config) => [config.class.name, this.makeFilter(config)]));
    }

    public async create(
        requestContext: Pick<RequestContext<Entity>, "requestId" | "operation" | "values" | "subresourceRelations">,
        innerOptions: CreateUpdateOptions = {}
    ) {
        const { operation = "create", values, subresourceRelations, requestId } = requestContext;
        const subresourceRelation = last(subresourceRelations || []); // Should only contain 1 item at most
        const options = deepMerge({}, this.options.defaultCreateUpdateOptions, innerOptions || {});

        if (!subresourceRelation && !Object.keys(values).length) {
            return { error: "Body can't be empty on create operation" };
        }

        const result = await this.persistor.saveItem({
            ctx: { operation, values },
            rootMetadata: this.metadata,
            mapperMakeOptions: deepMerge({}, this.options.defaultMaxDepthOptions, options?.mapperMakeOptions || {}),
            validatorOptions: options?.validatorOptions || {},
            subresourceRelation,
            hooks: this.options.hooks,
        });

        if (isType<EntityErrorResponse>(result, "hasValidationErrors" in result)) {
            return result;
        }

        if (
            subresourceRelation?.relation?.inverseRelation &&
            (subresourceRelation.relation.inverseRelation.isOneToMany ||
                subresourceRelation.relation.inverseRelation.isManyToMany)
        ) {
            const qb = this.repository.createQueryBuilder(this.metadata.tableName);
            await qb
                .relation(
                    subresourceRelation.relation.inverseRelation.target,
                    subresourceRelation.relation.inverseRelation.propertyName
                )
                .of(result.id)
                .add(subresourceRelation.id);
        }

        // TODO beforeReload hook ?
        if (!options?.shouldAutoReload) {
            // TODO beforeFormat ?
            const item = options?.shouldFormatResult
                ? await this.formater.formatItem({
                      item: result,
                      operation,
                      entityMetadata: this.metadata,
                      options: options.formaterOptions,
                  })
                : result;
            return item;
        }

        const responseOperation =
            options?.responseOperation ||
            (requestContext.operation === "create" ? "details" : requestContext.operation || "details");
        return this.getDetails(
            { operation: responseOperation, entityId: result.id, requestId },
            { shouldOnlyFlattenNested: true }
        );
    }

    public async update(
        requestContext: Pick<RequestContext<Entity>, "requestId" | "operation" | "values" | "entityId">,
        innerOptions?: CreateUpdateOptions
    ) {
        const { operation = "update", values, entityId, requestId } = requestContext;
        const options = deepMerge({}, this.options.defaultCreateUpdateOptions, innerOptions || {});

        if (!values?.id) (values as Entity).id = entityId;
        const result = await this.persistor.saveItem({
            ctx: { operation, values },
            rootMetadata: this.metadata,
            mapperMakeOptions: deepMerge({}, this.options.defaultMaxDepthOptions, options?.mapperMakeOptions || {}),
            validatorOptions: options?.validatorOptions || {},
            hooks: this.options.hooks,
        });

        if (isType<EntityErrorResponse>(result, "hasValidationErrors" in result)) {
            return result;
        }

        if (!options?.shouldAutoReload) {
            const item = options?.shouldFormatResult
                ? await this.formater.formatItem({
                      item: result,
                      operation,
                      entityMetadata: this.metadata,
                      options: options.formaterOptions,
                  })
                : result;
            return item;
        }

        const responseOperation =
            options?.responseOperation ||
            (requestContext.operation === "update" ? "details" : requestContext.operation || "details");
        return this.getDetails(
            { operation: responseOperation, entityId, requestId },
            { shouldOnlyFlattenNested: true }
        );
    }

    /** Returns an entity with every mapped props (from groups) for a given id */
    public async getList(
        requestContext?: Pick<
            RequestContext<Entity>,
            "requestId" | "operation" | "queryParams" | "subresourceRelations"
        >,
        innerOptions?: ListDetailsOptions
    ) {
        const { requestId, operation = "list", queryParams = {}, subresourceRelations } = requestContext || {};

        const qb = this.repository.createQueryBuilder(this.metadata.tableName);

        if (innerOptions?.withDeleted) qb.withDeleted();

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

        const options = deepMerge(
            {},
            {
                shouldMaxDepthReturnRelationPropsId: this.options.defaultMaxDepthOptions
                    ?.shouldMaxDepthReturnRelationPropsId,
                ...this.options.defaultListDetailsOptions,
            },
            innerOptions
        );
        const collectionResult = await this.reader.getCollection({
            entityMetadata: this.metadata,
            qb,
            aliasHandler,
            operation,
            options,
            hooks: this.options.hooks,
            requestId,
        });

        return { items: collectionResult[0], totalItems: collectionResult[1] } as CollectionResult<Entity>;
    }

    /** Returns an entity with every mapped props (from groups) for a given id */
    public async getDetails(
        ctx: Pick<RequestContext<Entity>, "requestId" | "operation" | "entityId" | "subresourceRelations">,
        innerOptions?: ListDetailsOptions
    ) {
        const { requestId, operation = "details", entityId, subresourceRelations } = ctx;

        const qb = this.repository.createQueryBuilder(this.metadata.tableName);

        if (innerOptions?.withDeleted) qb.withDeleted();

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

        const options = deepMerge(
            {},
            {
                shouldMaxDepthReturnRelationPropsId: this.options.defaultMaxDepthOptions
                    ?.shouldMaxDepthReturnRelationPropsId,
                ...this.options.defaultListDetailsOptions,
            },
            innerOptions
        );
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

    public async delete(
        ctx: Pick<RequestContext<Entity>, "entityId" | "queryParams" | "subresourceRelations">,
        softDelete?: boolean
    ) {
        const { entityId, subresourceRelations, queryParams } = ctx;
        const subresourceRelation = last(subresourceRelations || []);

        await this.options.hooks?.beforeRemove?.({ entityId, subresourceRelation });

        let result;
        // Remove relation if used on a subresource
        if (subresourceRelation) {
            const qb = this.repository.createQueryBuilder(this.metadata.tableName);

            const query = qb
                .relation(subresourceRelation.relation.target, subresourceRelation.relation.propertyName)
                .of(subresourceRelation.id);

            if (isRelationSingle(subresourceRelation.relation)) {
                await query.set(null);
            } else {
                await query.remove(entityId);
            }

            result = { affected: 1, raw: { insertId: entityId } } as DeleteResult;
        }

        // TODO SoftDelete for Subresources (=relation softDelete) ?
        const shouldSoftDelete =
            this.options.allowSoftDelete && (softDelete || parseStringAsBoolean(queryParams?.softDelete as string));
        if (!result) {
            result = await this.repository[shouldSoftDelete ? "softDelete" : "delete"](entityId);
        }

        await this.options.hooks?.afterRemove?.({ entityId, subresourceRelation, result });

        return result;
    }

    public async restore(ctx: Pick<RequestContext<Entity>, "entityId">) {
        const { entityId } = ctx;
        if (this.options.allowSoftDelete) {
            return this.repository.restore(entityId);
        }
    }

    /** Creates a new instance of a given Filter */
    private makeFilter<Filter extends AbstractFilter>(config: AbstractFilterConfig): Filter {
        return new config.class({
            config,
            entityMetadata: this.metadata,
        });
    }

    /** Apply every registered filters on this route */
    private applyFilters(queryParams: QueryParams, qb: SelectQueryBuilder<Entity>, aliasHandler: AliasHandler) {
        this.filters.forEach((config) =>
            this.cachedFilters[config.class.name].apply({ queryParams, qb, aliasHandler })
        );
    }
}

export type CreateUpdateOptions = Pick<SaveItemArgs<any>, "validatorOptions" | "mapperMakeOptions"> & {
    responseOperation?: RouteOperation;
    shouldAutoReload?: boolean;
    shouldFormatResult?: boolean;
    formaterOptions?: FormaterOptions;
};

export type ListDetailsOptions = {
    /** When true, list/details will also select softDeleted entities */
    withDeleted?: boolean;
} & ReaderOptions;
