import { RelationMetadata as TypeORMRelationMetadata } from "typeorm/metadata/RelationMetadata";

import { RelationMetadata } from "@entity-routes/core";

import { BridgeEntityMetadata } from "./BridgeEntityMetadata";

export class BridgeRelationMetadata implements RelationMetadata {
    constructor(public readonly instance: TypeORMRelationMetadata) {}

    get target() {
        return this.instance.target;
    }

    get propertyName() {
        return this.instance.propertyName;
    }

    get databaseName() {
        return this.instance.joinTableName;
    }

    get entityMetadata() {
        return new BridgeEntityMetadata(this.instance.entityMetadata);
    }

    get inverseEntityMetadata() {
        return new BridgeEntityMetadata(this.instance.inverseEntityMetadata);
    }

    get isOneToOne() {
        return this.instance.isOneToOne;
    }
    get isOneToMany() {
        return this.instance.isOneToMany;
    }
    get isManyToOne() {
        return this.instance.isManyToOne;
    }
    get isManyToMany() {
        return this.instance.isManyToMany;
    }
}
