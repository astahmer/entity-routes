import { DeepPartial } from "@entity-routes/shared";

import { DeleteResult } from "../router";
import { GenericEntity } from "../types";
import { BaseEntityMeta } from "./BaseEntityMeta";
import { BaseQueryBuilder } from "./BaseQueryBuilder";

export interface BaseRepository<Entity extends GenericEntity> {
    metadata: BaseEntityMeta;
    createQueryBuilder(alias?: string): BaseQueryBuilder<Entity>;
    create(entityLike: DeepPartial<Entity>): Entity;
    delete(entityId: string | number): Promise<DeleteResult>;
    save<T extends DeepPartial<Entity>>(entity: T): Promise<T & Entity>;
}
