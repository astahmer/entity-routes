import { EntityRoute, getRouteMetadata } from "@/index";

describe("@EntityRoute", () => {
    it("can retrieve metadata with getRouteMetadata", () => {
        @EntityRoute()
        class User {
            id: number;
        }

        const metadata = getRouteMetadata(User);
        expect(metadata).toEqual({
            path: User.constructor.name,
            operations: [],
            options: {},
        });
    });

    it("can provide a custom route path & operations", () => {
        @EntityRoute({ path: "/users", operations: ["create", "list"] })
        class User {
            id: number;
        }

        const metadata = getRouteMetadata(User);
        expect(metadata).toEqual({
            path: "/users",
            operations: ["create", "list"],
            options: {},
        });
    });

    it("can provide options", () => {
        @EntityRoute(
            { operations: ["create", "list"] },
            { defaultMaxDepthLvl: 3, shouldMaxDepthReturnRelationPropsId: false }
        )
        class User {
            id: number;
        }

        const metadata = getRouteMetadata(User);
        expect(metadata).toEqual({
            path: User.constructor.name,
            operations: ["create", "list"],
            options: { defaultMaxDepthLvl: 3, shouldMaxDepthReturnRelationPropsId: false },
        });
    });
});
