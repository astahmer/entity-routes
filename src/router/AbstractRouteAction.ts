import { NextFunction } from "connect";
import { getRepository, EntityMetadata } from "typeorm";
import { Container } from "typedi";

import { GroupsOperation, RouteOperation } from "@/decorators/Groups";
import { RouteMetadata, EntityRouterOptions } from "@/router/EntityRouter";

import { GenericEntity } from "@/router/EntityRouter";
import { MappingManager } from "../mapping/MappingManager";
import { Cleaner } from "@/serializer/Cleaner";
import { Formater } from "@/serializer/Formater";
import { BridgeRouter } from "@/bridges/routers/BridgeRouter";
import { Context } from "@/utils-types";
import { Middleware } from "koa"; // TODO use Middleware from/util-types = wrap ctx since ctx.params/body.state do not exist for Express
import { CrudAction } from "@/router/RouteManager";

export abstract class AbstractRouteAction implements IRouteAction {
    protected middlewares: Middleware[];
    protected routeMetadata: RouteMetadata;
    protected entityMetadata: EntityMetadata;

    get formater() {
        return Container.get(Formater);
    }

    get cleaner() {
        return Container.get(Cleaner);
    }

    get mappingManager() {
        return Container.get(MappingManager);
    }

    constructor(args: RouteActionConstructorArgs & RouteActionConstructorData) {
        const { middlewares, routeMetadata, entityMetadata } = args;
        this.middlewares = middlewares;
        this.routeMetadata = routeMetadata;
        this.entityMetadata = entityMetadata;
    }

    abstract onRequest(ctx: Context, next: NextFunction): Promise<any>;

    protected async serializeItem<Entity extends GenericEntity = GenericEntity>(
        entity: Entity,
        operation: GroupsOperation = "details"
    ) {
        const cleaned = this.cleaner.cleanItem({
            rootMetadata: this.entityMetadata,
            operation,
            values: entity as any,
            options: this.routeMetadata.options,
        });
        const repository = getRepository<Entity>(entity.constructor.name);
        const entityInstance: Entity = repository.manager.create(repository.metadata.targetName, cleaned as any);

        return this.formater.formatItem({
            item: entityInstance,
            operation,
            entityMetadata: this.entityMetadata,
            options: this.routeMetadata.options,
        });
    }
}

export type RouteActionConstructorArgs = { middlewares: Middleware[] };
export type RouteActionConstructorData = { routeMetadata: RouteMetadata; entityMetadata: EntityMetadata };

export interface IRouteAction {
    onRequest(ctx: Context, next?: NextFunction): any;
}

export type RouteActionClass<T extends object = object> = new (
    args?: RouteActionConstructorArgs,
    data?: T
) => IRouteAction;

// TODO Rename to RouteAction instead of CustomAction
export type CustomActionRouterConfigNew<T = any> = Pick<EntityRouterOptions<T>, "routerClass" | "routerRegisterFn">;
export type CustomActionRouterConfigWithInstance<T = any> = {
    /** Existing router to pass on which custom actions routes will be registered */
    router: BridgeRouter<T>;
};
export type CustomActionRouterConfig<T = any> =
    | CustomActionRouterConfigWithInstance<T>
    | CustomActionRouterConfigNew<T>;
export type CustomActionOptions<T extends object = object> = {
    /** Args to pass to CustomActionClass on creating a new instance */
    args?: T;
};

export type BaseCustomAction = Omit<CrudAction, "method"> & {
    /** Custom operation for that action */
    operation?: RouteOperation;
    /** List of middlewares to be called (in the same order as defined here) */
    middlewares?: Middleware[];
};

export type CustomActionClass = BaseCustomAction & {
    /** Class that implements IRouteAction, onRequest method will be called by default unless a method key is provided */
    class?: RouteActionClass;
    /** Method name of RouteAction class to call for this verb+path, mostly useful to re-use the same class for multiple actions */
    method?: string;
};

export type CustomActionFunction = BaseCustomAction & {
    /** Route handler (actually is a middleware) */
    handler?: Function;
};

export type CustomAction = CustomActionClass | CustomActionFunction;
