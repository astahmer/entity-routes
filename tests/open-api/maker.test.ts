import { Server } from "net";
import { makeOpenApiBuilderFrom, makeOpenApi } from "@/open-api";
import { setupKoaApp } from "@@/tests/router/bridge/koaSetup";
import { closeTestConnection } from "@@/tests/testConnection";

import { promises as fs } from "fs";
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
        const path = require("path");
        const root = process.cwd();
        const filePath = path.join(root, "openApi.yaml");

        const openApi = makeOpenApi();
        const builder = makeOpenApiBuilderFrom(openApi);
        const spec = builder.getSpecAsYaml();
        await fs.writeFile(filePath, spec);
    });
});
