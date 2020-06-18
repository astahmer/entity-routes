import { EntityGroupsMetadata } from "./EntityGroupsMetadata";
import {
    MetaKey,
    PropsByOperations,
    PropsByContextByOperations,
    ALL_OPERATIONS,
    GroupsDecoratorArg,
    RouteOperation,
    GROUPS_METAKEY,
    GroupsOperation,
    getGroupsMetadata,
} from "@/decorators/Groups";
import { deepMerge } from "@/functions/object";
import { getUniqueValues, combineUniqueValues } from "@/functions/array";

export class GroupsMetadata {
    /** The key under which the Reflect metadata will be stored on the target entity */
    readonly metaKey: MetaKey;

    /** Entity class constructor, used to retrieve its related EntityMetadata */
    readonly entityTarget: Function;

    /** Every entity's props decorated with @Groups */
    readonly decoratedProps: string[] = [];

    /**
     * An array of props always exposed no matter which operation or route context
     * @example
     * always = ["create", "read", "specificGroup", "otherCustomOperation"]
     */
    readonly always: RouteOperation[] = [];

    /**
     * An object of Operation containing global props (exposed no matter which route context)
     * @example
     * globals = {
     *     create: ["id", "name", "email", "startDate", "endDate"],
     *     update: ["email", "endDate"],
     *     details: ["id", "name", "startDate", "endDate"],
     *     list: ["id", "name"],
     * }
     */
    readonly globalOperations: PropsByOperations = {};

    /**
     * An object of route contexts as keys & values of array of props always exposed no matter which operation for that context
     * @example
     * locals = {
     *     user: ["id", "name", "email", "startDate", "endDate"],
     *     article: ["name", "endDate"],
     *     role: ["id", "startDate", "endDate"],
     * }
     */
    readonly localAlways: Record<string, string[]> = {};

    /**
     * An object with route specific OperationsGroups
     * @example
     * routes = {
     *     user: {
     *         create: ["id", "name", "email", "startDate", "endDate"],
     *         update: ["email", "endDate"],
     *         details: ["id", "name", "startDate", "endDate"],
     *         list: ["id", "name"],
     *     },
     *     article: {
     *         details: ["id", "name"],
     *         list: ["id", "email"],
     *     },
     * }
     */
    readonly routes: PropsByContextByOperations = {};

    /**
     * An object with every exposed props merged
     * (globals + specific + parents globals + specific) for each route context > Operations
     */
    readonly exposedPropsByContexts: PropsByContextByOperations = {};

    protected readonly deepMergeOptions = deepMergeOptions;

    constructor(metaKey: MetaKey, entityTarget: Function) {
        this.metaKey = metaKey;
        this.entityTarget = entityTarget;
    }

    push(toArray: string[], propName: string) {
        if (!toArray.includes(propName)) {
            toArray.push(propName);
        }

        if (!this.decoratedProps.includes(propName)) {
            this.decoratedProps.push(propName);
        }
    }

    addPropToAlwaysGroups(propName: string) {
        this.push(this.always, propName);
    }

    addPropToGlobalGroups(groups: GroupsOperation[], propName: string) {
        let i = 0;
        for (i; i < groups.length; i++) {
            if (!this.globalOperations[groups[i]]) {
                this.globalOperations[groups[i]] = [];
            }
            this.push(this.globalOperations[groups[i]], propName);
        }
    }

    addPropToRoutesGroups(groups: GroupsDecoratorArg, propName: string) {
        let route;
        for (route in groups) {
            let i = 0;

            if (groups[route] === "all") {
                // Allowing any operation as long as it's in that route context
                if (!this.localAlways[route]) {
                    this.localAlways[route] = [];
                }

                this.push(this.localAlways[route], propName);
                continue;
            } else if (groups[route] === "basic") {
                // Shortcut to [create, update, list, details]
                groups[route] = ALL_OPERATIONS;
            }

            let operation: RouteOperation;
            for (i; i < groups[route].length; i++) {
                if (!this.routes[route]) {
                    this.routes[route] = {};
                }

                operation = groups[route][i] as RouteOperation;

                if (!this.routes[route][operation]) {
                    this.routes[route][operation] = [];
                }

                this.push(this.routes[route][operation], propName);
            }
        }
    }

    /**
     * Merge globals groups with route specific groups
     * @example
     * this.always = ["id"]
     * this.globals = { create: ["email"], details: ["role"] }
     * this.locals = { user: ["name"] };
     * this.routes = { user: { create: ["startDate", "endDate"], list: ["role"] }, category: { details: ["startDate"] } };
     * // for route context = 'user'
     * return {
     *     create: ["id", "email", "name", "startDate", "endDate"],
     *     details: ["id", "role", "name"], list: ["id", "name", "role"]
     * }
     */
    getOwnExposedProps(route: string): PropsByOperations {
        const basicGroups: PropsByOperations = { create: [], update: [], list: [], details: [] };
        const groups = deepMerge(
            basicGroups,
            this.globalOperations,
            this.routes[route],
            this.deepMergeOptions
        ) as PropsByOperations;
        for (let key in groups) {
            groups[key].push(
                ...getUniqueValues(groups[key], combineUniqueValues(this.always, this.localAlways[route]))
            );
        }

        return groups;
    }

    /**
     * Merge groups with every parent entities
     */
    getExposedProps(tableName: string) {
        const inheritanceTree = getInheritanceTree(this.entityTarget);

        let props = getOwnExposedProps(this.entityTarget, tableName, this.metaKey);

        let i = 1; // Skip itself
        let parentProps: PropsByOperations,
            parentGroupsMeta: EntityGroupsMetadata,
            parentOperations: string[],
            parentAlwaysAndLocalsProps: string[];

        for (i; i < inheritanceTree.length; i++) {
            parentGroupsMeta = getGroupsMetadata(inheritanceTree[i], this.metaKey);
            parentProps = parentGroupsMeta?.getOwnExposedProps(tableName);

            if (!parentProps) continue;

            props = deepMerge({}, props, parentProps, this.deepMergeOptions);
            parentOperations = Object.keys(parentProps);

            for (let key in props) {
                if (parentOperations.includes(key)) continue;

                parentAlwaysAndLocalsProps = combineUniqueValues(
                    parentGroupsMeta.always,
                    parentGroupsMeta.localAlways[tableName]
                );
                if (!parentGroupsMeta.exposedPropsByContexts[tableName]) {
                    parentGroupsMeta.exposedPropsByContexts[tableName] = {};
                }
                parentGroupsMeta.exposedPropsByContexts[tableName][key] = parentAlwaysAndLocalsProps;

                props[key].push(...getUniqueValues(props[key], parentAlwaysAndLocalsProps));
            }
        }

        // Cache exposed props
        if (!this.exposedPropsByContexts[tableName]) {
            this.exposedPropsByContexts[tableName] = {};
        }

        this.exposedPropsByContexts[tableName] = props;
        return props;
    }
}

const deepMergeOptions = { withUniqueArrayValues: true };

export type GroupsMetaByRoutes<G extends GroupsMetadata = GroupsMetadata> = Record<string, G>;

/**
 * Get groups metadata for a given entity and merge global groups with route specific groups
 */
export function getOwnExposedProps(
    target: Function,
    tableName: string,
    metaKey: MetaKey = GROUPS_METAKEY
): PropsByOperations {
    const groupsMeta = getGroupsMetadata(target, metaKey);

    return groupsMeta?.getOwnExposedProps(tableName);
}

/**
 * Get exposed props (from groups) for a given context (tableName)
 */
export function getExposedProps(target: Function, tableName: string, metaKey: MetaKey = GROUPS_METAKEY) {
    const groupsMeta = getGroupsMetadata(target, metaKey);

    return groupsMeta?.getExposedProps(tableName);
}

/**
 * Gets given's entity all inherited classes.
 * Gives in order from parents to children.
 * For example Post extends ContentModel which extends Unit it will give
 * [Unit, ContentModel, Post]
 *
 * Taken from typeorm/src/metadata-builder/MetadataUtils.ts
 * @see https://github.com/typeorm/typeorm/
 */
export function getInheritanceTree(entity: Function): Function[] {
    const tree: Function[] = [entity];
    const getPrototypeOf = (object: Function): void => {
        const proto = Object.getPrototypeOf(object);
        if (proto?.name) {
            tree.push(proto);
            getPrototypeOf(proto);
        }
    };
    getPrototypeOf(entity);
    return tree;
}
