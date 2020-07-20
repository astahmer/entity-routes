import { Repository, SelectQueryBuilder } from "typeorm";
import { Container } from "typedi";

import { getRouteFiltersMeta, RouteFiltersMeta, GenericEntity, EntityRouteOptions } from "@/router/EntityRouter";
import { AbstractFilter, AbstractFilterConfig, QueryParams } from "@/filters/AbstractFilter";
import { EntityErrorResponse, Persistor, SaveItemArgs } from "@/database/Persistor";
import { Reader, ReaderOptions } from "@/database/Reader";
import { AliasHandler } from "@/database/AliasHandler";

// TODO (global) Use object as fn arguments rather than chaining them
// TODO Hooks (before/afterPersist (create+update), before/afterValidate, before/afterLoad (list+details ?), beforeAfter/remove)
import { isType } from "@/functions/asserts";
import { RelationManager } from "@/mapping/RelationManager";
import { fromEntries } from "@/functions/object";
import { RequestContext, CollectionResult } from "@/router/MiddlewareMaker";
import { Formater, FormaterOptions } from "@/response/Formater";
import { RouteOperation } from "@/decorators/index";
import { last } from "@/functions/array";
import { isRelationSingle } from "@/functions/entity";
import { parseStringAsBoolean } from "@/functions/index";

export class RouteController<Entity extends GenericEntity> {
    private filtersMeta: RouteFiltersMeta;

    get normalizer() {
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
        ctx: Pick<RequestContext<Entity>, "operation" | "values" | "subresourceRelations">,
        innerOptions: CreateUpdateOptions = {}
    ) {
        const { operation = "create", values, subresourceRelations } = ctx;
        const subresourceRelation = last(subresourceRelations || []); // Should only contain 1 item at most
        const options = { ...this.options.defaultCreateUpdateOptions, ...(innerOptions || {}) };

        if (!subresourceRelation && !Object.keys(values).length) {
            return { error: "Body can't be empty on create operation" };
        }

        const result = await this.persistor.saveItem({
            ctx: { operation, values },
            rootMetadata: this.metadata,
            mapperMakeOptions: { ...this.options, ...(options?.mapperMakeOptions || {}) },
            validatorOptions: options?.validatorOptions || {},
            subresourceRelation,
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
            options?.responseOperation || (ctx.operation === "create" ? "details" : ctx.operation || "details");
        return this.getDetails(
            { operation: responseOperation, entityId: result.id },
            { shouldOnlyFlattenNested: true }
        );
    }

    public async update(
        ctx: Pick<RequestContext<Entity>, "operation" | "values" | "entityId">,
        innerOptions?: CreateUpdateOptions
    ) {
        const { operation = "update", values, entityId } = ctx;
        const options = { ...this.options.defaultCreateUpdateOptions, ...(innerOptions || {}) };

        if (!values?.id) (values as Entity).id = entityId;
        const result = await this.persistor.saveItem({
            ctx: { operation, values },
            rootMetadata: this.metadata,
            mapperMakeOptions: { ...this.options, ...(options?.mapperMakeOptions || {}) },
            validatorOptions: options?.validatorOptions || {},
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
            options?.responseOperation || (ctx.operation === "update" ? "details" : ctx.operation || "details");
        return this.getDetails(
            { operation: responseOperation, entityId: result.id },
            { shouldOnlyFlattenNested: true }
        );
    }

    /** Returns an entity with every mapped props (from groups) for a given id */
    public async getList(
        ctx?: Pick<RequestContext<Entity>, "operation" | "queryParams" | "subresourceRelations">,
        options?: ListDetailsOptions
    ) {
        const { operation = "list", queryParams = {}, subresourceRelations } = ctx || {};

        const qb = this.repository.createQueryBuilder(this.metadata.tableName);

        if (options?.withDeleted) qb.withDeleted();

        // Apply a max item to retrieve
        qb.take(100);

        const aliasHandler = new AliasHandler();
        if (subresourceRelations) {
            let prevAlias: string;
            subresourceRelations.reverse().forEach((subresource) => {
                prevAlias = this.relationManager.joinSubresourceOnInverseSide(
                    qb,
                    this.metadata,
                    aliasHandler,
                    subresource,
                    prevAlias
                );
            });
        }

        if (this.filtersMeta) {
            this.applyFilters(queryParams, qb, aliasHandler);
        }

        const collectionResult = await this.normalizer.getCollection(this.metadata, qb, aliasHandler, operation, {
            ...this.options,
            ...options,
        });

        return { items: collectionResult[0], totalItems: collectionResult[1] } as CollectionResult<Entity>;
    }

    /** Returns an entity with every mapped props (from groups) for a given id */
    public async getDetails(
        ctx: Pick<RequestContext<Entity>, "operation" | "entityId" | "subresourceRelations">,
        options?: ListDetailsOptions
    ) {
        const { operation = "details", entityId, subresourceRelations } = ctx;

        const qb = this.repository.createQueryBuilder(this.metadata.tableName);

        if (options?.withDeleted) qb.withDeleted();

        const aliasHandler = new AliasHandler();
        if (subresourceRelations) {
            let prevAlias: string;
            subresourceRelations.reverse().forEach((subresource) => {
                prevAlias = this.relationManager.joinSubresourceOnInverseSide(
                    qb,
                    this.metadata,
                    aliasHandler,
                    subresource,
                    prevAlias
                );
            });
        }

        return await this.normalizer.getItem<Entity>(this.metadata, qb, aliasHandler, entityId, operation, {
            ...this.options,
            ...options,
        });
    }

    public async delete(
        ctx: Pick<RequestContext<Entity>, "entityId" | "queryParams" | "subresourceRelations">,
        softDelete?: boolean
    ) {
        const { entityId, subresourceRelations, queryParams } = ctx;
        const subresourceRelation = last(subresourceRelations || []);
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

            return { affected: 1, raw: { insertId: entityId } };
        }

        if (this.options.allowSoftDelete && (softDelete || parseStringAsBoolean(queryParams?.softDelete as string))) {
            return this.repository.softDelete(entityId);
        }

        return this.repository.delete(entityId);
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

export type ListDetailsOptions = Pick<EntityRouteOptions, "withDeleted"> & ReaderOptions;
