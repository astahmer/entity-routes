import { EntityMetadata, SelectQueryBuilder } from "typeorm";
import Container, { Service } from "typedi";

import { MappingManager } from "@/services/MappingManager";
import { AliasManager } from "@/serializer/AliasManager";
import { Formater } from "@/serializer/Formater";
import { EntityRouteOptions, GenericEntity } from "@/router/EntityRouter";
import { RelationManager } from "@/services/RelationManager";
import { RequestContext } from "@/services/ResponseManager";

@Service()
export class Normalizer {
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
    public async getCollection<Entity extends GenericEntity>(
        entityMetadata: EntityMetadata,
        qb: SelectQueryBuilder<Entity>,
        aliasManager: AliasManager,
        operation: RequestContext["operation"] = "list",
        options: EntityRouteOptions = {}
    ): Promise<[Entity[], number]> {
        const selectProps = this.mappingManager.getSelectProps(entityMetadata, operation, entityMetadata, true);

        qb.select(selectProps);

        this.relationManager.joinAndSelectExposedProps(
            entityMetadata,
            operation,
            qb,
            entityMetadata,
            "",
            entityMetadata.tableName,
            options,
            aliasManager
        );
        this.relationManager.joinAndSelectPropsThatComputedPropsDependsOn(
            entityMetadata,
            operation,
            qb,
            entityMetadata,
            aliasManager
        );

        const results = await qb.getManyAndCount();
        const items = await Promise.all(
            results[0].map(
                (item) => this.formater.formatItem({ item, operation, entityMetadata, options }) as Promise<Entity>
            )
        );

        return [items, results[1]];
    }

    /** Retrieve a specific entity with only exposed props (from groups) */
    public async getItem<Entity extends GenericEntity>(
        entityMetadata: EntityMetadata,
        qb: SelectQueryBuilder<Entity>,
        aliasManager: AliasManager,
        entityId: RequestContext["entityId"],
        operation: RequestContext["operation"] = "details",
        options: EntityRouteOptions = {}
    ) {
        const selectProps = this.mappingManager.getSelectProps(entityMetadata, operation, entityMetadata, true);

        qb.select(selectProps);

        // If item is a subresource, there is no entityId since the entity was joined on its parent using inverse side prop
        if (entityId) {
            qb.where(entityMetadata.tableName + ".id = :id", { id: entityId });
        }

        this.relationManager.joinAndSelectExposedProps(
            entityMetadata,
            operation,
            qb,
            entityMetadata,
            "",
            entityMetadata.tableName,
            options,
            aliasManager
        );
        this.relationManager.joinAndSelectPropsThatComputedPropsDependsOn(
            entityMetadata,
            operation,
            qb,
            entityMetadata,
            aliasManager
        );

        const result = await qb.getOne();

        // Item doesn't exist
        if (!result) {
            throw new Error("Not found.");
        }

        const item = (await this.formater.formatItem({ item: result, operation, entityMetadata, options })) as Entity;

        return item;
    }
}

export type NormalizerOptions = Pick<
    EntityRouteOptions,
    "shouldMaxDepthReturnRelationPropsId" | "shouldEntityWithOnlyIdBeFlattenedToIri" | "shouldSetSubresourcesIriOnItem"
>;
