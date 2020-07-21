import { AxiosInstance, AxiosRequestConfig } from "axios";

export type TestRequestConfig = AxiosRequestConfig & { it: string; result?: any; only?: boolean; skip?: boolean };
export async function testRoute(client: AxiosInstance, config: TestRequestConfig) {
    const result = await client.request(config);
    expect(result.data).toEqualMessy(config.result);
}

export const testRouteConfigs: TestRequestConfig[] = [
    {
        it: "should retrieve user create mapping",
        url: "/user/mapping",
        method: "post",
        result: {
            context: { operation: "create.mapping", entity: "user" },
            routeMapping: {
                selectProps: ["name", "id"],
                relationProps: [],
                exposedProps: ["name", "id"],
                mapping: {},
            },
        },
    },
    {
        it: "should create new user",
        url: "/user",
        method: "post",
        data: { id: 123, name: "Alex" },
        result: {
            "@context": { operation: "create", entity: "user", validationErrors: null },
            articles: "/api/user/123/articles",
            mainRole: "/api/user/123/mainRole",
            id: 123,
            name: "Alex",
        },
    },
    {
        it: "should retrieve user list mapping",
        url: "/user/mapping",
        method: "get",
        result: {
            context: { operation: "list.mapping", entity: "user" },
            routeMapping: {
                selectProps: ["name", "id"],
                relationProps: [],
                exposedProps: ["name", "id"],
                mapping: {},
            },
        },
    },
    {
        it: "should lists users",
        url: "/user",
        method: "get",
        result: {
            "@context": {
                operation: "list",
                entity: "user",
                retrievedItems: 1,
                totalItems: 1,
            },
            items: [{ articles: "/api/user/123/articles", mainRole: "/api/user/123/mainRole", id: 123, name: "Alex" }],
        },
    },
    {
        it: "should create a new article for user 123",
        url: "/user/123/articles",
        method: "post",
        data: { id: 111, title: "First article" },
        result: {
            "@context": { operation: "create", entity: "article", validationErrors: null },
            id: 111,
            author: "/api/article/111/author",
            comments: "/api/article/111/comments",
        },
    },
    {
        it: "should lists user 123 articles",
        url: "/user/123/articles",
        method: "get",
        result: {
            "@context": {
                entity: "article",
                operation: "list",
                retrievedItems: 1,
                totalItems: 1,
            },
            items: ["/api/article/111"],
        },
    },
    {
        it: "should create a new comment for article 111",
        url: "/article/111/comments",
        method: "post",
        data: { id: 222, message: "First comment" },
        result: {
            "@context": { operation: "create", entity: "comment", validationErrors: null },
            id: 222,
            upvotes: "/api/comment/222/upvotes",
        },
    },
    {
        it: "should lists comments of user articles",
        url: "/user/123/articles/comments",
        method: "get",
        result: {
            "@context": {
                entity: "comment",
                operation: "list",
                retrievedItems: 1,
                totalItems: 1,
            },
            items: ["/api/comment/222"],
        },
    },
    {
        it: "should create a new upvote for comment 222",
        url: "/comment/222/upvotes",
        method: "post",
        data: { id: 333 },
        result: {
            "@context": { operation: "create", entity: "upvote", validationErrors: null },
            id: 333,
        },
    },
    {
        it: "should lists upvotes of user comments",
        url: "/user/123/articles/comments/upvotes",
        method: "get",
        result: {
            "@context": {
                entity: "upvote",
                operation: "list",
                retrievedItems: 1,
                totalItems: 1,
            },
            items: ["/api/upvote/333"],
        },
    },
    {
        it: "should create new mainRole for user 123",
        url: "/user/123/mainRole",
        method: "post",
        data: { id: 456, label: "Admin" },
        result: {
            "@context": { operation: "create", entity: "role", validationErrors: null },
            id: 456,
            label: "Admin",
            logo: "/api/role/456/logo",
        },
    },
    {
        it: "should retrieve mainRole of user 123",
        url: "/user/123/mainRole",
        method: "get",
        result: {
            "@context": { operation: "details", entity: "role" },
            id: 456,
            label: "Admin",
            logo: "/api/role/456/logo",
        },
    },
    {
        it: "should create new logo for role 456",
        url: "/role/456/logo",
        method: "post",
        data: { id: 789, url: "http://abc.def/image.jpg" },
        result: {
            "@context": { operation: "create", entity: "image", validationErrors: null },
            id: 789,
            upvotes: "/api/image/789/upvotes",
            url: "http://abc.def/image.jpg",
        },
    },
    {
        it: "should retrieve logo of mainRole of user 123",
        url: "/user/123/mainRole/logo",
        method: "get",
        result: {
            "@context": { operation: "details", entity: "image" },
            id: 789,
            upvotes: "/api/image/789/upvotes",
            url: "http://abc.def/image.jpg",
        },
    },
    {
        it: "should create a new upvote for image 789",
        url: "/image/789/upvotes",
        method: "post",
        data: { id: 444 },
        result: {
            "@context": { operation: "create", entity: "upvote", validationErrors: null },
            id: 444,
        },
    },
    {
        it: "should list upvotes of user's role.image",
        url: "/user/123/mainRole/logo/upvotes",
        method: "get",
        result: {
            "@context": {
                entity: "upvote",
                operation: "list",
                retrievedItems: 1,
                totalItems: 1,
            },
            items: ["/api/upvote/444"],
        },
    },
];
