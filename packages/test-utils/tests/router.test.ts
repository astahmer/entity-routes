import { TestMiddleware, createTestRouter, createTestServer } from "../src";
import { getClient, mwRespondWith } from "./utils";

const mwOK = mwRespondWith("OK");

describe("router", () => {
    it("should be able to register routes", async () => {
        const router = createTestRouter();

        router.register({ path: "/abc", method: "GET", middlewares: [mwOK] });
        router.register({ path: "/abc/123", method: "POST", middlewares: [mwOK] });
        router.register({ path: "/abc/123/456", method: "GET", middlewares: [mwOK] });

        const routes = router.getAll();
        expect(routes.map((config) => config.path)).toEqualMessy(["/abc", "/abc/123", "/abc/123/456"]);
        expect(routes.map((config) => config.method)).toEqualMessy(["GET", "POST", "GET"]);
    });

    it("should match exact route", async () => {
        const app = createTestServer();
        const router = createTestRouter();

        router.register({ path: "/abc/123/456", method: "GET", middlewares: [mwOK] });
        app.use(router.make());

        const result = await getClient(app).request({ url: "/abc/123/456", method: "GET" });

        expect(result.data).toEqual("OK");
    });

    it("should match & then pass to the next middleware", async () => {
        const app = createTestServer();
        const router = createTestRouter();

        router.register({ path: "/abc/123/456", method: "GET", middlewares: [mwOK] });
        app.use(router.make());
        app.use((ctx) => (ctx.responseBody = "NEXT"));

        const result = await getClient(app).request({ url: "/abc/123/456", method: "GET" });

        expect(result.data).toEqual("NEXT");
    });

    it("should go to the next middleware if called explicitly", async () => {
        const app = createTestServer();
        const router = createTestRouter();

        router.register({ path: "/abc/123/456", method: "GET", middlewares: [mwOK] });
        app.use(router.make());
        app.use((ctx, next) => {
            ctx.responseBody = "NEXT";
            next();
        });
        app.use((ctx) => (ctx.responseBody = "FURTHER"));

        const result = await getClient(app).request({ url: "/abc/123/456", method: "GET" });

        expect(result.data).toEqual("FURTHER");
    });

    it("should be able to make a composed router middleware", async () => {
        const router = createTestRouter();

        router.register({ path: "/abc", method: "GET", middlewares: [mwRespondWith("OK1")] });
        router.register({ path: "/abc/123", method: "POST", middlewares: [mwRespondWith("OK2")] });
        router.register({ path: "/abc/123/456", method: "GET", middlewares: [mwRespondWith("OK3")] });

        const routes = router.make();
        const app = createTestServer();
        app.use(routes);

        const client = getClient(app);
        const results = await Promise.all([
            client.request({ url: "/abc", method: "GET" }),
            client.request({ url: "/abc/123", method: "POST" }),
            client.request({ url: "/abc/123/456", method: "GET" }),
        ]);

        expect(results.map((item) => item.data)).toEqual(["OK1", "OK2", "OK3"]);
    });

    it("should retrieve route params", async () => {
        const app = createTestServer();
        const router = createTestRouter();

        const mwRespondWithRouteParams: TestMiddleware = (ctx) => (ctx.responseBody = ctx.params);

        router.register({ path: "/albums/:albumId/:songId", method: "GET", middlewares: [mwRespondWithRouteParams] });
        router.register({ path: "/albums", method: "GET", middlewares: [mwRespondWithRouteParams] });
        router.register({ path: "/albums/:albumId", method: "POST", middlewares: [mwRespondWithRouteParams] });

        app.use(router.make());

        const client = getClient(app);
        const results = await Promise.all([
            client.request({ url: "/albums/321/456", method: "GET" }),
            client.request({ url: "/albums", method: "GET" }),
            client.request({ url: "/albums/123", method: "POST" }),
        ]);

        expect(results.map((item) => item.data)).toEqual([{ albumId: "321", songId: "456" }, {}, { albumId: "123" }]);
    });

    it("should retrieve query params", async () => {
        const app = createTestServer();
        const router = createTestRouter();

        router.register({ path: "/abc", method: "GET", middlewares: [(ctx) => (ctx.responseBody = ctx.queryParams)] });
        app.use(router.make());

        const result = await getClient(app).request({
            url: "/abc?first=111&second=222&multiple[]=123&multiple[]=456",
            method: "GET",
        });
        expect(result.data).toEqual({ first: "111", multiple: ["123", "456"], second: "222" });
    });

    it("should match the right pattern from path", async () => {
        const app = createTestServer();
        const router = createTestRouter();

        router.register({ path: "/albums", method: "GET", middlewares: [mwRespondWith("OK1")] });
        router.register({ path: "/albums/:albumId", method: "POST", middlewares: [mwRespondWith("OK2")] });
        router.register({ path: "/albums/:albumId/:songId", method: "GET", middlewares: [mwRespondWith("OK3")] });
        app.use(router.make());

        const client = getClient(app);
        const results = await Promise.all([
            client.request({ url: "/albums", method: "GET" }),
            client.request({ url: "/albums/123", method: "POST" }),
            client.request({ url: "/albums/123/456", method: "GET" }),
        ]);

        expect(results.map((item) => item.data)).toEqual(["OK1", "OK2", "OK3"]);
    });

    it("should be able to share state using ctx", async () => {
        const app = createTestServer();
        const router = createTestRouter();

        let data;
        app.use((ctx, next) => {
            ctx.state.data = "777";
            next();
        });
        router.register({ path: "/abc/123/456", method: "GET", middlewares: [mwOK] });
        app.use(router.make());
        app.use((ctx, next) => {
            data = ctx.state.data;
            next();
        });

        const result = await getClient(app).request({ url: "/abc/123/456", method: "GET" });

        expect(result.data).toEqual("OK");
        expect(data).toEqual("777");
    });
});
