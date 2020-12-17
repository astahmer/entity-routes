import { EntityMetadata, EntityProperty, ReferenceType } from "@mikro-orm/core";

import { BaseEntityMeta, ColumnMetadata, RelationMetadata } from "@entity-routes/core";

import { BridgeColumnMetadata } from "./BridgeColumnMetadata";
import { BridgeRelationMetadata } from "./BridgeRelationMetadata";
import { MikroOrmProvider } from "./provider";

// let count = 0;
export class BridgeEntityMetadata implements BaseEntityMeta {
    static readonly columns = new Map();
    static readonly relations = new Map();

    constructor(public readonly instance: EntityMetadata) {
        // console.log(++count);
        if (!MikroOrmProvider.entityMetadatas.get(instance.name)) {
            MikroOrmProvider.entityMetadatas.set(instance.name, this);
        }
    }

    get name() {
        return this.instance.name;
    }

    get target() {
        return this.instance.class;
    }

    get tableName() {
        return this.instance.tableName;
    }

    get relations() {
        return this.instance.relations.map((rel) => this.getRelationMetadata(rel));
    }

    get columns() {
        return Object.values(this.instance.properties).map((prop) => {
            const isRelation = prop.reference !== ReferenceType.SCALAR && prop.reference !== ReferenceType.EMBEDDED;
            return new BridgeColumnMetadata(prop, this, isRelation ? this.getRelationMetadata(prop) : undefined);

            // const key = `${this.name}.${prop.name}`;
            // let column = BridgeEntityMetadata.columns.get(key);

            // if (!column) {
            //     column = new BridgeColumnMetadata(prop, isRelation ? this.getRelationMetadata(prop) : undefined);
            //     BridgeEntityMetadata.columns.set(key, column);
            // }
            // return column;
        });
    }

    findColumnWithPropertyName(propertyName: string): ColumnMetadata | undefined {
        return this.columns.find((col) => col.propertyName === propertyName);
    }

    findRelationWithPropertyName(propertyName: string): RelationMetadata | undefined {
        return this.relations.find((rel) => rel.propertyName === propertyName);
    }

    getRelationMetadata(prop: EntityProperty) {
        const key = `${this.name}.${prop.name}`;
        const relationEntityMetadata = new BridgeEntityMetadata(prop.targetMeta);
        const rel = new BridgeRelationMetadata(prop, relationEntityMetadata, this);
        return rel;

        let relation = BridgeEntityMetadata.relations.get(key);

        if (!relation) {
            const relationBridgeEntityMeta = MikroOrmProvider.entityMetadatas.get(prop.targetMeta.name);
            const relationEntityMetadata = relationBridgeEntityMeta ?? new BridgeEntityMetadata(prop.targetMeta);

            const relation = new BridgeRelationMetadata(prop, relationEntityMetadata, this);
            BridgeEntityMetadata.relations.set(key, relation);
        }

        return relation as BridgeRelationMetadata;
    }
}
