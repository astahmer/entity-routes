import { QueryBuilder, SelectQueryBuilder } from "typeorm";

import {
    BaseQueryBuilder,
    BaseQueryBuilderJoin,
    GenericEntity,
    OrderDirectionCaps,
    WhereCondition,
} from "@entity-routes/core";
import { ObjectLiteral } from "@entity-routes/shared";

export class BridgeQueryBuilder<Entity extends GenericEntity> implements BaseQueryBuilder<Entity> {
    constructor(public readonly instance: QueryBuilder<Entity>) {}

    // BaseQueryBuilder
    select(selection: string[]): this {
        this.instance.select(selection);
        return this;
    }
    addSelect(selection: string[]): this;
    addSelect(selection: string, selectionAliasName?: string): this;
    addSelect(selection: string | string[], selectionAliasName?: string): this {
        (this.instance as SelectQueryBuilder<Entity>).addSelect(selection as any, selectionAliasName);
        return this;
    }
    leftJoin(property: string, alias: string): this {
        (this.instance as SelectQueryBuilder<Entity>).leftJoin(property, alias);
        return this;
    }
    innerJoin(property: string, alias: string, condition?: string, parameters?: ObjectLiteral): this {
        (this.instance as SelectQueryBuilder<Entity>).innerJoin(property, alias, condition, parameters);
        return this;
    }
    addOrderBy(sort: string, order?: OrderDirectionCaps): this {
        (this.instance as SelectQueryBuilder<Entity>).addOrderBy(sort, order);
        return this;
    }
    take(take?: number): this {
        (this.instance as SelectQueryBuilder<Entity>).take(take);
        return this;
    }
    skip(skip?: number): this {
        (this.instance as SelectQueryBuilder<Entity>).skip(skip);
        return this;
    }
    getOne(): Promise<Entity | undefined> {
        return (this.instance as SelectQueryBuilder<Entity>).getOne();
    }
    getManyAndCount(): Promise<[Entity[], number]> {
        return (this.instance as SelectQueryBuilder<Entity>).getManyAndCount();
    }

    // WhereExpression
    where(where: string, parameters?: ObjectLiteral): this {
        (this.instance as SelectQueryBuilder<Entity>).where(where, parameters);
        return this;
    }
    andWhere(where: string, parameters?: ObjectLiteral): this {
        (this.instance as SelectQueryBuilder<Entity>).andWhere(where, parameters);
        return this;
    }
    orWhere(where: string, parameters?: ObjectLiteral): this {
        (this.instance as SelectQueryBuilder<Entity>).orWhere(where, parameters);
        return this;
    }

    //
    getJoins(): BaseQueryBuilderJoin[] {
        return this.instance.expressionMap.joinAttributes.map((join) => ({
            type: join.direction,
            onProperty: join.entityOrProperty as string,
        }));
    }
    getWhereConditions(): WhereCondition[] {
        return this.instance.expressionMap.wheres;
    }
}
