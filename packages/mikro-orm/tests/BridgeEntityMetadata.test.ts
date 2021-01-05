import { AddressInfo, Server } from "net";

import axios, { AxiosInstance } from "axios";

import { OrmProvider } from "@entity-routes/core/src";
import { pick } from "@entity-routes/shared";
import {
    TestRequestConfig,
    makeTestFn,
    resetHooksCalled,
    testHooksConfigs,
    testRoute,
    testRouteConfigs,
} from "@entity-routes/test-sample";
import { makeTestEntityRouters } from "@entity-routes/test-utils";

import { BridgeRelationMetadata, MikroOrmProvider } from "../src";
import { closeTestConnection, createTestConnection } from "./connection";
import { getTestEntities } from "./entities";
import { setupTestApp } from "./setup";

const printInverseRelation = (rel: BridgeRelationMetadata) =>
    rel.instance.mappedBy || rel.instance.inversedBy
        ? rel.instance.name + "." + rel.inverseRelation.propertyName
        : "none";

it.skip("does things", async () => {
    const orm = await createTestConnection();
    const provider = new MikroOrmProvider(orm);

    const all = provider.orm.getMetadata().getAll();
    const repos = Object.entries(all)
        .map(([_name, meta]) => !meta.abstract && !meta.pivotTable && provider.getRepository(meta.class))
        .filter(Boolean);
    const inverseRelations = repos.map((repo) => [
        repo.metadata.tableName,
        repo.metadata.name,
        repo.metadata.relations.map(printInverseRelation),
    ]);
    console.log(inverseRelations);
    return closeTestConnection();
});

// it("make routers i guess ?", async () => {
//     // makeEntityRouters
//     // const { orm, em } = await createTestConnection();
//     // const ormProvider = new MikroOrmProvider(orm);
//     const entities = getEntities();
//     // const routers = await makeTestEntityRouters({ ormProvider, entities });
//     const {} = await setupTestApp(entities)
//     console.log(routers);
// });

// const entities = getEntities();
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

    it.skip("sucks", () => {
        const provider = ormProvider as MikroOrmProvider;
        const all = provider.orm.getMetadata().getAll();
        const repos = Object.entries(all)
            .map(([_name, meta]) => !meta.abstract && !meta.pivotTable && provider.getRepository(meta.class))
            .filter(Boolean);
        const inverseRelations = repos.map((repo) => [
            repo.metadata.tableName,
            repo.metadata.name,
            repo.metadata.relations.map(printInverseRelation),
        ]);
        console.log(inverseRelations);
    });

    const makeTest = (config: TestRequestConfig) =>
        (config.only ? it.only : config.skip ? it.skip : it)(config.it, () => testRoute(client, config));
    testRouteConfigs.forEach(makeTest);
});

describe("invokes hooks in the right order", () => {
    // beforeEach(resetHooksCalled);
    // afterEach(closeTestConnection);

    // const makeTest = makeTestFn(setupTestApp, entities);

    // testHooksConfigs.forEach((config) =>
    //     (config.only ? it.only : config.skip ? it.skip : it)(
    //         `should list all <${config.operation}> hooks ${config.itSuffix || ""}`,
    //         () => makeTest(config)
    //     )
    // );

    it("abc", async () => {
        console.log("ouiaaaz");
        // mauvaise url axios client ? base  url+config.url
        for (const config of testHooksConfigs) {
            resetHooksCalled();
            const { server, client } = await setupTestApp(entities, { ...config.routeOptions });
            console.log("oui");
            // try {
            //     if (config.dependsOn) {
            //         await client.request(config.dependsOn);
            //         resetHooksCalled();
            //     }

            //     await client.request(config);
            //     console.log("yes");
            // } catch (error) {
            //     throw error;
            // } finally {
            //     server.close();
            //     await closeTestConnection();
            // }
            // await setupTestApp(entities);
            // await makeTest(config);
            // await closeTestConnection();
        }
        // done();
    });
});
