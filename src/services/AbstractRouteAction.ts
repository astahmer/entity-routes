import { NextFunction } from "connect";
import { Context, Middleware } from "koa";
import { QueryRunner, getRepository, EntityMetadata } from "typeorm";
import Container from "typedi";

import { GroupsOperation } from "@/decorators/Groups";
import { RouteMetadata } from "@/services/EntityRouter";
import { CustomActionClass, CustomAction } from "@/services/ResponseManager";

import { isType } from "@/functions/asserts";
import { GenericEntity } from "@/services/EntityRouter";
import { Router } from "@/container";
import { MappingManager } from "./MappingManager";
import { Cleaner } from "@/serializer/Cleaner";
import { Formater } from "@/serializer/Formater";

export type RouteActionConstructorArgs = {
    middlewares: Middleware[];
    routeMetadata: RouteMetadata;
    entityMetadata: EntityMetadata;
};

export interface IRouteAction {
    onRequest(ctx: Context, next: NextFunction): Promise<any>;
}

export type RouteActionClass = new (args?: RouteActionConstructorArgs, ...data: any) => IRouteAction;

export abstract class AbstractRouteAction implements IRouteAction {
    protected middlewares: Middleware[];
    protected routeMetadata: RouteMetadata;
    protected entityMetadata: EntityMetadata;

    get formater() {
        return Container.get(Formater) as Formater;
    }

    get cleaner() {
        return Container.get(Cleaner) as Cleaner;
    }

    get mappingManager() {
        return Container.get(MappingManager);
    }

    constructor(args: RouteActionConstructorArgs) {
        const { middlewares, routeMetadata, entityMetadata } = args;
        this.middlewares = middlewares;
        this.routeMetadata = routeMetadata;
        this.entityMetadata = entityMetadata;
    }

    abstract onRequest(ctx: Context, next: NextFunction): Promise<any>;

    protected getQueryRunner(ctx: Context): QueryRunner {
        return ctx.state.queryRunner;
    }

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

    protected throw(ctx: Context, message: string) {
        ctx.body = { error: message };
        ctx.status = 400;
    }
}

export type CustomActionParams = Pick<RouteActionConstructorArgs, "entityMetadata" | "routeMetadata">;
export function makeRouterFromCustomActions(actions: CustomAction[], routeParams?: CustomActionParams) {
    const router = new Router();
    actions.forEach((actionItem) => {
        const { verb, path, middlewares } = actionItem;
        let customActionMw;

        if (isType<CustomActionClass>(actionItem, "class" in actionItem)) {
            const { action, class: actionClass, middlewares } = actionItem;
            const instance = new actionClass({ middlewares, ...routeParams });
            const method = (action as keyof IRouteAction) || "onRequest";

            customActionMw = instance[method].bind(instance);
        } else {
            customActionMw = actionItem.handler;
        }

        router[verb](path, ...(middlewares || []), customActionMw);
    });

    return router;
}
