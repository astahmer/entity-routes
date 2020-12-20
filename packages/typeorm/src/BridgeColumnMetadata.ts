import { ColumnMetadata as TypeORMColumnMetadata } from "typeorm/metadata/ColumnMetadata";

import { ColumnMetadata } from "@entity-routes/core";

import { BridgeEntityMetadata } from "./BridgeEntityMetadata";
import { BridgeRelationMetadata } from "./BridgeRelationMetadata";

export class BridgeColumnMetadata implements ColumnMetadata {
    constructor(
        public readonly instance: TypeORMColumnMetadata,
        public readonly entityMetadata: BridgeEntityMetadata
    ) {}

    get propertyName() {
        return this.instance.propertyName;
    }

    get databaseName() {
        return this.instance.databaseName;
    }

    get type() {
        return this.instance.type;
    }

    get relationMetadata() {
        if (!this.instance.relationMetadata) return;
        return new BridgeRelationMetadata(this.instance.relationMetadata);
    }
}
