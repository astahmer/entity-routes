import { QueryBuilder, SelectQueryBuilder } from "typeorm";

import { BaseQueryBuilder, GenericEntity, OrderDirectionCaps } from "@entity-routes/core";
import { ObjectLiteral, getObjectOnlyKey } from "@entity-routes/shared";

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
        (this.instance as SelectQueryBuilder<Entity>).addSelect(selection as any, selectionAliasName);
        return this;
    }
    leftJoin(property: string, alias: string) {
        (this.instance as SelectQueryBuilder<Entity>).leftJoin(property, alias);
        return this;
    }
    innerJoin(property: string, alias: string, condition?: ObjectLiteral) {
        const paramName = getObjectOnlyKey(condition);
        const conditionString = condition ? `${paramName}.id = :${paramName}Id` : "";

        (this.instance as SelectQueryBuilder<Entity>).innerJoin(property, alias, conditionString, {
            [`${paramName}Id`]: condition[paramName],
        });
        return this;
    }
    addOrderBy(sort: string, order?: OrderDirectionCaps) {
        (this.instance as SelectQueryBuilder<Entity>).addOrderBy(sort, order);
        return this;
    }
    take(take?: number) {
        (this.instance as SelectQueryBuilder<Entity>).take(take);
        return this;
    }
    skip(skip?: number) {
        (this.instance as SelectQueryBuilder<Entity>).skip(skip);
        return this;
    }
    getOne() {
        return (this.instance as SelectQueryBuilder<Entity>).getOne();
    }
    getManyAndCount() {
        return (this.instance as SelectQueryBuilder<Entity>).getManyAndCount();
    }
    update(data: any) {
        this.instance.update(data);
        return this;
    }
    execute() {
        return this.instance.execute();
    }

    // WhereExpression
    where(condition: string, parameters?: ObjectLiteral) {
        (this.instance as SelectQueryBuilder<Entity>).where(condition, parameters);
        return this;
    }
    andWhere(condition: string, parameters?: ObjectLiteral) {
        (this.instance as SelectQueryBuilder<Entity>).andWhere(condition, parameters);
        return this;
    }
    orWhere(condition: string, parameters?: ObjectLiteral) {
        (this.instance as SelectQueryBuilder<Entity>).orWhere(condition, parameters);
        return this;
    }

    //
    getJoins() {
        return this.instance.expressionMap.joinAttributes.map((join) => ({
            type: join.direction,
            onProperty: join.entityOrProperty as string,
        }));
    }
    getWhereConditions() {
        return this.instance.expressionMap.wheres;
    }
    getSelectedFields() {
        return this.instance.expressionMap.selects.map((selectQuery) => selectQuery.selection);
    }
}
