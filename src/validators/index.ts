import Container from "typedi";
import { EntityValidator, EntityValidatorFunctionOptions } from "@astahmer/entity-validator";
import { GenericEntity } from "@/services/EntityRoute";

/** Call EntityValidator.execute on entity with given options  */
export async function validateEntity<T extends GenericEntity>(entity: T, options?: EntityValidatorFunctionOptions) {
    const validator = Container.get(EntityValidator);
    return validator.execute(entity, options);
}

// TODO Remove validators & just expose this method
