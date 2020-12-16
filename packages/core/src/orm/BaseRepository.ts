import { DeepPartial } from "@entity-routes/shared";

import { GenericEntity } from "../types";
import { BaseEntityMeta } from "./BaseEntityMeta";
import { BaseQueryBuilder } from "./BaseQueryBuilder";

export interface BaseRepository<Entity extends GenericEntity> {
    metadata: BaseEntityMeta;
    createQueryBuilder(alias?: string): BaseQueryBuilder<Entity>;
    create(entityLike: DeepPartial<Entity>): Entity;
    save<T extends DeepPartial<Entity>>(entity: T): Promise<T & Entity>;
}

// TODO save options ?

export interface BaseRepositoryWithRestore<Entity extends GenericEntity> extends BaseRepository<Entity> {
    restore(id: any): Promise<any>;
}
