import React, { useState, useMemo } from "react";
import { Stack, Divider } from "@chakra-ui/core";
import {
    Entities,
    makeRecordFromKeys,
    baseEntityNames,
    defaultEntity,
    removeValue,
    getMaxDepthData,
    getUniqueRoutes,
    SubresourcePlaygroundContext,
} from "./helpers";
import { PropsByEntities } from "./PropsByEntities";
import { SubresourceRouteList } from "./SubresourceRouteList";
import { Toolbar } from "./Toolbar";

let resetKey = 0;
export function SubresourcePlayground() {
    const [globalMaxDepth, setGlobalMaxDepth] = useState(2);
    const [entities, setEntities] = useState<Entities>(makeRecordFromKeys(baseEntityNames, defaultEntity));
    const resetEntities = () => {
        resetKey++;
        setEntities(makeRecordFromKeys(baseEntityNames, defaultEntity));
    };

    const entityNames = useMemo(() => Object.keys(entities), [entities]);
    const entityRoutes = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(entities).map(([name, entity]) => [name, entity.routes.map((route) => route.join("_"))])
            ),
        [entities]
    );

    // Generics
    const addEntity = (name: string) => setEntities((current) => ({ ...current, [name]: defaultEntity }));
    // Remove entity, remove maxDepth/properties references & cut routes path after the removed entity
    const removeEntity = (name: string) =>
        setEntities((current) =>
            Object.fromEntries(
                Object.entries(current)
                    .filter(([key, value]) => key !== name)
                    .map(
                        ([
                            key,
                            {
                                maxDepths: { [name]: removed, ...otherMaxDepths },
                                properties,
                                routes,
                                ...rest
                            },
                        ]) => [
                            key,
                            {
                                maxDepths: { ...otherMaxDepths },
                                properties: removeValue(properties, name),
                                routes: routes.map((route) => {
                                    const index = route.findIndex((subresource) => subresource === name);
                                    return index !== -1 ? route.slice(0, index) : route;
                                }),
                                ...rest,
                            },
                        ]
                    )
            )
        );

    const setEntityKeyValue = (entity: string, key: string, value: any) =>
        setEntities((current) => ({
            ...current,
            [entity]: {
                ...(current[entity] || defaultEntity),
                [key]: value,
            },
        }));

    const setMaxDepths = (entity: string, maxDepths: Record<string, number>) =>
        setEntityKeyValue(entity, "maxDepths", maxDepths);
    const setProperties = (entity: string, properties: string[]) => setEntityKeyValue(entity, "properties", properties);
    const setBoolean = (entity: string, key: string, value: boolean) => setEntityKeyValue(entity, key, value);

    // Routes
    const setRoutes = (entity: string, routes: Array<string[]>) => setEntityKeyValue(entity, "routes", routes);
    const addRoute = (entity: string) => setRoutes(entity, [...entities[entity].routes, []]);
    const generateRoutes = () => {
        // Recursively add every nested route possible from that path on that entity
        function addNestedRoutes(entity: string, subresource: string, route: string[], routes: string[][]) {
            const currentPath = route.concat(subresource);
            const { hasReachedMaxDepth } = getMaxDepthData({ entity, route, globalMaxDepth, entities });

            const cantHaveNested = route.length && !entities[route[route.length - 1]].canHaveNested;
            const cantBeNested = route.length && !entities[subresource].canBeNested;
            if (hasReachedMaxDepth || cantHaveNested || cantBeNested) {
                routes.push(route);
                return;
            }

            routes.push(currentPath);

            entities[subresource].properties.map((prop) => addNestedRoutes(entity, prop, currentPath, routes));
        }

        // For each entity, add every possible routes recursively and de-duplicate them
        const entityRoutes = Object.fromEntries(
            Object.entries(entities).map(([name, entity]) => {
                const nestedRoutes = [];
                entity.properties.map((prop) => addNestedRoutes(name, prop, [], nestedRoutes));
                return [name, getUniqueRoutes(nestedRoutes)];
            })
        );

        // Update each entities.routes
        setEntities((current) =>
            Object.fromEntries(
                Object.entries(current).map(([key, value]) => [key, { ...value, routes: entityRoutes[key] }])
            )
        );
    };

    const ctx: SubresourcePlaygroundContext = {
        resetEntities,
        setEntities,
        entities,
        entityNames,
        entityRoutes,
        addEntity,
        removeEntity,
        setMaxDepths,
        setProperties,
        setBoolean,
        setRoutes,
        addRoute,
        globalMaxDepth,
    };

    return (
        <SubresourcePlaygroundContext.Provider value={ctx} key={resetKey}>
            <Stack spacing={6} shouldWrapChildren mt="4">
                <Toolbar onSubmit={addEntity} onMaxDepthChange={setGlobalMaxDepth} generateRoutes={generateRoutes} />
                <Divider />
                <PropsByEntities />
                <Divider my="0" />
                <SubresourceRouteList />
            </Stack>
        </SubresourcePlaygroundContext.Provider>
    );
}
