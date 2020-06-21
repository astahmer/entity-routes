import { AxiosInstance, AxiosRequestConfig } from "axios";

export type TestRequestConfig = AxiosRequestConfig & { it: string; result?: any };
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
        data: { name: "Alex" },
        result: {
            "@context": { operation: "create", entity: "user", errors: null },
            articles: "/api/user/1/articles",
            id: 1,
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
            items: [{ articles: "/api/user/1/articles", id: 1, name: "Alex" }],
        },
    },
    {
        it: "should lists user articles",
        url: "/user/1/articles",
        method: "get",
        result: {
            "@context": {
                entity: "article",
                operation: "list",
                retrievedItems: 0,
                totalItems: 0,
            },
            items: [],
        },
    },
    {
        it: "should lists comments of user articles",
        url: "/user/1/articles/comments",
        method: "get",
        result: {
            "@context": {
                entity: "comment",
                operation: "list",
                retrievedItems: 0,
                totalItems: 0,
            },
            items: [],
        },
    },
];
