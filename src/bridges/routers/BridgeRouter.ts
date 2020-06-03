import { IncomingMessage, ServerResponse } from "http";
import { CustomActionRouterConfig, IRouteAction, CustomAction, CustomActionClass } from "@/router/AbstractRouteAction";
import { formatRouteName } from "@/functions/route";
import { isType } from "@/functions/asserts";

export class BridgeRouter<T = any> {
    readonly instance: T;
    readonly routes: BridgeRouterRoute[] = [];

    constructor(
        public readonly routerClass: BridgeRouterClassReference<T>,
        private readonly registerFn: BridgeRouterRegisterFn<T>
    ) {
        this.instance = new routerClass();
    }

    /** Create and register a route. */
    register(route: BridgeRouterRoute) {
        this.routes.push(route);
        this.registerFn(this.instance, route);
    }
}

export type BridgeRouterContext = { req: IncomingMessage; res: ServerResponse };
export type BridgeRouterMiddleware = (ctx: BridgeRouterContext, next: () => Promise<any>) => any;
export type BridgeRouterRoute = {
    name?: string;
    path: string;
    methods: string[];
    middlewares: BridgeRouterMiddleware[];
};
export type BridgeRouterClassReference<T = any> = new (...args: any) => T;
export type BridgeRouterRegisterFn<T = any> = (instance: T, route: BridgeRouterRoute) => any;

export function makeRouterFromActions<Data extends object = object, RouterClass = any>(
    actions: CustomAction[],
    config: CustomActionRouterConfig<RouterClass>,
    data?: Data
) {
    const router = "router" in config ? config.router : new BridgeRouter(config.routerClass, config.routerRegisterFn);
    actions.forEach((item) => {
        const { verb, path, middlewares, operation } = item;
        const name = formatRouteName(path, operation);
        let customActionMw;

        if (isType<CustomActionClass>(item, "class" in item)) {
            const { method, class: actionClass, middlewares } = item;
            const instance = new actionClass({ middlewares, ...data });
            const methodProp = (method as keyof IRouteAction) || "onRequest";

            customActionMw = instance[methodProp].bind(instance);
        } else {
            customActionMw = item.handler;
        }

        router.register({ path, name, methods: [verb], middlewares: [...(middlewares || []), customActionMw] });
    });

    return router;
}
