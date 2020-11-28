import {
    GROUPS_METAKEY,
    GroupsDecoratorArg,
    GroupsMetadata,
    GroupsOperationOrShortcuts,
    registerGroupsDecorator,
} from "@entity-routes/core";

// Using metaClass GroupsMetadata instead of EntityGroupsMetadata for testing
export function TestGroups(groups: GroupsDecoratorArg): PropertyDecorator;
export function TestGroups(operations: GroupsOperationOrShortcuts): PropertyDecorator;
export function TestGroups(groups: GroupsOperationOrShortcuts | GroupsDecoratorArg, alias?: string): MethodDecorator;
export function TestGroups(
    groups: GroupsOperationOrShortcuts | GroupsDecoratorArg,
    alias?: string
): PropertyDecorator | MethodDecorator {
    return registerGroupsDecorator<GroupsMetadata>({
        metaKey: GROUPS_METAKEY,
        metaClass: GroupsMetadata,
        groups,
        alias,
    });
}
