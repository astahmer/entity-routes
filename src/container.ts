import * as Koa from "koa";
import * as KoaRouter from "koa-router";
import { ObjectType, getConnectionManager, Connection, ConnectionManager } from "typeorm";
import { EntityRouteOptions, getRouteMetadata, EntityRouteService } from "@/services/EntityRoute";

export type ServerApp = Koa;

export const entityRoutesContainer: Record<string, EntityRouteService<any>> = {};
export const Router = KoaRouter;

let connectionManager: ConnectionManager;

declare const module: any;
if (module.hot) {
    module.hot.accept(console.log);
}

/** Make an EntityRoute out of each given entities and assign them a global options object (overridable with @EntityRoute) */
export async function useEntitiesRoutes({
    app,
    connections,
    entities,
    options = defaultEntityRouteOptions,
}: UseEntitiesRoutes) {
    // Handle HMR by resetting connections array
    if (connectionManager) connectionManager.connections.splice(0, connectionManager.connections.length);
    // Init with existing connections
    connectionManager = getConnectionManager();
    connectionManager.connections.push(...connections);

    // Instanciate every EntityRoute
    const entityRoutes = entities.reduce((acc, entity) => {
        const routeMeta = getRouteMetadata(entity);
        if (routeMeta) {
            acc.push(new EntityRouteService(entity, options));
        }

        return acc;
    }, []);

    // Make router for each of them
    entityRoutes.forEach((entityRoute) => app.use(entityRoute.makeRouter().routes()));
}

export const defaultEntityRouteOptions: EntityRouteOptions = {
    isMaxDepthEnabledByDefault: true,
    defaultMaxDepthLvl: 2,
    shouldMaxDepthReturnRelationPropsId: true,
    shouldEntityWithOnlyIdBeFlattenedToIri: true,
    shouldSetSubresourcesIriOnItem: true,
};

type UseEntitiesRoutes = {
    app: ServerApp;
    connections: Connection[];
    entities: ObjectType<any>[];
    options?: EntityRouteOptions;
};
