import { NonFunctionKeys, ObjectType } from "@entity-routes/shared";

export interface GenericEntity {
    [k: string]: any;
    id: string | number;
}
export type Props<T extends GenericEntity> = NonFunctionKeys<T>;

export type EntityKeys<T extends GenericEntity> = {
    [K in keyof T]: T[K] extends GenericEntity ? K : never;
}[keyof T];

export type EntityReference = <Entity extends GenericEntity>(type?: Entity) => ObjectType<Entity>;
