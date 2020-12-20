import { EntityRepository } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/knex";

import { BaseQueryBuilder, BaseRepository, DeleteResult, GenericEntity } from "@entity-routes/core";
import { DeepPartial } from "@entity-routes/shared";

import { BridgeEntityMetadata } from "./BridgeEntityMetadata";
import { BridgeQueryBuilder } from "./BridgeQueryBuilder";
import { MikroOrmProvider } from "./provider";

export class BridgeRepository<Entity extends GenericEntity> implements BaseRepository<Entity> {
    constructor(public readonly provider: MikroOrmProvider, public readonly instance: EntityRepository<Entity>) {}

    get metadata(): BridgeEntityMetadata {
        const key = this.instance["entityName"] as string;
        const metadata = this.provider.orm.getMetadata();
        const entityMetadata = metadata.find(key);
        return new BridgeEntityMetadata(entityMetadata);
        // TODO

        let bridgeMeta = MikroOrmProvider.entityMetadatas.get(key);

        if (!bridgeMeta) {
            const metadata = this.provider.orm.getMetadata();
            const entityMetadata = metadata.find(key);
            bridgeMeta = new BridgeEntityMetadata(entityMetadata);
            MikroOrmProvider.entityMetadatas.set(key, bridgeMeta);
        }

        return bridgeMeta;
    }

    createQueryBuilder(alias?: string): BaseQueryBuilder<Entity> {
        // TODO better typings
        // related to https://mikro-orm.io/docs/upgrading-v3-to-v4/#sqlentitymanager-and-mongoentitymanager
        const qb = (this.provider.orm.em as EntityManager).createQueryBuilder<Entity>(this.metadata.name, alias);
        return new BridgeQueryBuilder<Entity>(qb);
    }

    create(entityLike: DeepPartial<Entity>): Entity {
        return (this.instance.create(entityLike as any) as any) as Entity;
    }

    async delete(entityId: string | number): Promise<DeleteResult> {
        const entity = this.instance.create({ id: entityId });
        await this.instance.removeAndFlush(entity);
        return { deleted: entityId };
    }

    async save<T extends DeepPartial<Entity>>(entity: T): Promise<T & Entity> {
        await this.instance.persistAndFlush(entity);
        return entity as T & Entity;
    }
}
