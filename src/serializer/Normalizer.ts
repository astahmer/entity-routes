import { EntityMetadata, SelectQueryBuilder } from "typeorm";
import Container, { Service } from "typedi";

import { MappingManager } from "@/mapping/MappingManager";
import { AliasHandler } from "@/mapping/AliasHandler";
import { Formater, FormaterOptions } from "@/response/Formater";
import { EntityRouteOptions, GenericEntity } from "@/router/EntityRouter";
import { RelationManager } from "@/mapping/RelationManager";
import { RequestContext } from "@/router/MiddlewareMaker";

// TODO 2 args & 3rd should be object
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
        aliasHandler: AliasHandler,
        operation: RequestContext["operation"] = "list",
        options: NormalizerOptions = {}
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
            aliasHandler
        );
        this.relationManager.joinAndSelectPropsThatComputedPropsDependsOn(
            entityMetadata,
            operation,
            qb,
            entityMetadata,
            aliasHandler
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
        aliasHandler: AliasHandler,
        entityId: RequestContext["entityId"],
        operation: RequestContext["operation"] = "details",
        options: NormalizerOptions = {}
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
            aliasHandler
        );
        this.relationManager.joinAndSelectPropsThatComputedPropsDependsOn(
            entityMetadata,
            operation,
            qb,
            entityMetadata,
            aliasHandler
        );

        const result = await qb.getOne();

        // Item doesn't exist
        if (!result) {
            throw new Error("Not found.");
        }

        const item = await this.formater.formatItem({ item: result, operation, entityMetadata, options });

        return item;
    }
}

export type NormalizerOptions = Pick<EntityRouteOptions, "shouldMaxDepthReturnRelationPropsId"> & FormaterOptions;
