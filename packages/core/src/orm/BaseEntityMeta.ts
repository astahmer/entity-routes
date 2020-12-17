export interface BaseEntityMeta {
    name: string;
    target: Function | string;
    tableName: string;
    relations: RelationMetadata[];
    columns: ColumnMetadata[];
    findColumnWithPropertyName(propertyName: string): ColumnMetadata | undefined;
    findRelationWithPropertyName(propertyName: string): RelationMetadata | undefined;
}

export interface RelationMetadata {
    target: Function | string;
    propertyName: string;
    entityMetadata: BaseEntityMeta;
    isOneToOne: boolean;
    isOneToMany: boolean;
    isManyToOne: boolean;
    isManyToMany: boolean;
    inversePropertyName?: string | undefined;
    inverseEntityMetadata?: BaseEntityMeta | undefined;
    inverseRelation?: RelationMetadata | undefined;
}

export type StringColumnType = string & { _type: "ColumnType" };
export interface FunctionColumnType {
    toString(): string;
}
export type ColumnType = StringColumnType | FunctionColumnType;

export interface ColumnMetadata {
    type: ColumnType;
    propertyName: string;
    entityMetadata: BaseEntityMeta;
    relationMetadata?: RelationMetadata | undefined;
}
