import { SelectQueryBuilder } from "typeorm";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

export type AliasList = Record<string, number>;

export class AliasManager {
    // TODO WeakMap + pass aliasKey
    aliases: AliasList;

    public resetList() {
        this.aliases = {};
        return this.aliases;
    }

    /**
     * Appends a number (of occurences) to a propertName in order to avoid ambiguous sql names
     * @param aliases current list of aliases
     * @param entity add one to the counter on this property name
     * @param propName add one to the counter on this property name
     */

    public generate(entityTableName: string, propName: string) {
        const key = entityTableName + "." + propName;
        this.aliases[key] = this.aliases[key] ? this.aliases[key] + 1 : 1;
        return entityTableName + "_" + propName + "_" + this.aliases[key];
    }

    public getPropertyLastAlias(entityTableName: string, propName: string) {
        const key = entityTableName + "." + propName;
        return entityTableName + "_" + propName + "_" + this.aliases[key];
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
