import { AxiosRequestConfig } from "axios";

import { CRUD_OPERATIONS, EntityRouteOptions, HookSchema, RouteDefaultOperation, hookNames } from "@entity-routes/core";
import { fromEntries } from "@entity-routes/shared";
import { closeTestConnection } from "@entity-routes/test-utils";

// An object of hooks name called for each operation
type HooksCalled = Record<RouteDefaultOperation, string[]>;
let hooksCalled: HooksCalled;
const getDefaultHooksCalled = () =>
    ({
        create: [],
        list: [],
        details: [],
        update: [],
        delete: [],
    } as HooksCalled);

export const resetHooksCalled = () => (hooksCalled = getDefaultHooksCalled());

const pushHook = (operation: RouteDefaultOperation) => (name: string) => () => hooksCalled[operation].push(name);
const pushTo = fromEntries(CRUD_OPERATIONS.map((ope) => [ope, pushHook(ope)]));

type TestHookConfigResult = Array<keyof HookSchema>;
export type TestHookConfig = AxiosRequestConfig & {
    operation: RouteDefaultOperation;
    result: TestHookConfigResult;
    dependsOn?: TestHookConfig;
    routeOptions?: EntityRouteOptions;
    itSuffix?: string;
    only?: boolean;
    skip?: boolean;
};

const createWithoutAutoreload: TestHookConfig = {
    itSuffix: "- without AutoReload",
    operation: "create",
    url: "/user",
    method: "post",
    data: { id: 222, name: "Alex" },
    result: [
        "beforeHandle",
        "beforeClean",
        "afterClean",
        "beforeValidate",
        "afterValidate",
        "beforePersist",
        "afterPersist",
        "beforeRespond",
        "afterRespond",
        "afterHandle",
    ],
    routeOptions: { defaultCreateUpdateOptions: { shouldAutoReload: false } },
};

export const testHooksConfigs: TestHookConfig[] = [
    {
        operation: "create",
        url: "/user",
        method: "post",
        data: { id: 111, name: "Alex" },
        result: [
            "beforeHandle",
            "beforeClean",
            "afterClean",
            "beforeValidate",
            "afterValidate",
            "beforePersist",
            "afterPersist",
            "beforeRead",
            "afterRead",
            "beforeRespond",
            "afterRespond",
            "afterHandle",
        ],
    },
    createWithoutAutoreload,
    {
        operation: "list",
        url: "/user",
        method: "get",
        result: ["beforeHandle", "beforeRead", "afterRead", "beforeRespond", "afterRespond", "afterHandle"],
    },
    {
        operation: "details",
        url: `/user/${createWithoutAutoreload.data.id}`,
        method: "get",
        result: ["beforeHandle", "beforeRead", "afterRead", "beforeRespond", "afterRespond", "afterHandle"],
        dependsOn: createWithoutAutoreload,
    },
    {
        operation: "update",
        url: `/user/${createWithoutAutoreload.data.id}`,
        method: "put",
        result: [
            "beforeHandle",
            "beforeClean",
            "afterClean",
            "beforeValidate",
            "afterValidate",
            "beforePersist",
            "afterPersist",
            "beforeRead",
            "afterRead",
            "beforeRespond",
            "afterRespond",
            "afterHandle",
        ],
        dependsOn: createWithoutAutoreload,
    },
    {
        operation: "delete",
        url: `/user/${createWithoutAutoreload.data.id}`,
        method: "delete",
        result: ["beforeHandle", "beforeRemove", "afterRemove", "beforeRespond", "afterRespond", "afterHandle"],
        dependsOn: createWithoutAutoreload,
    },
];

export const makeTestFn = (setupFn: Function, entities: Function[]) => async (config: TestHookConfig) => {
    const hooks = fromEntries(hookNames.map((key) => [key, pushTo[config.operation](key)]));
    const { server, client } = await setupFn(entities, { ...config.routeOptions, hooks });

    try {
        if (config.dependsOn) {
            await client.request(config.dependsOn);
            resetHooksCalled();
        }

        await client.request(config);
        expect(hooksCalled[config.operation]).toEqual(config.result);
    } catch (error) {
        throw error;
    } finally {
        server.close();
        closeTestConnection();
    }
};
