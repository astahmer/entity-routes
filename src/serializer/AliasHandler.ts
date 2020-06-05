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
        return entityTableName + "_" + propName + "_" + this.aliases[this.getAliasKey(entityTableName, propName)];
    }

    public isJoinAlreadyMade(qb: SelectQueryBuilder<any>, relation: RelationMetadata) {
        return qb.expressionMap.joinAttributes.find(
            (join) => join.entityOrProperty === relation.entityMetadata.tableName + "." + relation.propertyName
        );
    }

    public getAliasForRelation(qb: SelectQueryBuilder<any>, relation: RelationMetadata) {
        const isJoinAlreadyMade = this.isJoinAlreadyMade(qb, relation);

        const alias = isJoinAlreadyMade
            ? this.getPropertyLastAlias(relation.entityMetadata.tableName, relation.propertyName)
            : this.generate(relation.entityMetadata.tableName, relation.propertyName);

        return { isJoinAlreadyMade, alias };
    }
}
