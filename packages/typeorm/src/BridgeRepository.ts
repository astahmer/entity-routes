import { Repository } from "typeorm";

import { BaseQueryBuilder, BaseRepository, DeleteResult, GenericEntity } from "@entity-routes/core";
import { DeepPartial } from "@entity-routes/shared";

import { BridgeEntityMetadata } from "./BridgeEntityMetadata";
import { BridgeQueryBuilder } from "./BridgeQueryBuilder";

export class BridgeRepository<Entity extends GenericEntity> implements BaseRepository<Entity> {
    get metadata() {
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

    async delete(entityId: string | number): Promise<DeleteResult> {
        await this.instance.delete(entityId);
        return { deleted: entityId };
    }

    save<T extends DeepPartial<Entity>>(entity: T): Promise<T & Entity> {
        return (this.instance.save(entity as any) as any) as Promise<T & Entity>;
    }
}
