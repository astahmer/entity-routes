import { SelectQueryBuilder } from "typeorm";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

export type AliasList = Record<string, number>;

export class AliasHandler {
    readonly aliases: AliasList = {};

    public getAliasKey(entityTableName: string, propName: string) {
        return entityTableName + "." + propName;
    }

    /** Appends a number (of occurences) to a propertName in order to avoid ambiguous sql names */
    public generate(entityTableName: string, propName: string) {
        const key = this.getAliasKey(entityTableName, propName);
        this.aliases[key] = (this.aliases[key] || 0) + 1;
        return this.getPropertyLastAlias(entityTableName, propName);
    }

    public getPropertyLastAlias(entityTableName: string, propName: string) {
        const lastAlias = this.aliases[this.getAliasKey(entityTableName, propName)];
        return entityTableName + "_" + propName + (lastAlias ? "_" + lastAlias : "");
    }

    public isJoinAlreadyMade(qb: SelectQueryBuilder<any>, relation: RelationMetadata, prevAlias?: string) {
        const entityOrProperty = `${prevAlias || relation.entityMetadata.tableName}.${relation.propertyName}`;
        const join = qb.expressionMap.joinAttributes.find((join) => join.entityOrProperty === entityOrProperty);
        return join;
    }

    public getAliasForRelation(qb: SelectQueryBuilder<any>, relation: RelationMetadata, prevAlias?: string) {
        const isJoinAlreadyMade = this.isJoinAlreadyMade(qb, relation, prevAlias);

        const alias = isJoinAlreadyMade
            ? this.getPropertyLastAlias(relation.entityMetadata.tableName, relation.propertyName)
            : this.generate(relation.entityMetadata.tableName, relation.propertyName);

        return { isJoinAlreadyMade, alias };
    }
}
