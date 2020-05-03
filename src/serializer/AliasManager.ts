import { SelectQueryBuilder } from "typeorm";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

export type AliasList = Record<string, number>;

// TODO Rename to AliasHandler
// mv RelationManager to services ?
export class AliasManager {
    readonly aliases: AliasList = {};

    public getAliasKey(entityTableName: string, propName: string) {
        return entityTableName + "." + propName;
    }

    /**
     * Appends a number (of occurences) to a propertName in order to avoid ambiguous sql names
     * @param aliases current list of aliases
     * @param entity add one to the counter on this property name
     * @param propName add one to the counter on this property name
     */
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
