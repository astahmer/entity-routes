export interface BaseEntityMeta {
    target: Function | string;
    tableName: string;
    relations: RelationMetadata[];
    columns: ColumnMetadata[];
    findColumnWithPropertyName(propertyName: string): ColumnMetadata | undefined;
    findRelationWithPropertyName(propertyName: string): RelationMetadata | undefined;
}

export interface RelationMetadata {
    propertyName: string;
    entityMetadata: BaseEntityMeta;
    inverseEntityMetadata: BaseEntityMeta;
}

export type StringColumnType = string & { _type: "ColumnType" };
export interface FunctionColumnType {
    toString(): string;
}
export type ColumnType = StringColumnType | FunctionColumnType;

export interface ColumnMetadata {
    type: ColumnType;
    propertyName: string;
    relationMeta: RelationMetadata;
}
