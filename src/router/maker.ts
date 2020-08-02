import { ObjectType, getConnectionManager, Connection, ConnectionManager } from "typeorm";
import { getMetadataStorage } from "class-validator";

import {
    EntityRouteOptions,
    getRouteMetadata,
    EntityRouter,
    GenericEntity,
    EntityRouterFactoryOptions,
} from "@/router/EntityRouter";
import { setEntityRouter } from "@/router/container";
import { AnyFunction } from "@/utils-types";

let connectionManager: ConnectionManager;

declare const module: any;
if (module.hot) {
    module.hot.accept(console.log);
}

/** Make an EntityRouter out of each given entities and assign them a global options object (overridable with @EntityRoute) */
export async function makeEntityRouters<T extends AnyFunction = any>({
    connection,
    entities,
    options,
}: MakeEntityRouters<T>) {
    options = { ...defaultEntityRouteOptions, ...options };

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

export const defaultEntityRouteOptions: EntityRouteOptions = {
    isMaxDepthEnabledByDefault: true,
    defaultMaxDepthLvl: 2,
    shouldMaxDepthReturnRelationPropsId: true,
    shouldEntityWithOnlyIdBeFlattenedToIri: true,
    shouldSetSubresourcesIriOnItem: true,
    defaultSubresourceMaxDepthLvl: 2,
    allowSoftDelete: false,
    defaultCreateUpdateOptions: { shouldAutoReload: true, shouldFormatResult: true },
};

export type MakeEntityRouters<T extends AnyFunction = any> = {
    connection: Connection;
    entities: ObjectType<GenericEntity>[];
    options: EntityRouterFactoryOptions<T> & EntityRouteOptions;
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
