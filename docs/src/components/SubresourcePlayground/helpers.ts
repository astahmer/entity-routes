import { createContext } from "react";

export const baseEntityNames = ["User", "Article", "Comment", "Upvote"];
export const makeRecordFromKeys = (keys: string[], defaultValue: any) =>
    Object.fromEntries(
        keys.map((name) => [name, typeof defaultValue === "function" ? defaultValue(name) : defaultValue])
    );

export const defaultEntity: Entity = {
    maxDepths: {},
    properties: [],
    routes: [[]],
    canHaveNested: true,
    canBeNested: true,
};
export type Entity = {
    maxDepths: Record<string, number>;
    properties: string[];
    routes: Array<string[]>;
    canHaveNested: boolean;
    canBeNested: boolean;
};
export type Entities = Record<string, Entity>;

export const addValue = (arr: any[], value: any) => (arr || []).concat(value);
export const setValueAt = (arr: any[], value: any, index: number) => [
    ...arr.slice(0, index),
    value,
    ...arr.slice(index + 1),
];
export const removeValue = (arr: any[], value: any) => arr.filter((item) => item !== value);

export const getUniqueRoutes = (routes: string[][]) =>
    Array.from(new Set(routes.map((item) => item.join("_"))))
        .filter(Boolean)
        .map((item) => item.split("_"));

export type SubresourcePlaygroundContext = {
    resetEntities: (value?: Record<string, Entity>) => void;
    setEntities: (value: Record<string, Entity>) => void;
    entities: Record<string, Entity>;
    entityNames: string[];
    entityRoutes: Record<string, string[]>;
    addEntity: (name: string) => void;
    removeEntity: (name: string) => void;
    setMaxDepths: (entity: string, maxDepths: Record<string, number>) => void;
    setBoolean: (entity: string, key: string, value: boolean) => void;
    setProperties: (entity: string, properties: string[]) => void;
    setRoutes: (entity: string, routes: Array<string[]>) => void;
    addRoute: (entity: string) => void;
    globalMaxDepth: number;
};
export const SubresourcePlaygroundContext = createContext<SubresourcePlaygroundContext>(null);

/** Mirror API.SubresourceManager behavior with subresources max depths */
export function getMaxDepthData({
    route,
    globalMaxDepth,
    entities,
    entity: entityName,
}: {
    route: string[];
    globalMaxDepth: number;
    entities: Record<string, Entity>;
    entity: string;
}) {
    const currentDepth = 1 + route.length;
    const defaultMaxDepth = globalMaxDepth || 2;

    const maxDepths = route.map((subresource, index) => [
        subresource,
        entities[route[index - 1] || entityName]?.maxDepths[subresource] || defaultMaxDepth,
        route[index - 1] || entityName,
    ]) as [string, number, string][];
    const relativeMaxDepths = maxDepths.map(([subresource, maxDepth, parent], depth) => [
        subresource,
        maxDepth + depth,
        parent,
    ]);

    const maxDepthReachedOnIndex = relativeMaxDepths.findIndex(([_, maxDepth]) => currentDepth > maxDepth);
    const maxDepthInfos = maxDepths[maxDepthReachedOnIndex];
    const hasReachedMaxDepth = maxDepthReachedOnIndex !== -1;

    return { hasReachedMaxDepth, maxDepthInfos, maxDepthReachedOnIndex };
}

export const maxDepthWarning = ([maxDepthReachedOnProp, maxDepthReachedAt, maxDepthReachedFromParent]) =>
    `Max depth (${maxDepthReachedAt}) reached on ${maxDepthReachedFromParent}.${maxDepthReachedOnProp}`;
export const lastPartWarning = (entity: string) => `${entity} doesn't have any more properties availables`;
export const cantHaveNestedWarning = (entity: string) => `${entity} can't be nested`;
export const allSubRoutesAlreadyAddedWarning = () => `All sub routes are already added`;
