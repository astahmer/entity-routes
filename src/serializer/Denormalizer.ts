import { DeepPartial, getRepository, EntityMetadata } from "typeorm";
import Container, { Service } from "typedi";

import { RequestContext } from "@/services/ResponseManager";
import { GenericEntity, EntityRouteOptions } from "@/services/EntityRouter";
import { MappingManager } from "@/services/MappingManager";
import { Cleaner } from "@/serializer/Cleaner";
import { DenormalizerValidatorOptions, EntityErrorResults, Validator } from "@/serializer/Validator";

@Service()
export class Denormalizer<Entity extends GenericEntity = GenericEntity> {
    get mappingManager() {
        return Container.get(MappingManager);
    }

    get cleaner() {
        return Container.get(Cleaner) as Cleaner;
    }

    get validator() {
        return Container.get(Validator) as Validator;
    }

    /** Clean & validate item and then save it if there was no error */
    public async saveItem({ ctx, rootMetadata, validatorOptions, routeOptions }: SaveItemArgs<Entity>) {
        const { operation, values } = ctx;
        const repository = getRepository<Entity>(rootMetadata.target);
        const cleanedItem = this.cleaner.cleanItem({ rootMetadata, operation, values, options: routeOptions });
        const item = repository.create(cleanedItem as DeepPartial<Entity>);

        const defaultValidatorOptions: Partial<ValidateItemOptions> =
            operation === "update" ? { skipMissingProperties: false } : {};
        const errors = await this.validator.validateItem(rootMetadata, item, {
            ...defaultValidatorOptions,
            ...validatorOptions,
            context: ctx,
        });

        if (Object.keys(errors).length) {
            return { hasValidationErrors: true, errors } as EntityErrorResponse;
        }

        return repository.save(item);
    }
}

export type EntityErrorResponse = { hasValidationErrors: true; errors: EntityErrorResults };

export type SaveItemArgs<Entity extends GenericEntity = GenericEntity> = {
    /** Metadata from entity to save */
    rootMetadata: EntityMetadata;
    /** Request context */
    ctx: RequestContext<Entity>;
    /** Used by class-validator & entity-validator */
    validatorOptions?: ValidateItemOptions;
    /** EntityRoute specific options */
    routeOptions?: EntityRouteOptions;
};
