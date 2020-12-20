import Container from "typedi";

import { ObjectType } from "@entity-routes/shared";

import { GenericEntity } from "../types";
import { BaseQueryBuilder, WhereFactory } from "./BaseQueryBuilder";
import { BaseRepository } from "./BaseRepository";

export abstract class OrmProvider {
    static get() {
        return Container.get("ER-OrmProvider") as OrmProvider;
    }

    // TODO ?
    // entities: ObjectType<GenericEntity>[];

    abstract getRepository<Entity extends GenericEntity>(
        entityClass: string | ObjectType<Entity>
    ): BaseRepository<Entity>;
    abstract createQueryBuilder<Entity extends GenericEntity>(
        entityClass: string | ObjectType<Entity>,
        alias?: string
    ): BaseQueryBuilder<Entity>;
    abstract makeNestedWhereExpression(factory: WhereFactory): any;
}
