import { RouteDefaultOperation, ALL_OPERATIONS, HookSchema, EntityRouteOptions, hookNames, fromEntries } from "@/index";
import { AxiosRequestConfig } from "axios";
import { closeTestConnection } from "@@/tests/testConnection";

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
const defaultOperations = ALL_OPERATIONS.concat("delete") as RouteDefaultOperation[];
const pushTo = fromEntries(defaultOperations.map((ope) => [ope, pushHook(ope)]));

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
