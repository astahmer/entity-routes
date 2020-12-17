import { EntityProperty, ReferenceType } from "@mikro-orm/core";

import { RelationMetadata } from "@entity-routes/core";

import { BridgeEntityMetadata } from "./BridgeEntityMetadata";

export class BridgeRelationMetadata implements RelationMetadata {
    constructor(
        public readonly instance: EntityProperty,
        public readonly entityMetadata: BridgeEntityMetadata,
        public readonly inverseEntityMetadata?: BridgeEntityMetadata
    ) {}

    get target() {
        return this.instance.targetMeta.class;
    }

    get propertyName() {
        return this.instance.name;
    }

    get inverseRelation() {
        const hasInverse = this.inversePropertyName;
        const rel = hasInverse
            ? this.entityMetadata.relations.find((rel) => rel?.propertyName === hasInverse)
            : undefined;
        return rel;
    }

    get inversePropertyName() {
        return this.instance.mappedBy || this.instance.inversedBy;
    }

    get isOneToOne() {
        return this.instance.reference === ReferenceType.ONE_TO_ONE;
    }
    get isOneToMany() {
        return this.instance.reference === ReferenceType.ONE_TO_MANY;
    }
    get isManyToOne() {
        return this.instance.reference === ReferenceType.MANY_TO_ONE;
    }
    get isManyToMany() {
        return this.instance.reference === ReferenceType.MANY_TO_MANY;
    }
}
