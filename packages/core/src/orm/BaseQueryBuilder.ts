import { ObjectLiteral, ObjectType } from "@entity-routes/shared";

import { OrderDirectionCaps } from "../filters";
import { GenericEntity } from "../types";

export interface BaseQueryBuilder<Entity extends GenericEntity> extends WhereExpression {
    select(selection: string[]): this;
    addSelect(selection: string[]): this;
    addSelect(selection: string, selectionAliasName?: string): this;
    leftJoin(property: string, alias: string): this;
    innerJoin(property: string, alias: string, condition?: string, parameters?: ObjectLiteral): this;
    getJoins(): BaseQueryBuilderJoin[];
    getWhereConditions(): WhereCondition[];
    addOrderBy(sort: string, order?: OrderDirectionCaps): this;
    take(take?: number): this;
    skip(skip?: number): this;
    getOne(): Promise<Entity | undefined>;
    getManyAndCount(): Promise<[Entity[], number]>;
}

// TODO ?
export interface RelationQueryBuilder {
    relation<RelationEntity>(entityTarget: ObjectType<RelationEntity>, propertyPath: string): this;
    of(entity: any | any[]): this;
    add(value: any | any[]): Promise<void>;
}

export interface WhereExpression {
    where(where: string, parameters?: ObjectLiteral): this;
    andWhere(where: string, parameters?: ObjectLiteral): this;
    orWhere(where: string, parameters?: ObjectLiteral): this;
}

export type WhereFactory = (qb: WhereExpression) => any;
export interface NestedWhereExpression {
    new (whereFactory: WhereFactory): this;
}

export interface BaseQueryBuilderJoin {
    type: "LEFT" | "INNER";
    onProperty: string;
}

export interface WhereCondition {
    type: "simple" | "and" | "or";
    condition: string;
}

export interface BaseQueryBuilderWithDeleted<Entity extends GenericEntity> extends BaseQueryBuilder<Entity> {
    withDeleted(): this;
}
