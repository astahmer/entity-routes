import { Container, Service } from "typedi";
import { EntityMetadata, SelectQueryBuilder } from "typeorm";

import { MappingManager } from "../mapping";
import { EntityRouteOptions, GenericEntity, RequestContext } from "../router";
import { AliasHandler, JoinAndSelectExposedPropsOptions, RelationManager } from ".";

@Service()
export class Reader {
    get mappingManager() {
        return Container.get(MappingManager);
    }

    get relationManager() {
        return Container.get(RelationManager);
    }

    /** Retrieve collection of entities with only exposed props (from groups) */
    public async getCollection<Entity extends GenericEntity>({
        entityMetadata,
        qb,
        aliasHandler,
        operation = "list",
        options = {},
        hooks,
        requestId,
    }: GetCollectionArgs<Entity>): Promise<[Entity[], number]> {
        const selectProps = this.mappingManager.getSelectProps(entityMetadata, operation, entityMetadata, true);

        qb.select(selectProps);

        this.relationManager.joinAndSelectExposedProps({
            rootMetadata: entityMetadata,
            operation,
            qb,
            entityMetadata,
            currentPath: "",
            prevProp: entityMetadata.tableName,
            options,
            aliasHandler,
        });
        this.relationManager.joinAndSelectPropsThatComputedPropsDependsOn({
            rootMetadata: entityMetadata,
            operation,
            qb,
            entityMetadata,
            aliasHandler,
        });

        await hooks?.beforeRead?.({ requestId, options });
        const results = await qb.getManyAndCount();
        const ref = { results }; // Pass an object with results key editable by afterRead hook if needed
        await hooks?.afterRead?.({ requestId, ref });

        return ref.results;
    }

    /** Retrieve a specific entity with only exposed props (from groups) */
    public async getItem<Entity extends GenericEntity>({
        entityMetadata,
        qb,
        aliasHandler,
        entityId,
        operation = "list",
        options = {},
        hooks,
        requestId,
    }: GetItemArgs<Entity>) {
        const selectProps = this.mappingManager.getSelectProps(entityMetadata, operation, entityMetadata, true);

        qb.select(selectProps);

        // If item is a subresource, there is no entityId since the entity was joined on its parent using inverse side prop
        if (entityId) {
            qb.where(entityMetadata.tableName + ".id = :id", { id: entityId });
        }

        this.relationManager.joinAndSelectExposedProps({
            rootMetadata: entityMetadata,
            operation,
            qb,
            entityMetadata,
            currentPath: "",
            prevProp: entityMetadata.tableName,
            options,
            aliasHandler,
        });
        this.relationManager.joinAndSelectPropsThatComputedPropsDependsOn({
            rootMetadata: entityMetadata,
            operation,
            qb,
            entityMetadata,
            aliasHandler,
        });

        // TODO use getRawOne + marshal-ts instead of typeorm class-transformer ?
        await hooks?.beforeRead?.({ requestId, options });
        const result = await qb.getOne();
        const ref = { result }; // Pass an object with result key editable by afterRead hook if needed
        await hooks?.afterRead?.({ requestId, ref });

        // Item doesn't exist
        if (!ref.result) {
            throw new Error("Not found.");
        }

        return ref.result;
    }
}

export type ReaderOptions = Pick<JoinAndSelectExposedPropsOptions, "shouldMaxDepthReturnRelationPropsId">;

export type GetCollectionArgs<Entity extends GenericEntity = GenericEntity> = {
    entityMetadata: EntityMetadata;
    qb: SelectQueryBuilder<Entity>;
    aliasHandler: AliasHandler;
    operation?: RequestContext<Entity>["operation"];
    options?: ReaderOptions;
    requestId?: RequestContext<Entity>["requestId"];
} & Pick<EntityRouteOptions, "hooks">;
export type GetItemArgs<Entity extends GenericEntity = GenericEntity> = GetCollectionArgs<Entity> & {
    entityId: RequestContext<Entity>["entityId"];
};
