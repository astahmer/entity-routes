import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { Search, getRouteFiltersMeta, getSearchFilterDefaultConfig } from "@/index";

describe("@Search", () => {
    class AbstractEntity {
        @PrimaryGeneratedColumn()
        id: number;
    }

    it("can register SearchFilter on entity", () => {
        @Search({ allShallow: true })
        @Entity()
        class User extends AbstractEntity {
            @Column()
            firstName: string;
        }

        const defaultConfig = getSearchFilterDefaultConfig();

        expect(getRouteFiltersMeta(User)).toEqual({
            SearchFilter: {
                ...defaultConfig,
                options: {
                    ...defaultConfig.options,
                    allShallow: true,
                },
                properties: [],
            },
        });
    });

    it("can register SearchFilter on prop", () => {
        @Entity()
        class User extends AbstractEntity {
            @Search("STARTS_WITH")
            @Column()
            firstName: string;
        }

        const defaultConfig = getSearchFilterDefaultConfig();

        expect(getRouteFiltersMeta(User)).toEqual({
            SearchFilter: {
                ...defaultConfig,
                properties: [["firstName", "STARTS_WITH"]],
            },
        });
    });
});
