import { EntityRoute, getRouteMetadata } from "@entity-routes/core";

describe("@EntityRoute", () => {
    it("can retrieve metadata with getRouteMetadata", () => {
        @EntityRoute()
        class User {
            id: number;
        }

        const metadata = getRouteMetadata(User);
        expect(metadata).toEqual({
            path: "/" + User.name.toLowerCase(),
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
            { defaultMaxDepthOptions: { defaultMaxDepthLvl: 3, shouldMaxDepthReturnRelationPropsId: false } }
        )
        class User {
            id: number;
        }

        const metadata = getRouteMetadata(User);
        expect(metadata).toEqual({
            path: "/" + User.name.toLowerCase(),
            operations: ["create", "list"],
            options: { defaultMaxDepthOptions: { defaultMaxDepthLvl: 3, shouldMaxDepthReturnRelationPropsId: false } },
        });
    });
});
