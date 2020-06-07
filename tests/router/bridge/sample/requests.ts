import { AxiosInstance } from "axios";

export async function testRestRoutes(request: AxiosInstance) {
    expect((await request.post("/user/mapping")).data).toEqual({
        context: { operation: "create.mapping", entity: "user" },
        routeMapping: {
            selectProps: ["name"],
            relationProps: [],
            exposedProps: ["name"],
            mapping: {},
        },
    });

    expect((await request.post("/user", { name: "Alex" })).data).toEqual({
        "@context": { operation: "create", entity: "user", errors: null },
        name: "Alex",
    });

    expect((await request.get("/user/mapping")).data).toEqual({
        context: { operation: "list.mapping", entity: "user" },
        routeMapping: {
            selectProps: ["name"],
            relationProps: [],
            exposedProps: ["name"],
            mapping: {},
        },
    });

    expect((await request.get("/user")).data).toEqual({
        "@context": {
            operation: "list",
            entity: "user",
            retrievedItems: 1,
            totalItems: 1,
        },
        items: [{ name: "Alex" }],
    });
}
