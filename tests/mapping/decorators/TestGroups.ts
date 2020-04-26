import {
    GroupsOperationOrAll,
    RouteOperations,
    registerGroupsDecorator,
    GroupsMetadata,
    GROUPS_METAKEY,
} from "@/index";

// Using metaClass GroupsMetadata instead of EntityGroupsMetadata for testing
export function TestGroups(groups: RouteOperations): PropertyDecorator;
export function TestGroups(operations: GroupsOperationOrAll): PropertyDecorator;
export function TestGroups(groups: GroupsOperationOrAll | RouteOperations, alias?: string): MethodDecorator;
export function TestGroups(
    groups: GroupsOperationOrAll | RouteOperations,
    alias?: string
): PropertyDecorator | MethodDecorator {
    return registerGroupsDecorator<GroupsMetadata>({
        metaKey: GROUPS_METAKEY,
        metaClass: GroupsMetadata,
        groups,
        alias,
    });
}
