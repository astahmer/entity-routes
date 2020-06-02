import { validate, ValidatorOptions } from "class-validator";
import { EntityMetadata } from "typeorm";
import { EntityValidatorFunctionOptions, EntityValidator } from "@astahmer/entity-validator";
import { Container, Service } from "typedi";

import { RequestContextMinimal } from "@/services/ResponseManager";
import { isType, isObject } from "@/functions/asserts";
import { GenericEntity } from "@/router/EntityRouter";

@Service()
export class Validator {
    /** Validates sent values & return a record of validation errors */
    public async validateItem<Entity extends GenericEntity = GenericEntity>(
        rootMetadata: EntityMetadata,
        item: Entity,
        options: ValidateItemOptions = {}
    ) {
        const errors: EntityErrorResults = {};
        await this.recursiveValidate(rootMetadata, item, "", errors, options);
        return errors;
    }

    /** Recursively validate sent values & returns errors for each entity not passing validation */
    private async recursiveValidate<Entity extends GenericEntity = GenericEntity>(
        rootMetadata: EntityMetadata,
        item: Entity,
        currentPath: string,
        errorResults: Record<string, EntityError[]>,
        options: ValidateItemOptions = {}
    ) {
        let key: string, prop: any;

        const keys = Object.keys(item);
        // If user is updating entity and item is just an existing relation, no need to validate it since it's missing properties
        if ((options?.skipMissingProperties || currentPath.includes(".")) && keys.length === 1 && keys[0] === "id") {
            return [];
        }

        const routeEntityName = rootMetadata.name.toLocaleLowerCase();
        // Add default groups [entity, entity_operation]
        let groups = options?.groups || [];
        if (!options?.noAutoGroups) {
            groups = groups
                .concat(routeEntityName)
                .concat(options?.context?.operation ? [routeEntityName + "_" + options?.context?.operation] : []);
        }
        const validationOptions = { ...options, groups };

        const [propErrors, classErrors] = await Promise.all([
            validate(item, validationOptions),
            validateEntity(item, validationOptions),
        ]);
        const itemErrors: EntityError[] = propErrors
            .concat(classErrors)
            .map((err) => ({ currentPath, property: err.property, constraints: err.constraints }));

        if (itemErrors.length) {
            // Gotta use item.className for root level errors in order to have a non-empty string as a key
            errorResults[currentPath || routeEntityName] = itemErrors;
        }

        if (options?.skipNestedEntities) {
            return itemErrors;
        }

        // Recursively validates item.props
        const makePromise = (nestedItem: Entity, path: string): Promise<void> =>
            new Promise(async (resolve) => {
                try {
                    const errors = await this.recursiveValidate(rootMetadata, nestedItem, path, errorResults, options);
                    if (errors.length) {
                        errorResults[path] = errors;
                    }
                    resolve();
                } catch (error) {
                    console.error(`Validation failed at path ${path}`);
                    console.error(error);
                    resolve();
                }
            });

        const path = currentPath ? currentPath + "." : "";

        // Parallel async validation on item.props
        const promises: Promise<void>[] = [];
        for (key in item) {
            prop = (item as Record<string, any>)[key];

            if (Array.isArray(prop)) {
                let i = 0;
                for (i; i < prop.length; i++) {
                    promises.push(makePromise(prop[i], `${path}${key}[${i}]`));
                }
            } else if (!(prop instanceof Date) && isType<Entity>(prop, isObject(prop))) {
                promises.push(makePromise(prop, `${path}${key}`));
            }
        }

        await Promise.all(promises);

        return itemErrors;
    }
}

/** Call EntityValidator.execute on entity with given options  */
export async function validateEntity<T extends GenericEntity>(entity: T, options?: EntityValidatorFunctionOptions) {
    const validator = Container.get(EntityValidator);
    return validator.execute(entity, options);
}

export const hasAnyValidationGroupMatchingForRequest = (routeEntityName: string, operation: string) => (
    group: string
) => group === routeEntityName || group === routeEntityName + "_" + operation;

export type EntityError = {
    currentPath: string;
    property: string;
    constraints: {
        [type: string]: string;
    };
};
export type EntityErrorResults = Record<string, EntityError[]>;

export type ValidateItemBaseOptions = {
    /*** When true, do NOT add automatically entity name & operation groups */
    noAutoGroups?: boolean;
    /** When true, only validates shallow props (=avoid recursive validations) */
    skipNestedEntities?: boolean;
};
export type ValidateItemOptions = ValidatorOptions &
    EntityValidatorFunctionOptions<RequestContextMinimal> &
    ValidateItemBaseOptions;
