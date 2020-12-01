import { Container } from "typedi";

import { GenericEntity, MappingManager, RequestContext, idToIRI, isEntity } from "@entity-routes/core";

import { DecorateFnArgs } from "../Decorator";
import { WriterOptions } from "../Writer";

/** Flatten item with only id/iri if needed */
export function flattenItem<Entity extends GenericEntity>(args: DecorateFnArgs<Entity, FlattenItemOptions>) {
    const { item, itemMetadata, rootMetadata, data, cloneRef } = args;
    const mappingManager = Container.get(MappingManager);
    const computedProps = mappingManager.getComputedProps(rootMetadata, data.operation, itemMetadata);
    const shouldFlatten =
        data.shouldEntityWithOnlyIdBeFlattened &&
        isEntity(item) &&
        Object.keys(item).length === 1 &&
        !computedProps.length &&
        (data.shouldOnlyFlattenNested ? !args.isRoot : true);

    // Can only flatten self if it has 1 key (id) & no computed props exposed
    // Also check that we are in a nested prop rather than root if shouldOnlyFlattenNested is true
    if (shouldFlatten) cloneRef.ref = data?.useIris ? (idToIRI(itemMetadata, item.id) as any) : item.id;
}

export type BaseFlattenItemOptions = {
    /**
     * If this & shouldEntityWithOnlyIdBeFlattened are both true
     * Will only flatten the root entity properties
     * @example
     * shouldOnlyFlattenNested = true
     * shouldEntityWithOnlyIdBeFlattened = false
     * -> does nothing
     *
     * shouldOnlyFlattenNested = true
     * shouldEntityWithOnlyIdBeFlattened = true
     * ->
     * {
     *  name: "Alex",
     *  role: "/api/roles/123", // This relation was flattened as IRI
     * }
     *
     * shouldOnlyFlattenNested = true
     * shouldEntityWithOnlyIdBeFlattened = true
     * ->
     * {
     *  id: 123, // Even though the root entity only contains ID it was NOT flattened
     * }
     *
     * shouldOnlyFlattenNested = false
     * shouldEntityWithOnlyIdBeFlattened = true
     * ->
     * "/api/user/123"  // EVEN the root entity will be flattened as IRI
     */
    shouldOnlyFlattenNested?: boolean;
    /**
     * In case of a relation with no other mapped props (from groups) than id: will unwrap "relation { id }" to relation = id|iri
     * @example
     * shouldEntityWithOnlyIdBeFlattened = true
     * ->
     * {
     *  name: "Alex",
     *  role: "/api/roles/123", // This relation was flattened as IRI
     * }
     *
     * shouldEntityWithOnlyIdBeFlattened = false
     * ->
     * {
     *  name: "Alex",
     *  role: {
     *      id: 123, // this relation was NOT flattened as IRI|id
     *  }
     * }
     */
    shouldEntityWithOnlyIdBeFlattened?: boolean;
};

export type FlattenItemOptions = Pick<RequestContext, "operation"> &
    Pick<WriterOptions, "useIris"> &
    BaseFlattenItemOptions;
