import { EntityMetadata } from "typeorm";

import { GroupsMetadata } from "@/mapping/GroupsMetadata";
import { EntityGroupsMetadata } from "@/mapping/EntityGroupsMetadata";
import { PartialRecord } from "@/utils-types";

/**
 * Expose decorated property for each operation for each listed EntityRoute context
 *
 * @param groups An object containing a list of every EntityRoute context
 * @param groups.route Contains an array of Operation in which the decorated property will be exposed
 */
export function Groups(groups: RouteOperations): PropertyDecorator;

/**
 * Expose decorated property for each operation listed (in any EntityContext, this list is global)
 *
 * @param operations An array containing a list of operation in which the decorated property will be exposed
 */
export function Groups(operations: GroupsOperationOrAll): PropertyDecorator;

/**
 * Expose decorated computed property (method) for each operation for each listed EntityRoute context
 *
 * @param groups  An array containing a list of operation in which the decorated property will be exposed / An object containing a list of every EntityRoute context
 * @param groups.route Contains an array of Operation in which the decorated property will be exposed
 * @param alias Override default generated name for this computed property in response
 */
export function Groups(groups: GroupsOperationOrAll | RouteOperations, alias?: string): MethodDecorator;

export function Groups(
    groups: GroupsOperationOrAll | RouteOperations,
    alias?: string
): PropertyDecorator | MethodDecorator {
    return registerGroupsDecorator<EntityGroupsMetadata>({
        metaKey: GROUPS_METAKEY,
        metaClass: EntityGroupsMetadata,
        groups,
        alias,
    });
}

export function registerGroupsDecorator<G extends GroupsMetadata>({
    metaKey,
    metaClass,
    groups,
    alias,
}: RegisterGroupsDecoratorArgs<G>): PropertyDecorator | MethodDecorator {
    return (target: object, propName: string, descriptor?: PropertyDescriptor) => {
        let groupsMeta: G = Reflect.getOwnMetadata(metaKey, target.constructor);
        if (!groupsMeta) {
            groupsMeta = new metaClass(metaKey, target.constructor);
        }

        // Is a computed property (method decorator)
        if (descriptor) {
            propName = formatGroupsMethodName(propName, alias);
        }

        if (Array.isArray(groups)) {
            groupsMeta.addPropToGlobalGroups(groups, propName);
        } else if (groups === "all") {
            groupsMeta.addPropToGlobalGroups(ALL_OPERATIONS, propName);
        } else {
            groupsMeta.addPropToRoutesGroups(groups, propName);
        }

        Reflect.defineMetadata(metaKey, groupsMeta, target.constructor);
    };
}

export type RegisterGroupsDecoratorArgs<G extends GroupsMetadata> = {
    metaKey: GroupsMetadata["metaKey"];
    /** Metadata class stored */
    metaClass: new (metaKey: MetaKey, entityOrMeta: EntityMetadata | Function) => G;
    /** Groups array or array by (route) context, or just "all" */
    groups: GroupsOperationOrAll | RouteOperations;
    /** Alias to be used rather than function name if @Groups is used as MethodDecorator */
    alias?: string;
};

export type RouteDefaultOperation = "create" | "list" | "details" | "update" | "delete";
export type RouteOperation = RouteDefaultOperation | string;

// TODO C|R|U|D | { "groupName": C|R|U|D}
export type GroupsOperation = "create" | "list" | "details" | "update" | string;
export type GroupsOperationOrAll = GroupsOperation[] | "all";
export type RouteOperations = Record<string, GroupsOperationOrAll>;

/** An object with Operation as keys and an array of entity props as values  */
export type OperationGroups = PartialRecord<RouteOperation, string[]>;

/**
 * An object containing many routeContext (keys) associated to OperationsGroups (values)
 * A route context key is the tableName of the EntityRoute (/users => user, /pictures => picture).
 */
export type ContextOperations = Record<string, OperationGroups>;

export const GROUPS_METAKEY = Symbol("groups");
export const ALL_OPERATIONS: GroupsOperation[] = ["create", "list", "details", "update"];
export const COMPUTED_PREFIX = "_COMPUTED_";
export const ALIAS_PREFIX = "_ALIAS_";

export type MetaKey = string | Symbol;
export const getGroupsMetadata = <G extends GroupsMetadata = EntityGroupsMetadata>(
    entity: Function,
    metaKey: MetaKey = GROUPS_METAKEY
) => Reflect.getOwnMetadata(metaKey, entity) as G;

export const formatGroupsMethodName = (propName: string, alias?: string) =>
    COMPUTED_PREFIX + propName + (alias ? ALIAS_PREFIX + alias : "");
