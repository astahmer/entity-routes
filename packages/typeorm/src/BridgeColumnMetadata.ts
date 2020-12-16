import { ColumnMetadata as TypeORMColumnMetadata } from "typeorm/metadata/ColumnMetadata";

import { ColumnMetadata } from "@entity-routes/core";

import { BridgeRelationMetadata } from "./BridgeRelationMetadata";

export class BridgeColumnMetadata implements ColumnMetadata {
    get propertyName() {
        return this.instance.propertyName;
    }
    get type() {
        return this.instance.type;
    }
    get relationMeta() {
        return new BridgeRelationMetadata(this.instance.relationMetadata);
    }
    constructor(public readonly instance: TypeORMColumnMetadata) {}
}
