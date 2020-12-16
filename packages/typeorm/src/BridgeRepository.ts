import { Repository } from "typeorm";

import { BaseEntityMeta, BaseQueryBuilder, BaseRepository, GenericEntity } from "@entity-routes/core";
import { DeepPartial } from "@entity-routes/shared";

import { BridgeEntityMetadata } from "./BridgeEntityMetadata";
import { BridgeQueryBuilder } from "./BridgeQueryBuilder";

export class BridgeRepository<Entity extends GenericEntity> implements BaseRepository<Entity> {
    get metadata(): BaseEntityMeta {
        return new BridgeEntityMetadata(this.instance.metadata);
    }

    constructor(public readonly instance: Repository<Entity>) {}

    createQueryBuilder(alias?: string): BaseQueryBuilder<Entity> {
        const qb = this.instance.createQueryBuilder(alias);
        return new BridgeQueryBuilder(qb);
    }

    create(entityLike: DeepPartial<Entity>): Entity {
        return (this.instance.create(entityLike as any) as any) as Entity;
    }
    save<T extends DeepPartial<Entity>>(entity: T): Promise<T & Entity> {
        return (this.instance.save(entity as any) as any) as Promise<T & Entity>;
    }
}
