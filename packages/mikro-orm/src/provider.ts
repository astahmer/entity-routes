import { EntityRepository, MikroORM } from "@mikro-orm/core";

import { GenericEntity, OrmProvider, WhereFactory } from "@entity-routes/core";
import { ObjectType } from "@entity-routes/shared";

import { BridgeEntityMetadata } from "./BridgeEntityMetadata";
import { BridgeRepository } from "./BridgeRepository";

export class MikroOrmProvider extends OrmProvider {
    static readonly repositories = new Map<string | ObjectType<any>, BridgeRepository<any>>();
    static readonly entityMetadatas = new Map<string | ObjectType<any>, BridgeEntityMetadata>();

    constructor(public readonly orm: MikroORM) {
        super();
    }

    getRepository<Entity extends GenericEntity>(entityClass: string | ObjectType<Entity>): BridgeRepository<Entity> {
        const key = entityClass;

        let repo = MikroOrmProvider.repositories.get(key);
        if (!repo) {
            const repository = this.orm.em.getRepository(entityClass) as EntityRepository<Entity>;
            repo = new BridgeRepository(this, repository);
            MikroOrmProvider.repositories.set(key, repo);
        }

        return repo as BridgeRepository<Entity>;
    }

    // TODO
    makeNestedWhereExpression(factory: WhereFactory) {
        return factory;
    }
}
