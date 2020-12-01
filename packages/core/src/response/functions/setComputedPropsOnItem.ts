import {
    ACCESSOR_PREFIX,
    ALIAS_PREFIX,
    COMPUTED_PREFIX,
    GenericEntity,
    GroupsOperation,
    MappingManager,
    lowerFirstLetter,
} from "@entity-routes/core";
import { Container } from "typedi";

import { DecorateFnArgs } from "../Decorator";

export const computedPropRegex = /^(get|is|has).+/;

/**
 * Returns a formated version of the method name
 *
 * @param computed actual method name
 * @example makeComputedPropNameFromMethod("getIdentifier") = "identifier"
 */
export const makeComputedPropNameFromMethod = (computed: string) => {
    const regexResult = computed.match(computedPropRegex);
    if (regexResult) {
        return lowerFirstLetter(computed.replace(regexResult[1], ""));
    }

    throw new Error('A computed property method should start with either "get", "is", or "has": ' + computed);
};

/**
 * Returns actual method name without prefixes & computed prop alias for the response
 *
 * @param computed method name prefixed with COMPUTED_PREFIX & ALIAS_PREFIX/alias if there is one
 */
export const getComputedPropMethodAndKey = (computed: string) => {
    const isAccessor = computed.includes(ACCESSOR_PREFIX);
    const computedPropMethod = computed
        .replace(COMPUTED_PREFIX, "")
        .split(ALIAS_PREFIX)[0]
        .replace(ACCESSOR_PREFIX, "");
    const alias = computed.split(ALIAS_PREFIX)[1];
    const propKey = alias || (isAccessor ? computedPropMethod : makeComputedPropNameFromMethod(computedPropMethod));

    return { computedPropMethod, propKey };
};

/** Get/set item computed props if any */
export async function setComputedPropsOnItem<Entity extends GenericEntity>({
    rootMetadata,
    item,
    clone,
    data,
    itemMetadata,
}: DecorateFnArgs<Entity, { operation: GroupsOperation }>) {
    const mappingManager = Container.get(MappingManager);
    const computedProps = mappingManager
        .getComputedProps(rootMetadata, data.operation, itemMetadata)
        .map((computed) => getComputedPropMethodAndKey(computed));

    if (!computedProps.length) return;

    const results = await Promise.all(
        computedProps.map((computed) => item[computed.computedPropMethod as keyof Entity]())
    );
    results.forEach((result, i) => (clone[computedProps[i].propKey as keyof Entity] = result));
}
