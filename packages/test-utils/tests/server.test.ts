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
});
