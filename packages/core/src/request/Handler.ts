import { Repository } from "typeorm";

import {
    CRUD_ACTIONS,
    EntityRouteOptions,
    GenericEntity,
    GroupsOperation,
    ListDetailsOptions,
    MiddlewareMaker,
    RouteController,
} from "@entity-routes/core";

import { ContextWithState } from "./store";

/** Handle request and return the appropriate RouteController[method] result  */
export class Handler<Entity extends GenericEntity> {
    get metadata() {
        return this.repository.metadata;
    }

    private controller: RouteController<Entity>;

    constructor(private repository: Repository<Entity>, private options: MiddlewareMaker<Entity>["options"] = {}) {
        this.controller = new RouteController(repository, options);
    }

    async getResult(ctx: ContextWithState, innerOptions?: EntityRouteOptions) {
        const { requestContext = {} } = ctx.state;
        const operation = requestContext.operation;

        const options = innerOptions || this.options;
        const ctrlOptions = this.getControllerInnerOptions(operation, options);

        return this.controller[CRUD_ACTIONS[operation].method](requestContext, ctrlOptions as any);
    }

    private getControllerInnerOptions(operation: string, options: EntityRouteOptions) {
        // Override controller inner options with scoped options
        return isPersist(operation)
            ? options.defaultCreateUpdateOptions
            : isRead(operation)
            ? ({ ...options.defaultListDetailsOptions, ...options.defaultMaxDepthOptions } as ListDetailsOptions)
            : undefined;
    }
}

const isPersist = (operation: GroupsOperation) => persistOperations.includes(operation);
const persistOperations = ["create", "update"];

const isRead = (operation: GroupsOperation) => readOperations.includes(operation);
const readOperations = ["list", "details"];
