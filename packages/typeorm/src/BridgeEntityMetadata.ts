import { EntityMetadata } from "typeorm";

import { BaseEntityMeta, ColumnMetadata, RelationMetadata } from "@entity-routes/core";

import { BridgeColumnMetadata } from "./BridgeColumnMetadata";
import { BridgeRelationMetadata } from "./BridgeRelationMetadata";

export class BridgeEntityMetadata implements BaseEntityMeta {
    get name() {
        return this.instance.name;
    }

    get target() {
        return this.instance.target;
    }

    get tableName() {
        return this.instance.tableName;
    }

    get relations() {
        return this.instance.relations.map((rel) => new BridgeRelationMetadata(rel));
    }

    get columns() {
        return this.instance.columns.map((col) => new BridgeColumnMetadata(col, this));
    }

    constructor(public readonly instance: EntityMetadata) {}

    findColumnWithPropertyName(propertyName: string): ColumnMetadata | undefined {
        return this.columns.find((col) => col.propertyName === propertyName);
    }

    findRelationWithPropertyName(propertyName: string): RelationMetadata | undefined {
        return this.relations.find((rel) => rel.propertyName === propertyName);
    }
}
