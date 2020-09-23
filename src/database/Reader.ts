import { EntityMetadata, SelectQueryBuilder } from "typeorm";
import { Container, Service } from "typedi";

import { MappingManager } from "@/mapping/MappingManager";
import { AliasHandler } from "@/database/AliasHandler";
import { Formater, FormaterOptions } from "@/response/Formater";
import { EntityRouteOptions, GenericEntity } from "@/router/EntityRouter";
import { JoinAndSelectExposedPropsOptions, RelationManager } from "@/database/RelationManager";
import { RequestContext } from "@/router/MiddlewareMaker";

@Service()
export class Reader {
    get mappingManager() {
        return Container.get(MappingManager);
    }

    get relationManager() {
        return Container.get(RelationManager);
    }

    get formater() {
        return Container.get(Formater);
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
    }: GetCollectionArgs): Promise<[Entity[], number]> {
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
        const ref = { results }; // Pass an object with results key editable with afterRead hook if needed
        await hooks?.afterRead?.({ requestId, ref });

        const items = await Promise.all(
            ref.results[0].map(
                (item) => this.formater.formatItem({ item, operation, entityMetadata, options }) as Promise<Entity>
            )
        );

        return [items, ref.results[1]];
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
        // or make a JIT (de)serializer from mapping on "context.operation" ?
        await hooks?.beforeRead?.({ requestId, options });
        const result = await qb.getOne();
        const ref = { result }; // Pass an object with result key editable with afterRead hook if needed
        await hooks?.afterRead?.({ requestId, ref });

        // Item doesn't exist
        if (!ref.result) {
            throw new Error("Not found.");
        }

        const item = await this.formater.formatItem({ item: ref.result, operation, entityMetadata, options });

        return item;
    }
}

export type ReaderOptions = Pick<JoinAndSelectExposedPropsOptions, "shouldMaxDepthReturnRelationPropsId"> &
    FormaterOptions;

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
