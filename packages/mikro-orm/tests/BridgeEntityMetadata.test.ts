import { Server } from "net";

import { AxiosInstance } from "axios";

import { OrmProvider } from "@entity-routes/core/src";
import {
    TestRequestConfig,
    makeTestFn,
    resetHooksCalled,
    testHooksConfigs,
    testRoute,
    testRouteConfigs,
} from "@entity-routes/test-sample";

import { BridgeRelationMetadata } from "../src";
import { closeTestConnection } from "./connection";
import { getTestEntities } from "./entities";
import { setupTestApp } from "./setup";

const entities = getTestEntities();

describe("integrates properly with entity-routes", () => {
    let server: Server, client: AxiosInstance, ormProvider: OrmProvider;
    beforeAll(async () => {
        const result = await setupTestApp(entities);
        server = result.server;
        client = result.client;
        ormProvider = result.ormProvider;
    });
    afterAll(() => {
        server.close();
        return closeTestConnection();
    });

    const makeTest = (config: TestRequestConfig) =>
        (config.only ? it.only : config.skip ? it.skip : it)(config.it, () => testRoute(client, config));
    testRouteConfigs.forEach(makeTest);
});

describe("invokes hooks in the right order", () => {
    beforeEach(resetHooksCalled);

    const makeTest = makeTestFn(setupTestApp, entities);
    return;

    testHooksConfigs.forEach((config) =>
        (config.only ? it.only : config.skip ? it.skip : it)(
            `should list all <${config.operation}> hooks ${config.itSuffix || ""}`,
            () => makeTest(config)
        )
    );
});
