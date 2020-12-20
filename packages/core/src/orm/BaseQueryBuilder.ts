import { ObjectLiteral } from "@entity-routes/shared";

import { OrderDirectionCaps } from "../filters";
import { GenericEntity } from "../types";

export interface BaseQueryBuilder<Entity extends GenericEntity> extends WhereExpression {
    select(selection: string[]): this;
    addSelect(selection: string[]): this;
    addSelect(selection: string, selectionAliasName?: string): this;
    leftJoin(property: string, alias: string): this;
    innerJoin(property: string, alias: string, condition?: ObjectLiteral): this;
    getSelectedFields(): string[];
    getJoins(): BaseQueryBuilderJoin[];
    addOrderBy(sort: string, order?: OrderDirectionCaps): this;
    take(take?: number): this;
    skip(skip?: number): this;
    getOne(): Promise<Entity | undefined>;
    getManyAndCount(): Promise<[Entity[], number]>;
    update(data: any): this;
    execute<T = any>(): Promise<T>;
}

export interface WhereExpression {
    where(condition: string, parameters?: ObjectLiteral): this;
    andWhere(condition: string, parameters?: ObjectLiteral): this;
    orWhere(condition: string, parameters?: ObjectLiteral): this;
}

export type WhereFactory = (qb: WhereExpression) => any;
export interface BaseQueryBuilderJoin {
    type: "LEFT" | "INNER";
    onProperty: string;
}
