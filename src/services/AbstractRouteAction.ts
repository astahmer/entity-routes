import { NextFunction } from "connect";
import { Context, Middleware } from "koa";
import { QueryRunner, getRepository } from "typeorm";

import { GroupsOperation } from "@/mapping/decorators/Groups";
import { EntityRouteService } from "@/services/EntityRoute";
import { CustomActionClass, CustomAction } from "@/services/ResponseManager";

import { isType } from "@/functions/asserts";
import { GenericEntity } from "@/services/EntityRoute";
import { Router } from "@/container";

export type RouteActionConstructorArgs = {
    entityRoute?: EntityRouteService<any>;
    middlewares: Middleware[];
};

export interface IRouteAction {
    onRequest(ctx: Context, next: NextFunction): Promise<any>;
}

export type RouteActionClass = new (routeContext?: RouteActionConstructorArgs, ...args: any) => IRouteAction;

export abstract class AbstractRouteAction<Entity extends GenericEntity = GenericEntity> implements IRouteAction {
    // Detach entityRoute
    protected entityRoute: EntityRouteService<Entity>;
    protected middlewares: Middleware[];

    get routeMetadata() {
        return this.entityRoute.routeMetadata;
    }

    get entityMetadata() {
        return this.entityRoute.repository.metadata;
    }

    constructor(routeContext: RouteActionConstructorArgs) {
        const { entityRoute, middlewares } = routeContext;
        this.entityRoute = entityRoute;
        this.middlewares = middlewares;
    }

    abstract onRequest(ctx: Context, next: NextFunction): Promise<any>;

    protected getQueryRunner(ctx: Context): QueryRunner {
        return ctx.state.queryRunner;
    }

    protected async serializeItem<Entity extends GenericEntity = GenericEntity>(
        entity: Entity,
        operation: GroupsOperation = "details"
    ) {
        const cleaned = this.entityRoute.denormalizer.cleanItem(operation, entity as any);
        const repository = getRepository<Entity>(entity.constructor.name);
        const entityInstance: Entity = repository.manager.create(repository.metadata.targetName, cleaned as any);

        return this.entityRoute.normalizer.recursiveFormatItem(entityInstance, operation);
    }

    protected throw(ctx: Context, message: string) {
        ctx.body = { error: message };
        ctx.status = 400;
    }
}

export function makeRouterFromCustomActions(actions: CustomAction[]) {
    const router = new Router();
    actions.forEach((actionItem) => {
        const { verb, path, middlewares } = actionItem;
        let customActionMw;

        if (isType<CustomActionClass>(actionItem, "class" in actionItem)) {
            const { action, class: actionClass, middlewares } = actionItem;
            const instance = new actionClass({ middlewares });
            const method = (action as keyof IRouteAction) || "onRequest";

            customActionMw = instance[method].bind(instance);
        } else {
            customActionMw = actionItem.handler;
        }

        router[verb](path, ...(middlewares || []), customActionMw);
    });

    return router;
}
