export type DependsOnMetadata = Record<string, string[]>;
export const DEPENDS_ON_META_KEY = Symbol("dependsOn");
export const getDependsOnMetadata = (entity: Function): DependsOnMetadata =>
    Reflect.getOwnMetadata(DEPENDS_ON_META_KEY, entity) || {};

export function DependsOn(properties: string[]): MethodDecorator {
    return (target: Object, propertyKey: string, _descriptor: PropertyDescriptor) => {
        const dependsOnMeta = getDependsOnMetadata(target.constructor);
        dependsOnMeta[propertyKey] = properties;
        Reflect.defineMetadata(DEPENDS_ON_META_KEY, dependsOnMeta, target.constructor);
    };
}
