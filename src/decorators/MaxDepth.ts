import { EntityMetadata } from "typeorm";

/**
 * Will apply MaxDepth attribute on every properties of this entity
 */
export function MaxDepth(): ClassDecorator;

/**
 * Will apply MaxDepth on that property
 * @param max depth recursion enabled
 */
export function MaxDepth(max: number): PropertyDecorator;

export function MaxDepth(max: number = 2): ClassDecorator | PropertyDecorator {
    return (target: Object, propName: string) => {
        // If propName is defined => PropertyDecorator, else it's a ClassDecorator
        target = propName ? target.constructor : target;
        const maxDepth = Reflect.getOwnMetadata(MAX_DEPTH_METAKEY, target) || { enabled: false, fields: {} };
        if (propName) {
            maxDepth.fields[propName] = max;
        } else {
            maxDepth.enabled = true;
            maxDepth.depthLvl = max;
        }
        Reflect.defineMetadata(MAX_DEPTH_METAKEY, maxDepth, target);
    };
}

export const MAX_DEPTH_METAKEY = Symbol("maxDepth");
export const getMaxDepthMetadata = (entity: Function): MaxDeptMetadata =>
    Reflect.getOwnMetadata(MAX_DEPTH_METAKEY, entity);

export type MaxDeptMetadata = {
    enabled?: EntityMetadata;
    depthLvl?: number;
    fields: {
        [propName: string]: number;
    };
};
