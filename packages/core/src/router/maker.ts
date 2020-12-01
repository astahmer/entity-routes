import {
    AnyFunction,
    EntityRouteOptions,
    EntityRouter,
    EntityRouterOptions,
    GenericEntity,
    deepMerge,
    getRouteMetadata,
    setEntityRouter,
} from "@entity-routes/core";
import { getMetadataStorage } from "class-validator";
import { Connection, ConnectionManager, ObjectType, getConnectionManager } from "typeorm";

let connectionManager: ConnectionManager;

/** Make an EntityRouter out of each given entities and assign them a global options object (overridable with @EntityRoute) */
export async function makeEntityRouters<T extends AnyFunction = any>({
    connection,
    entities,
    options,
}: MakeEntityRouters<T>) {
    options = deepMerge({}, defaultEntityRouteOptions, options);

    // Init with existing connections
    connectionManager = getConnectionManager();
    // Handle HMR by resetting connections array
    if (connectionManager) connectionManager.connections.splice(0, connectionManager.connections.length);

    connectionManager.connections.push(connection);

    // Fix class-validator shitty default behavior with groups
    setEntityValidatorsDefaultOption(entities);

    // Instantiate every EntityRouter
    const entityRouters: EntityRouter<GenericEntity>[] = entities.reduce((acc, entity) => {
        const routeMeta = getRouteMetadata(entity);
        if (routeMeta) {
            // Add this EntityRouter to the list (used by subresources/custom actions/services)
            const router = new EntityRouter(entity, routeMeta, options);
            setEntityRouter(entity.name, router);
            acc.push(router);
        }

        return acc;
    }, []);

    // Make bridge router for each of them
    const bridgeRouters = entityRouters.map((entityRoute) => entityRoute.makeRouter<ReturnType<T>>());
    return bridgeRouters;
}

/** The default options for every EntityRouter, unless overriden in the MakeEntityRouters["options"] key */
export const defaultEntityRouteOptions: EntityRouteOptions = {
    defaultMaxDepthOptions: { isMaxDepthEnabledByDefault: true, defaultMaxDepthLvl: 2 },
    defaultListDetailsOptions: { shouldMaxDepthReturnRelationPropsId: true, withDeleted: false },
    defaultWriterOptions: {
        useIris: true,
        shouldEntityWithOnlyIdBeFlattened: true,
        shouldSetSubresourcesIriOnItem: true,
        shouldSetComputedPropsOnItem: true,
    },
    defaultCreateUpdateOptions: { shouldAutoReload: true },
    defaultSubresourcesOptions: { defaultSubresourceMaxDepthLvl: 2 },
    allowSoftDelete: false,
};

export type MakeEntityRouters<T extends AnyFunction = any> = {
    /** TypeORM active connection for the EntityRouters */
    connection: Connection;
    /** The list of entities with EntityRoute metadata to make an EntityRouter for */
    entities: ObjectType<GenericEntity>[];
    /** Each EntityRouter will take its default options from this, this is deep merged with the defaultEntityRouteOptions */
    options: EntityRouterOptions<T>;
};

/** Set "always" validator option to true when no groups are passed to validation decorators */
export function setEntityValidatorsDefaultOption(entities: Function[]) {
    const validationMetaStorage = getMetadataStorage();

    entities.forEach((entity) => {
        const metadatas = validationMetaStorage.getTargetValidationMetadatas(entity, entity.name);

        let i = 0;
        for (i; i < metadatas.length; i++) {
            if (!metadatas[i].groups || !metadatas[i].groups?.length) {
                metadatas[i].always = true;
            }
        }
    });
}
