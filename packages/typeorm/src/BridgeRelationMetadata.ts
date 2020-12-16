import { RelationMetadata as TypeORMRelationMetadata } from "typeorm/metadata/RelationMetadata";

import { RelationMetadata } from "@entity-routes/core";

import { BridgeEntityMetadata } from "./BridgeEntityMetadata";

export class BridgeRelationMetadata implements RelationMetadata {
    get propertyName() {
        return this.instance.propertyName;
    }
    get entityMetadata() {
        return new BridgeEntityMetadata(this.instance.entityMetadata);
    }
    get inverseEntityMetadata() {
        return new BridgeEntityMetadata(this.instance.inverseEntityMetadata);
    }
    constructor(public readonly instance: TypeORMRelationMetadata) {}
}
