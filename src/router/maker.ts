import { ObjectType, getConnectionManager, Connection, ConnectionManager } from "typeorm";
import { getMetadataStorage } from "class-validator";

import {
    EntityRouteOptions,
    getRouteMetadata,
    EntityRouter,
    GenericEntity,
    EntityRouterClassOptions,
} from "@/router/EntityRouter";
import { setEntityRouter } from "@/router/container";

let connectionManager: ConnectionManager;

declare const module: any;
if (module.hot) {
    module.hot.accept(console.log);
}

/** Make an EntityRouter out of each given entities and assign them a global options object (overridable with @EntityRoute) */
export async function makeEntityRouters<T = any>({ connection, entities, options }: MakeEntityRouters<T>) {
    options = { ...defaultEntityRouteOptions, ...options };

    // Handle HMR by resetting connections array
    if (connectionManager) connectionManager.connections.splice(0, connectionManager.connections.length);
    // Init with existing connections
    connectionManager = getConnectionManager();
    connectionManager.connections.push(connection);

    // Fix class-validator shitty default behavior with groups
    entities.forEach(setEntityValidatorsDefaultOption);

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
    const bridgeRouters = entityRouters.map((entityRoute) => entityRoute.makeRouter<T>());
    return bridgeRouters;
}

export const defaultEntityRouteOptions: EntityRouteOptions = {
    isMaxDepthEnabledByDefault: true,
    defaultMaxDepthLvl: 2,
    shouldMaxDepthReturnRelationPropsId: true,
    shouldEntityWithOnlyIdBeFlattenedToIri: true,
    shouldSetSubresourcesIriOnItem: true,
};

export type MakeEntityRouters<T = any> = {
    connection: Connection;
    entities: ObjectType<GenericEntity>[];
    options: EntityRouterClassOptions<T> & EntityRouteOptions;
};

/** Set "always" validator option to true when no groups are passed to validation decorators */
function setEntityValidatorsDefaultOption(entity: Function) {
    const validationMetaStorage = getMetadataStorage();
    const metadatas = validationMetaStorage.getTargetValidationMetadatas(entity, entity.name);

    let i = 0;
    for (i; i < metadatas.length; i++) {
        if (!metadatas[i].groups || !metadatas[i].groups?.length) {
            metadatas[i].always = true;
        }
    }
}
