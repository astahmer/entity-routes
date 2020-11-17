import { Subresource, getRouteSubresourcesMetadata } from "@/index";

describe("@Subresource", () => {
    class Article {
        title: string;
    }

    class Comment {
        message: string;
    }

    class User {
        id: number;
        name: string;

        @Subresource(() => Article)
        articles: Article[];

        @Subresource(() => Comment, { path: "messages", operations: ["create", "list"], maxDepth: 1 })
        comments: Comment[];

        @Subresource(() => User)
        managers: User[];
    }

    it("can retrieve metadata with getRouteSubresourcesMetadata", () => {
        const metadata = getRouteSubresourcesMetadata(User);
        expect(metadata.parent).toBe(User);
        expect(metadata.properties).toEqual({
            // Default options
            articles: {
                path: "articles",
                operations: ["create", "list", "details", "delete"],
                entityTarget: Article,
                maxDepth: undefined,
                canBeNested: true,
                canHaveNested: true,
            },
            // Custom options
            comments: {
                path: "messages",
                operations: ["create", "list"],
                entityTarget: Comment,
                maxDepth: 1,
                canBeNested: true,
                canHaveNested: true,
            },
            // Custom options
            managers: {
                path: "managers",
                operations: ["create", "list", "details", "delete"],
                entityTarget: User,
                maxDepth: undefined,
                canBeNested: true,
                canHaveNested: true,
            },
        });
    });
});
