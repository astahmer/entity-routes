import {
    AbstractFilter,
    AbstractFilterApplyArgs,
    FilterDefaultConfig,
    getRouteFiltersMeta,
    registerFilterDecorator,
} from "@/index";

describe("registerFilterDecorator", () => {
    it("can register filter decorator & retrieve metadata with getRouteFiltersMeta", () => {
        class AbstractEntity {
            id: number;
        }

        class Role extends AbstractEntity {
            identifier: string;
        }

        class User extends AbstractEntity {
            firstName: string;
            role: Role;
        }

        class TestFilter extends AbstractFilter {
            apply(_args: AbstractFilterApplyArgs) {
                return;
            }
        }

        const defaultConfig: FilterDefaultConfig = { class: TestFilter, options: { all: false, allNested: false } };

        registerFilterDecorator({
            target: User,
            defaultConfig,
            options: {},
            properties: ["firstName", "role.id", "role.identifier"],
        });

        const metadata = getRouteFiltersMeta(User);
        expect(metadata).toEqual({
            TestFilter: {
                class: TestFilter,
                options: { all: false, allNested: false },
                properties: ["firstName", "role.id", "role.identifier"],
            },
        });
    });
});
