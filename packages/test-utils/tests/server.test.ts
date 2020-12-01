import { createTestServer } from "../src";
import { getClient } from "./utils";

describe("server", () => {
    it("should defaults to returning 404", async () => {
        const app = createTestServer();
        expect(() => getClient(app).request({ url: "/", method: "GET" })).rejects.toThrow();
    });

    it("should be able to listen for requests", async () => {
        const app = createTestServer();
        app.use(async ({ res }) => {
            res.statusCode = 200;
        });

        const result = await getClient(app).request({ url: "/", method: "GET" });
        expect(result.status).toEqual(200);
    });

    it("should set status to 200 when responseBody is set", async () => {
        const app = createTestServer();
        app.use(async (ctx) => {
            ctx.responseBody = "OK";
        });

        const result = await getClient(app).request({ url: "/", method: "GET" });
        expect(result.status).toEqual(200);
    });

    it("should NOT set status to 200 when responseBody is set & a status was already set", async () => {
        const app = createTestServer();
        app.use(async (ctx) => {
            ctx.res.statusCode = 201;
            ctx.responseBody = "Created";
        });

        const result = await getClient(app).request({ url: "/", method: "GET" });
        expect(result.status).toEqual(201);
    });

    it("should be able to retrieve JSON body from request", async () => {
        const app = createTestServer();
        const data = { abc: 123 };
        app.use(async (ctx) => {
            ctx.responseBody = ctx.requestBody;
        });

        const result = await getClient(app).request({ url: "/", method: "POST", data });
        expect(result.data).toEqual(data);
    });

    it("should be able to respond with string when responseBody is string", async () => {
        const app = createTestServer();
        const data = "OK";
        app.use(async (ctx) => {
            ctx.responseBody = data;
        });

        const result = await getClient(app).request({ url: "/", method: "GET" });
        expect(result.data).toEqual(data);
    });

    it("should be able to respond with JSON when responseBody is an ObjectLiteral", async () => {
        const app = createTestServer();
        const data = { success: true };
        app.use(async (ctx) => {
            ctx.responseBody = data;
        });

        const result = await getClient(app).request({ url: "/", method: "GET" });
        expect(result.data).toEqual(data);
    });
});
