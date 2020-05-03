import { getRouteFiltersMeta } from "@/index";
import { createTestConnection, closeTestConnection } from "@@/tests/testConnection";
import { Cache, CacheFilter, CacheFilterOptions } from "@@/tests/filters/CacheFilter";
import { GroupBy, GroupByFilter } from "@@/tests/filters/GroupByFilter";
import { getRepository, Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";

describe("AbstractFilter", () => {
    class AbstractEntity {
        @PrimaryGeneratedColumn()
        id: number;
    }

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

        beforeAll(async () => createTestConnection([User, Role]));
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

        beforeAll(async () => createTestConnection([User, Role]));
        afterAll(closeTestConnection);

        it("has valid entityProperties", () => {
            const filtersMeta = getRouteFiltersMeta(User);
            const repository = getRepository(User);
            const entityMetadata = repository.metadata;
            const groupByFilter = new GroupByFilter({ config: filtersMeta["GroupByFilter"], entityMetadata });
            expect(groupByFilter.entityProperties).toEqual(["id", "firstName", "role"]);
        });

        it("has valid filterProperties", () => {
            const filtersMeta = getRouteFiltersMeta(User);
            const repository = getRepository(User);
            const entityMetadata = repository.metadata;
            const groupByFilter = new GroupByFilter({ config: filtersMeta["GroupByFilter"], entityMetadata });
            expect(groupByFilter.filterProperties).toEqual(["firstName", "role.id"]);
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

        it("can be used as ClassDecorator", () => {
            const filtersMeta = getRouteFiltersMeta(User);
            const repository = getRepository(User);
            const entityMetadata = repository.metadata;
            const groupByFilter = new GroupByFilter({ config: filtersMeta["GroupByFilter"], entityMetadata });
            expect(filtersMeta["GroupByFilter"].properties).toEqual(["firstName", "role.id"]);

            const qb = repository.createQueryBuilder();
            groupByFilter.apply({ qb });
            // each provided properties should be used as groupBy
            expect(qb.expressionMap.groupBys).toEqual(filtersMeta["GroupByFilter"].properties);
        });
    });
});
