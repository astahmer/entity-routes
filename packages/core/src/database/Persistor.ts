import {
    Cleaner,
    EntityErrorResults,
    EntityMapperMakeOptions,
    EntityRouteOptions,
    GenericEntity,
    RequestContextMinimal,
    SubresourceRelation,
    ValidateItemOptions,
    Validator,
    deepMerge,
} from "@entity-routes/core";
import { Container, Service } from "typedi";
import { EntityMetadata, getRepository } from "typeorm";

@Service()
export class Persistor {
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
        mapperMakeOptions,
        subresourceRelation,
        hooks,
    }: SaveItemArgs<Entity>) {
        const { requestId, operation, values } = ctx;
        const repository = getRepository<Entity>(rootMetadata.target);
        // TODO Add options to bypass clean/validate steps

        const cleanOptions = { rootMetadata, operation, values, options: mapperMakeOptions };
        await hooks?.beforeClean?.({ requestId, options: cleanOptions });
        const cleanedItem = this.cleaner.cleanItem(cleanOptions);
        await hooks?.afterClean?.({ requestId, options: cleanOptions, result: cleanedItem });

        const item = repository.create(cleanedItem);

        // Allow partially updating an entity
        const defaultValidatorOptions: Partial<ValidateItemOptions> =
            operation === "update" ? { skipMissingProperties: true } : {};
        const validationOptions = deepMerge({}, defaultValidatorOptions, validatorOptions, { context: ctx });

        await hooks?.beforeValidate?.({ requestId, options: validationOptions, item });
        const errors = await this.validator.validateItem(rootMetadata, item, validationOptions);
        const ref = { errors }; // Pass an object with errors key editable with afterValidate hook if needed
        await hooks?.afterValidate?.({ requestId, options: validationOptions, item, ref });

        if (!Object.keys(item).length) {
            throw new Error(
                `Item can't be saved since it's empty, check your @Groups on <${rootMetadata.name}> with <${operation}> operation`
            );
        }

        if (Object.keys(ref.errors).length) {
            return { hasValidationErrors: true, errors: ref.errors } as EntityErrorResponse;
        }

        // Auto-join subresource parent on body values
        if (
            subresourceRelation?.relation?.inverseRelation &&
            (subresourceRelation.relation.inverseRelation.isOneToOne ||
                subresourceRelation.relation.inverseRelation.isManyToOne)
        ) {
            (item as any)[subresourceRelation.relation.inverseRelation.propertyName] = { id: subresourceRelation.id };
        }

        await hooks?.beforePersist?.({ requestId, item });
        const result = await repository.save(item);
        await hooks?.afterPersist?.({ requestId, result });

        return result;
    }
}

export type EntityErrorResponse = { hasValidationErrors: true; errors: EntityErrorResults };

export type SaveItemArgs<Entity extends GenericEntity = GenericEntity> = {
    /** Metadata from entity to save */
    rootMetadata: EntityMetadata;
    /** Minimal request context (with only relevant parts) */
    ctx: RequestContextMinimal<Entity>;
    /** Used by class-validator & entity-validator */
    validatorOptions?: ValidateItemOptions;
    /** EntityMapper make options */
    mapperMakeOptions?: EntityMapperMakeOptions;
    /** Subresource relation used to auto join saved entity with its parent */
    subresourceRelation?: SubresourceRelation;
} & Pick<EntityRouteOptions, "hooks">;
