import { ObjectType } from "@entity-routes/shared";

import { GenericEntity } from "../types";
import { NestedWhereExpression, WhereFactory } from "./BaseQueryBuilder";
import { BaseRepository } from "./BaseRepository";

export abstract class OrmProvider {
    // abstract getEntityMeta(entity: GenericEntity): Promise<BaseEntityMeta>;
    // abstract getConnection(connectionName?: string): Connection;
    abstract getRepository<Entity extends GenericEntity>(entityClass: ObjectType<Entity>): BaseRepository<Entity>;
    abstract makeNestedWhereExpression(factory: WhereFactory): NestedWhereExpression;
}
