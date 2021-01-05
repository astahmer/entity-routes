import { EntityProperty } from "@mikro-orm/core";

import { ColumnMetadata } from "@entity-routes/core";

import { BridgeEntityMetadata } from "./BridgeEntityMetadata";
import { BridgeRelationMetadata } from "./BridgeRelationMetadata";

// let count = 0;
export class BridgeColumnMetadata implements ColumnMetadata {
    constructor(
        public readonly instance: EntityProperty,
        public readonly entityMetadata: BridgeEntityMetadata,
        public readonly relationMetadata?: BridgeRelationMetadata
    ) {
        // console.log(++count);
    }

    get propertyName() {
        return this.instance.name;
    }

    get databaseName() {
        return this.instance.fieldNames.length === 1 && this.instance.fieldNames[0];
    }

    get type() {
        return this.instance.type;
    }
}