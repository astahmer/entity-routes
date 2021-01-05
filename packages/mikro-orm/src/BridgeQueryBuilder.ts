import { JoinOptions, QueryBuilder } from "@mikro-orm/knex";

import { BaseQueryBuilder, BaseQueryBuilderJoin, GenericEntity, OrderDirectionCaps } from "@entity-routes/core";
import { ObjectLiteral } from "@entity-routes/shared";

export class BridgeQueryBuilder<Entity extends GenericEntity> implements BaseQueryBuilder<Entity> {
    constructor(public readonly instance: QueryBuilder<Entity>) {}

    // BaseQueryBuilder
    select(selection: string[]) {
        this.instance.select(selection);
        return this;
    }
    addSelect(selection: string[]): this;
    addSelect(selection: string, selectionAliasName?: string): this;
    addSelect(selection: string | string[], selectionAliasName?: string) {
        this.instance.addSelect(selectionAliasName ? `${selection} as ${selectionAliasName}` : selection);
        return this;
    }
    leftJoin(property: string, alias: string) {
        this.instance.leftJoin(property, alias);
        return this;
    }
    innerJoin(property: string, alias: string, condition?: ObjectLiteral) {
        this.instance.join(property, alias, condition, "innerJoin");
        return this;
    }
    addOrderBy(sort: string, order?: OrderDirectionCaps) {
        // TODO nested
        this.instance.orderBy({ [sort]: order });
        return this;
    }
    take(take?: number) {
        this.instance.limit(take);
        return this;
    }
    skip(skip?: number) {
        this.instance.offset(skip);
        return this;
    }
    getOne() {
        // TODO
        // console.log(this.instance.getFormattedQuery());
        return this.instance.getSingleResult();
    }
    async getManyAndCount() {
        const countQuery = this.instance.clone().getKnexQuery().clearSelect().count("* as count");
        const [results, [{ count }]] = await Promise.all([this.instance.getResultList(), countQuery.then()]);

        const data: [Entity[], number] = [results, count];
        return data;
    }
    update(data: ObjectLiteral) {
        this.instance.update(data);
        return this;
    }
    execute() {
        return this.instance.execute();
    }

    // WhereExpression
    where(_condition: string, parameters?: ObjectLiteral) {
        // TODO
        // const knex = this.instance.getKnex();
        // knex.where(condition, parameters);
        // const knex = (this.repository.provider.orm.em as EntityManager).getKnex();
        // this.instance.where(knex.raw(condition, parameters))
        // this.instance.where(condition, Object.values(parameters));
        // console.log(condition, parameters);
        this.instance.where(parameters);
        return this;
    }
    andWhere(condition: string, parameters?: ObjectLiteral) {
        this.instance.andWhere(condition, Object.values(parameters));
        return this;
    }
    orWhere(condition: string, parameters?: ObjectLiteral) {
        this.instance.orWhere(condition, Object.values(parameters));
        return this;
    }

    //
    getJoins() {
        return Object.entries(this.instance["_joins"]).map(([_alias, join]: [string, JoinOptions]) => ({
            type: joinTypeMap[join.type as "leftJoin" | "innerJoin"],
            onProperty: join.path,
        }));
    }
    getSelectedFields() {
        return this.instance._fields as string[];
    }
}

const joinTypeMap: Record<Exclude<JoinOptions["type"], "pivotJoin">, BaseQueryBuilderJoin["type"]> = {
    leftJoin: "LEFT",
    innerJoin: "INNER",
};
