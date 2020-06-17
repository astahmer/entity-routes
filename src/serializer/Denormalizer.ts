import { getRepository, EntityMetadata } from "typeorm";
import { Container, Service } from "typedi";

import { GenericEntity, EntityRouteOptions } from "@/router/EntityRouter";
import { Cleaner } from "@/serializer/Cleaner";
import { ValidateItemOptions, EntityErrorResults, Validator } from "@/serializer/Validator";
import { RequestContextMinimal } from "@/router/MiddlewareMaker";
import { SubresourceRelation } from "@/router/SubresourceManager";

@Service()
export class Denormalizer {
    get cleaner() {
        return Container.get(Cleaner);
    }

    get validator() {
        return Container.get(Validator);
    }

    /** Clean & validate item and then save it if there was no error */
    public async saveItem<Entity extends GenericEntity = GenericEntity>({
        ctx,
        rootMetadata,
        validatorOptions,
        routeOptions,
        subresourceRelation,
    }: SaveItemArgs<Entity>) {
        const { operation, values } = ctx;
        const repository = getRepository<Entity>(rootMetadata.target);
        const cleanedItem = this.cleaner.cleanItem({ rootMetadata, operation, values, options: routeOptions });
        const item = repository.create(cleanedItem);

        // Allow partially updating an entity
        const defaultValidatorOptions: Partial<ValidateItemOptions> =
            operation === "update" ? { skipMissingProperties: true } : {};
        const validationOptions = { ...defaultValidatorOptions, ...validatorOptions, context: ctx };
        const errors = await this.validator.validateItem(rootMetadata, item, validationOptions);

        if (Object.keys(errors).length) {
            return { hasValidationErrors: true, errors } as EntityErrorResponse;
        }

        // Auto-join subresource parent on body values
        if (
            subresourceRelation &&
            (subresourceRelation.relation.isOneToOne || subresourceRelation.relation.isManyToOne)
        ) {
            (item as any)[subresourceRelation.relation.propertyName] = { id: subresourceRelation.id };
        }

        return repository.save(item);
    }
}

export type EntityErrorResponse = { hasValidationErrors: true; errors: EntityErrorResults };

export type SaveItemArgs<Entity extends GenericEntity = GenericEntity> = {
    /** Metadata from entity to save */
    rootMetadata: EntityMetadata;
    /** Minimal equest context (with only relevant parts) */
    ctx: RequestContextMinimal<Entity>;
    /** Used by class-validator & entity-validator */
    validatorOptions?: ValidateItemOptions;
    /** EntityRoute specific options */
    routeOptions?: EntityRouteOptions;
    /** Subresource relation used to auto join saved entity with its parent */
    subresourceRelation?: SubresourceRelation;
};
