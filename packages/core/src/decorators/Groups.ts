import { EntityMetadata } from "typeorm";

import { EntityGroupsMetadata, GroupsMetadata } from "../mapping";
import { PartialRecord } from "../utils-types";

/**
 * Expose decorated property for each operation for each listed EntityRoute scope
 *
 * @param groups An object containing a list of every EntityRoute scope
 * @param groups.route Contains an array of Operation in which the decorated property will be exposed
 */
export function Groups(groups: GroupsDecoratorArg): PropertyDecorator;

/**
 * Expose decorated property for each operation listed (in any EntityContext, this list is global)
 *
 * @param operations An array containing a list of operation in which the decorated property will be exposed
 */
export function Groups(operations: GroupsOperationOrShortcuts): PropertyDecorator;

/**
 * Expose decorated computed property (method) for each operation for each listed EntityRoute scope
 *
 * @param groups  An array containing a list of operation in which the decorated property will be exposed / An object containing a list of every EntityRoute scope
 * @param groups.route Contains an array of Operation in which the decorated property will be exposed
 * @param alias Override default generated name for this computed property in response
 */
export function Groups(groups: GroupsOperationOrShortcuts | GroupsDecoratorArg, alias?: string): MethodDecorator;

export function Groups(
    groups: GroupsOperationOrShortcuts | GroupsDecoratorArg,
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
            const isAccessor = Boolean(descriptor.get || descriptor.set);
            propName = formatGroupsMethodName(propName, alias, isAccessor);
        }

        if (typeof groups === "string") {
            // Shortcuts
            if (groups === "all") {
                groupsMeta.addPropToAlwaysGroups(propName);
            } else if (groups === "basic") {
                groupsMeta.addPropToGlobalGroups(GROUPS_OPERATIONS, propName);
            }
        } else if (Array.isArray(groups)) {
            groupsMeta.addPropToGlobalGroups(groups, propName);
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
    groups: GroupsOperationOrShortcuts | GroupsDecoratorArg;
    /** Alias to be used rather than function name if @Groups is used as MethodDecorator */
    alias?: string;
};

export const CRUD_OPERATIONS: RouteDefaultOperation[] = ["create", "list", "details", "update", "delete"];
export type RouteDefaultOperation = "create" | "list" | "details" | "update" | "delete";
export type RouteOperation = RouteDefaultOperation | string;

export type GroupsDefaultOperation = "create" | "list" | "details" | "update";
export type GroupsOperation = GroupsDefaultOperation | string;
export type GroupsOperationOrShortcuts = GroupsOperation[] | "all" | "basic";
export type GroupsDecoratorArg = Record<string, GroupsOperationOrShortcuts>;

/** An object with Operation as keys and an array of entity props as values  */
export type PropsByOperations = PartialRecord<RouteOperation, string[]>;

/**
 * An object containing many routeContext (keys) associated to OperationsGroups (values)
 * A route scope key is the tableName of the EntityRoute (/users => user, /pictures => picture).
 */
export type PropsByContextByOperations = Record<string, PropsByOperations>;

export const GROUPS_METAKEY = Symbol("groups");
export const GROUPS_OPERATIONS: GroupsOperation[] = ["create", "list", "details", "update"];
export const COMPUTED_PREFIX = "_COMPUTED_";
export const ALIAS_PREFIX = "_ALIAS_";
export const ACCESSOR_PREFIX = "_ACCESSOR_";

export type MetaKey = string | Symbol;
export const getGroupsMetadata = <G extends GroupsMetadata = EntityGroupsMetadata>(
    entity: Function,
    metaKey: MetaKey = GROUPS_METAKEY
) => Reflect.getOwnMetadata(metaKey, entity) as G;

export const formatGroupsMethodName = (propName: string, alias?: string, isAccessor?: boolean) => {
    const aliasSuffix = alias ? ALIAS_PREFIX + alias : "";
    return isAccessor ? ACCESSOR_PREFIX + propName + aliasSuffix : COMPUTED_PREFIX + propName + aliasSuffix;
};
