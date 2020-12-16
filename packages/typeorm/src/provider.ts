import { Brackets, getRepository } from "typeorm";

import { BaseRepository, GenericEntity, NestedWhereExpression, OrmProvider, WhereFactory } from "@entity-routes/core";
import { ObjectType } from "@entity-routes/shared";

import { BridgeRepository } from "./BridgeRepository";

export class TypeOrmProvider extends OrmProvider {
    getRepository<Entity extends GenericEntity>(entityClass: ObjectType<Entity>): BaseRepository<Entity> {
        const repo = getRepository(entityClass);
        return new BridgeRepository(repo);
    }

    makeNestedWhereExpression(factory: WhereFactory): NestedWhereExpression {
        return (new Brackets(factory) as unknown) as NestedWhereExpression;
    }
}
