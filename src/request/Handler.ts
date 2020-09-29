import { ReaderOptions } from "@/database";
import { GroupsOperation } from "@/decorators";
import { deepMerge } from "@/functions/object";
import { CRUD_ACTIONS, GenericEntity, MiddlewareMaker, RouteController } from "@/router";
import { Repository } from "typeorm";
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

    async getResult(ctx: ContextWithState) {
        const { requestContext = {} } = ctx.state;
        const operation = requestContext.operation;

        // Override controller inner options with scoped options
        const scopedOptions = this.options.scopedOptions?.(operation);
        const options = deepMerge({}, this.options || {}, scopedOptions || {});

        const innerOptions = isPersist(operation)
            ? options.defaultCreateUpdateOptions
            : isRead(operation)
            ? ({
                  shouldMaxDepthReturnRelationPropsId:
                      options.defaultMaxDepthOptions?.shouldMaxDepthReturnRelationPropsId,
                  ...options.defaultListDetailsOptions,
              } as ReaderOptions)
            : undefined;

        return this.controller[CRUD_ACTIONS[operation].method](requestContext, innerOptions as any);
    }
}

const isPersist = (operation: GroupsOperation) => persistOperations.includes(operation);
const persistOperations = ["create", "update"];

const isRead = (operation: GroupsOperation) => readOperations.includes(operation);
const readOperations = ["list", "details"];
