import { Server } from "net";

import { makeOpenApi, makeOpenApiBuilderFrom } from "@entity-routes/core";

import { setupKoaApp } from "@/router/bridge/koaSetup";
import { closeTestConnection } from "@/testConnection";

import { getOpenApiTestEntities } from "../mapping/sample/entities";

describe("OpenAPI", () => {
    const entities = getOpenApiTestEntities();
    let server: Server;

    beforeAll(async () => {
        const result = await setupKoaApp(entities);
        server = result.server;
    });
    afterAll(() => {
        server.close();
        return closeTestConnection();
    });

    it("exportRoutesAsOpenApi", async () => {
        const openApi = makeOpenApi();
        const builder = makeOpenApiBuilderFrom(openApi);
        const spec = builder.getSpecAsYaml();
        expect(spec).toMatchSnapshot();
    });
});
