import { MaxDepth, getMaxDepthMetadata } from "@entity-routes/core";

describe("@MaxDepth", () => {
    @MaxDepth()
    class Comment {
        message: string;
        comments: Comment[];
    }

    class User {
        id: number;
        name: string;
        comments: Comment[];

        @MaxDepth(3)
        manager: User;
    }

    it("can retrieve metadata with getMaxDepthMetadata", () => {
        expect(getMaxDepthMetadata(User)).toEqual({ enabled: false, fields: { manager: 3 } });
        expect(getMaxDepthMetadata(Comment)).toEqual({ enabled: true, depthLvl: 2, fields: {} });
    });
});
