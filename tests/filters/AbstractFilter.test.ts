import {
    getRouteFiltersMeta,
    AbstractFilter,
    AbstractFilterApplyArgs,
    RouteFiltersMeta,
    GetPropMetaAtPathOptions,
} from "@/index";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { Cache, CacheFilter, CacheFilterOptions } from "@@/tests/filters/sample/CacheFilter";
import { GroupBy, GroupByFilter } from "@@/tests/filters/sample/GroupByFilter";
import { getRepository, Entity, PrimaryGeneratedColumn, Column, ManyToOne, EntityMetadata, Repository } from "typeorm";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";
import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";

describe("AbstractFilter", () => {
    class AbstractEntity {
        @PrimaryGeneratedColumn()
        id: number;
    }

    describe("protected methods", () => {
        @Entity()
        class Role extends AbstractEntity {
            @Column()
            identifier: string;
        }

        @Entity()
        class User extends AbstractEntity {
            @Column()
            firstName: string;

            @ManyToOne(() => Role)
            role: Role;
        }

        class TestAbstractFilter extends AbstractFilter {
            apply() {}

            // Protected methods

            getPropMetaAtPath(propPath: string | string[]): ColumnMetadata;
            getPropMetaAtPath<T>(
                propPath: string | string[],
                options: GetPropMetaAtPathOptions<T>
            ): T extends true ? RelationMetadata : ColumnMetadata;
            getPropMetaAtPath(propPath: string | string[], options?: GetPropMetaAtPathOptions) {
                return super.getPropMetaAtPath(propPath, options);
            }

            getPropMetaAtPathInEntity(propPath: string | string[], entityMetadata: EntityMetadata): ColumnMetadata;
            getPropMetaAtPathInEntity<T extends boolean>(
                propPath: string | string[],
                entityMetadata: EntityMetadata,
                options: GetPropMetaAtPathOptions<T>
            ): T extends true ? RelationMetadata : ColumnMetadata;
            getPropMetaAtPathInEntity(
                propPath: string | string[],
                entityMetadata: EntityMetadata,
                options?: GetPropMetaAtPathOptions
            ) {
                return super.getPropMetaAtPathInEntity(propPath, entityMetadata, options);
            }

            isFilterEnabledForProperty(propPath: string) {
                return super.isFilterEnabledForProperty(propPath);
            }

            getPropertiesToFilter(queryParams: AbstractFilterApplyArgs["queryParams"]) {
                return super.getPropertiesToFilter(queryParams);
            }

            getPropertiesQueryParamsToFilter(queryParams: AbstractFilterApplyArgs["queryParams"]) {
                return super.getPropertiesQueryParamsToFilter(queryParams);
            }
        }

        let filter: TestAbstractFilter;
        beforeAll(async () => {
            await createTestConnection([User, Role]);
            filter = new TestAbstractFilter({
                config: { options: {}, properties: ["firstName", "role", "role.id"] },
                entityMetadata: getRepository(User).metadata,
            });
        });
        afterAll(closeTestConnection);

        describe("getPropMetaAtPath", () => {
            it("should return column", () => {
                expect(filter.getPropMetaAtPath("firstName").propertyName).toEqual("firstName");
                expect(filter.getPropMetaAtPath("role.identifier").propertyName).toEqual("identifier");
            });
            it("should not find any column", () => {
                expect(filter.getPropMetaAtPath("notExistingKey")).toEqual(null);
            });
        });

        describe("getPropMetaAtPathInEntity", () => {
            let entityMetadata: EntityMetadata;
            beforeAll(() => (entityMetadata = getRepository(User).metadata));

            it("should return column on shallow path", () => {
                expect(filter.getPropMetaAtPathInEntity("firstName", entityMetadata)?.propertyName).toEqual(
                    "firstName"
                );
            });

            it("should return id column on shallow path that leads to a relation", () => {
                expect(filter.getPropMetaAtPathInEntity("role", entityMetadata).propertyName).toEqual("id");
            });

            it("should return relation on shallow path if options.shouldReturnRelationInsteadOfId is true", () => {
                expect(
                    filter.getPropMetaAtPathInEntity("role", entityMetadata, { shouldReturnRelationInsteadOfId: true })
                        .propertyName
                ).toEqual("role");
            });

            it("should return column on nested prop with dot-delimited path", () => {
                expect(filter.getPropMetaAtPathInEntity("role.identifier", entityMetadata).propertyName).toEqual(
                    "identifier"
                );
            });

            it("should return column on nested prop array path", () => {
                expect(filter.getPropMetaAtPathInEntity(["role", "id"], entityMetadata).propertyName).toEqual("id");
            });

            it("should not find any column", () => {
                expect(filter.getPropMetaAtPathInEntity("notExistingKey", entityMetadata)).toEqual(null);
            });
        });

        describe("isFilterEnabledForProperty", () => {
            it("should return true on enabled props", () => {
                expect(filter.isFilterEnabledForProperty("firstName")).toEqual(true);
                expect(filter.isFilterEnabledForProperty("role.id")).toEqual(true);
            });
            it("should return false on other props", () => {
                expect(filter.isFilterEnabledForProperty("id")).toEqual(false);
                expect(filter.isFilterEnabledForProperty("role.identifier")).toEqual(false);
            });
        });
    });

    describe("Cache example filter", () => {
        @Cache(true, 60)
        @Entity()
        class Role extends AbstractEntity {
            @Column()
            identifier: string;
        }

        @Cache()
        @Entity()
        class User extends AbstractEntity {
            @Column()
            firstName: string;

            @ManyToOne(() => Role)
            role: Role;
        }

        beforeAll(() => createTestConnection([User, Role]));
        afterAll(closeTestConnection);

        it("can register filter using @Cache decorator without options", () => {
            expect(getRouteFiltersMeta(User)).toEqual({
                CacheFilter: {
                    class: CacheFilter,
                    options: { defaultExpireTime: 300, enabled: true, expireTime: undefined },
                    properties: [],
                },
            });
        });

        it("can register filter using @Cache decorator with options", () => {
            expect(getRouteFiltersMeta(Role)).toEqual({
                CacheFilter: {
                    class: CacheFilter,
                    options: { defaultExpireTime: 300, enabled: true, expireTime: 60 },
                    properties: [],
                },
            });
        });

        it("can be applied with options & queryParam value", () => {
            const filtersMeta = getRouteFiltersMeta(Role);
            const repository = getRepository(Role);
            const entityMetadata = repository.metadata;
            const cacheFilter = new CacheFilter({ config: filtersMeta["CacheFilter"], entityMetadata });
            const configOptions = filtersMeta["CacheFilter"].options as CacheFilterOptions;

            let qb = repository.createQueryBuilder();
            cacheFilter.apply({ qb, queryParams: undefined });
            // cache filter should use provided options
            expect(qb.expressionMap.cache).toEqual(true);
            expect(qb.expressionMap.cacheDuration).toEqual(configOptions.expireTime);

            qb = repository.createQueryBuilder();
            const queryParams = { cached: "false" };
            // using a query param should override provided & default options
            cacheFilter.apply({ qb, queryParams });
            expect(qb.expressionMap.cache).toEqual(false);
        });
    });

    describe("GroupBy example filter", () => {
        @Entity()
        class Role extends AbstractEntity {
            @GroupBy()
            @Column()
            identifier: string;
        }

        @GroupBy(["firstName", "role.id"])
        @Entity()
        class User extends AbstractEntity {
            @Column()
            firstName: string;

            @ManyToOne(() => Role)
            role: Role;
        }

        let filtersMeta: RouteFiltersMeta,
            repository: Repository<User>,
            entityMetadata: EntityMetadata,
            groupByFilter: GroupByFilter;
        beforeAll(async () => {
            await createTestConnection([User, Role]);
            filtersMeta = getRouteFiltersMeta(User);
            repository = getRepository(User);
            entityMetadata = repository.metadata;
            groupByFilter = new GroupByFilter({ config: filtersMeta["GroupByFilter"], entityMetadata });
        });
        afterAll(closeTestConnection);

        it("has valid entityProperties", () => {
            expect(groupByFilter.entityProperties).toEqual(["id", "firstName", "role"]);
        });

        it("has valid filterProperties", () => {
            expect(groupByFilter.filterProperties).toEqual(["firstName", "role.id"]);
        });

        it("can be used as ClassDecorator", () => {
            expect(filtersMeta["GroupByFilter"].properties).toEqual(["firstName", "role.id"]);

            const qb = repository.createQueryBuilder();
            groupByFilter.apply({ qb });
            // each provided properties should be used as groupBy
            expect(qb.expressionMap.groupBys).toEqual(filtersMeta["GroupByFilter"].properties);
        });

        it("can be used as PropertyDecorator", () => {
            const filtersMeta = getRouteFiltersMeta(Role);
            const repository = getRepository(Role);
            const entityMetadata = repository.metadata;
            const groupByFilter = new GroupByFilter({ config: filtersMeta["GroupByFilter"], entityMetadata });
            expect(filtersMeta["GroupByFilter"].properties).toEqual(["identifier"]);

            const qb = repository.createQueryBuilder();
            groupByFilter.apply({ qb });
            // each provided properties should be used as groupBy
            expect(qb.expressionMap.groupBys).toEqual(filtersMeta["GroupByFilter"].properties);
        });
    });
});
