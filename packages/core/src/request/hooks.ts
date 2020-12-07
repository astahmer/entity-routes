import { DeleteResult } from "typeorm";

import { DeepPartial } from "@entity-routes/shared";

import { ReaderOptions } from "../database";
import { RequestContext, RouteControllerResult, RouteResponse, SubresourceRelation } from "../router";
import { GenericEntity } from "../types";
import { CleanerArgs, ContextWithState, EntityErrorResults, RequestContextWithState, ValidateItemOptions } from ".";

export const hookNames = [
    "beforeHandle",
    "afterHandle",
    "beforeRespond",
    "afterRespond",
    "beforeClean",
    "afterClean",
    "beforeValidate",
    "afterValidate",
    "beforePersist",
    "afterPersist",
    "beforeRead",
    "afterRead",
    "beforeRemove",
    "afterRemove",
];
/** Possible hooks are [before/after]Handle/({Clean,Validate,Persist}|Read)/Respond] */
export type HookSchema = Partial<{
    /**
     * Called right after the requestContext has been set by the appropriate middleware &
     * right before the request is handled by the response middleware
     */
    beforeHandle: HookFnOnHandle;
    // Called after the request has been handled
    afterHandle: HookFnOnHandle;

    // Called right before the response status & body are set
    beforeRespond: HookFnOnRespond;
    // Called right after the response status & body are set
    afterRespond: HookFnOnRespond;

    // Called right before cleaning an entity from database
    beforeClean: HookFnBeforeClean;
    // Called right after cleaning an entity from database
    afterClean: HookFnAfterClean;

    // Called right before the validation of the request body
    beforeValidate: HookFnBeforeValidate;
    // Called right after the validation of the request body
    afterValidate: HookFnAfterValidate;

    // Called right before persisting payload from the request body
    beforePersist: HookFnBeforePersist;
    // Called right after persisting payload from the request body
    afterPersist: HookFnAfterPersist;

    // Called right before reading an item or a collection from database
    beforeRead: HookFnBeforeRead;
    // Called right after reading an item or a collection from database
    afterRead: HookFnAfterRead;

    // Called right before removing (or softDelete entity/unlink subresource) an entity from database
    beforeRemove: HookFnBeforeRemove;
    // Called right after removing (or softDelete entity/unlink subresource) an entity from database
    afterRemove: HookFnAfterRemove;
}>;

export type HookReturn = any;
export type HookFn<Args = any> = (args: Args) => HookReturn;

export type HookFnOnHandle = HookFn<ContextWithState>;

export interface WithContextAdapterKey {
    ctx: ContextWithState;
}
export type WithRequestId = Pick<RequestContext, "requestId">;

// Respond
export interface HookFnOnRespondArgs extends WithContextAdapterKey {
    result: RouteControllerResult;
    response: RouteResponse;
}
export type HookFnOnRespond = HookFn<HookFnOnRespondArgs>;

// Clean
export type HookFnBeforeCleanArgs = WithRequestId & { options: CleanerArgs };
export type HookFnBeforeClean = HookFn<HookFnBeforeCleanArgs>;
export type HookFnAfterCleanArgs = HookFnBeforeCleanArgs & { result: DeepPartial<GenericEntity> };
export type HookFnAfterClean = HookFn<HookFnAfterCleanArgs>;

// Validate
export type HookFnOnValidateOptions = ValidateItemOptions & { context: RequestContextWithState };
export type HookFnBeforeValidateArgs = WithRequestId & {
    options: HookFnOnValidateOptions;
    item: DeepPartial<GenericEntity>;
};
export type HookFnBeforeValidate = HookFn<HookFnBeforeValidateArgs>;
export type HookFnAfterValidateArgs = HookFnBeforeValidateArgs & { ref: { errors: EntityErrorResults } };
export type HookFnAfterValidate = HookFn<HookFnAfterValidateArgs>;

// Persist
export type HookFnOnBeforePersistArgs = WithRequestId & { item: GenericEntity };
export type HookFnBeforePersist = HookFn<HookFnOnBeforePersistArgs>;
export type HookFnOnAfterPersistArgs = WithRequestId & { result: GenericEntity };
export type HookFnAfterPersist = HookFn<HookFnOnAfterPersistArgs>;

// Read
export type HookFnOnBeforeReadArgs = WithRequestId & { options: ReaderOptions };
export type HookFnBeforeRead = HookFn<HookFnOnBeforeReadArgs>;
export type HookFnAfterReadResultRef = { ref: { result?: GenericEntity; results?: [GenericEntity[], number] } };
export type HookFnOnAfterReadArgs = WithRequestId & HookFnAfterReadResultRef;
export type HookFnAfterRead = HookFn<HookFnOnAfterReadArgs>;

// Remove
export type HookFnOnBeforeRemoveArgs = WithRequestId &
    Pick<RequestContext, "entityId"> & { subresourceRelation: SubresourceRelation };
export type HookFnBeforeRemove = HookFn<HookFnOnBeforeRemoveArgs>;
export type HookFnOnAfterRemoveArgs = HookFnOnBeforeRemoveArgs & { result: DeleteResult };
export type HookFnAfterRemove = HookFn<HookFnOnAfterRemoveArgs>;
