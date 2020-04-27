import { concat, mergeWith } from "ramda";
import { EntityGroupsMetadata } from "./EntityGroupsMetadata";
import {
    OperationGroups,
    ContextOperations,
    GroupsOperationOrAll,
    ALL_OPERATIONS,
    RouteOperations,
    RouteOperation,
    MetaKey,
    GROUPS_METAKEY,
} from "@/mapping/decorators/Groups";

export class GroupsMetadata {
    /** The key under which the Reflect metadata will be stored on the target entity */
    readonly metaKey: MetaKey;

    /** Entity class constructor, used to retrieve its related EntityMetadata */
    readonly entityTarget: Function;

    /** Every entity's props decorated with @Groups */
    readonly decoratedProps: string[] = [];

    /** An object of Operations containing global props (exposed no matter which route context) */
    readonly globals: OperationGroups = {};

    /** An object with route specific OperationsGroups */
    readonly routes: ContextOperations = {};

    /**
     * An object with every exposed props merged
     * (globals + specific + parents globals + specific) for each route context > Operations
     */
    readonly exposedPropsByContexts: ContextOperations = {};

    constructor(metaKey: MetaKey, entityTarget: Function) {
        this.metaKey = metaKey;
        this.entityTarget = entityTarget;
    }

    addPropToGlobalGroups(groups: GroupsOperationOrAll, propName: string) {
        if (groups === "all") {
            groups = ALL_OPERATIONS;
        }

        let i = 0;
        for (i; i < groups.length; i++) {
            if (!this.globals[groups[i]]) {
                this.globals[groups[i]] = [];
            }
            this.globals[groups[i]].push(propName);
        }

        if (!this.decoratedProps.includes(propName)) {
            this.decoratedProps.push(propName);
        }
    }

    addPropToRoutesGroups(groups: RouteOperations, propName: string) {
        let route;
        for (route in groups) {
            let i = 0;

            if (groups[route] === "all") {
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

                this.routes[route][operation].push(propName);
            }
        }

        if (!this.decoratedProps.includes(propName)) {
            this.decoratedProps.push(propName);
        }
    }

    /**
     * Merge globals groups with route specific groups
     * @example
     * this.globals = ["details", "list", ...];
     * this.routes = { user: ["create", "details", "delete"], category: ["create", "update"] };
     * return ['details', 'list', 'create', 'delete'] // for route = 'user'
     */
    getOwnExposedProps(route: string): OperationGroups {
        let groups;
        if (this.globals && this.routes[route]) {
            groups = mergeWith(concat, this.globals, this.routes[route]);
        } else {
            groups = this.globals || this.routes[route];
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
        let parentProps;

        for (i; i < inheritanceTree.length; i++) {
            parentProps = getOwnExposedProps(inheritanceTree[i], tableName, this.metaKey);

            if (parentProps) {
                props = mergeWith(concat, props, parentProps);
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

export type GroupsMetaByRoutes<G extends GroupsMetadata = GroupsMetadata> = Record<string, G>;

/**
 * Get groups metadata for a given entity and merge global groups with route specific groups
 */
export function getOwnExposedProps(
    target: Function,
    tableName: string,
    metaKey: MetaKey = GROUPS_METAKEY
): OperationGroups {
    const groupsMeta: EntityGroupsMetadata = Reflect.getOwnMetadata(metaKey, target);

    return groupsMeta?.getOwnExposedProps(tableName);
}

/**
 * Get exposed props (from groups) for a given context (tableName)
 */
export function getExposedProps(target: Function, tableName: string, metaKey: MetaKey = GROUPS_METAKEY) {
    const groupsMeta: EntityGroupsMetadata = Reflect.getOwnMetadata(metaKey, target);

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
        if (proto && proto.name) {
            tree.push(proto);
            getPrototypeOf(proto);
        }
    };
    getPrototypeOf(entity);
    return tree;
}
