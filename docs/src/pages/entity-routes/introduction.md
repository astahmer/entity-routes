---
title: Introduction
---

## Generic Entity

The only constraint to use @EntityRoute is to have an `id` property always exposed on all your entities used by EntityRoute.

```typescript
interface GenericEntity {
    [k: string]: any;
    id: string | number;
}
```

So a minimal implementation should look at least like this :

```typescript
export class AbstractEntity {
    @Groups("all")
    @PrimaryGeneratedColumn()
    id: number;
}
```

And then you would make all your entities `extends` from this one, [just like any other class inheritance with Typescript](https://www.typescriptlang.org/docs/handbook/classes.html). You can learn more about TypeORM table inheritance [here](https://typeorm.io/#/entity-inheritance).

# EntityRoute Decorator

The only decorator needed to register an **EntityRouter**[TODO docref] is... well, `@EntityRoute`.

> Good to know: The name distinction is to avoid any conflict between the **service** and the **decorator**, such distinctions are also made for the **built-in filters** [TODO docref] such as @Search[TODO docref]/SearchFilter[TODO docref] and @Pagination[TODO docref]/PaginationFilter[TODO docref].
Here is the @EntityRoute signature :

```typescript
function EntityRoute(args: EntityRouteArgs = { operations: [] }, options: EntityRouteConfig = {}): ClassDecorator;
```

## Mapping

### One of the most important & powerful aspects of entity-routes is its mapping.

#### So what is that mapping ?

The Mapping in entity-routes is a description of every properties exposed for a specific route context.

Let's start by defining what we call a "route context". A route context is defined by 2 elements :

-   The route main entity
-   An operation [TODO docref], ex: any of the C|R|U|D

Examples (using routes generated from the [Quick start](../getting-started/quick-start)) :

| Verb   | Path                                  | Entity  | Operation |
| ------ | ------------------------------------- | ------- | --------- |
| POST   | /users                                | User    | create    |
| POST   | /users/mapping                        | User    | create    |
| PUT    | /users/:id(\d+)                       | User    | update    |
| PUT    | /users/:id(\d+)/mapping               | User    | update    |
| GET    | /users/:id(\d+)                       | User    | get       |
| GET    | /users/:id(\d+)/mapping               | User    | get       |
| GET    | /users                                | User    | list      |
| GET    | /users/mapping                        | User    | list      |
| DELETE | /users/:id(\d+)                       | User    | delete    |
| POST   | /users/:UserId(\d+)/articles          | Article | create    |
| GET    | /users/:UserId(\d+)/articles          | Article | list      |
| DELETE | /users/:UserId(\d+)/articles/:id(\d+) | Article | delete    |

It is used to

With just one decorator[TODO docref @Groups] you can expose any property (or method [TODO docref computedmethod]), from any entity in the context of your choice.

What that means is that you can for example have a different Mapping for the User creation route and the User update route.

_Of course this also means that you can have differents constraints for each context._

### Operations

An operation defines which **RouteController**[TODO docref] method will be used for a specific route.
The basic groups are those that you know very well, the CRUD ones.

_Careful not to get confused with the RouteOperations [TODO docref], they are close but not quite the same._

To sum that up, here is the actual types. _(As usual, everything is exported so you can use them)_

```typescript
const CRUD_OPERATIONS: RouteDefaultOperation[] = ["create", "list", "details", "update", "delete"];
type RouteDefaultOperation = "create" | "list" | "details" | "update" | "delete";
type RouteOperation = RouteDefaultOperation | string;
type GroupsOperation = "create" | "list" | "details" | "update" | string;
type GroupsOperationOrShortcuts = GroupsOperation[] | "all" | "basic";
```

### Groups

### Route

## Route Context

Every request passing through the `RequestContextMiddleware` will have a custom RequestContext attached to the current request context state.

```typescript
type RequestContext<Entity extends GenericEntity = GenericEntity, QP = QueryParams, State = Record<string, any>> = {
    /** Current request id */
    requestId?: string;
    /** Request context adapter */
    ctx?: ContextAdapter<QP, State>;
    /** Current route entity id */
    entityId?: string | number;
    /** Parent subresource relations, used to auto-join on this entity's relation inverse side */
    subresourceRelations?: SubresourceRelation[];
    /** Is update or create operation ? To check if there is a body sent */
    isUpdateOrCreate?: boolean;
    /** Request body values sent */
    values?: DeepPartial<Entity>;
    /** Request query params */
    queryParams?: QP;
    /** Custom operation for a custom action */
    operation?: RouteOperation;
};
```

### Store

Requests passing through the `RequestContextMiddleware` will also be stored in the `requestStore` until the request is over, when it will be removed from the store in the `EndResponseMiddleware`.

You can retrieve a request context using the `getRequestContext` method with its key.
Each context key is made by generating a [uuid (v4)](https://github.com/uuidjs/uuid).

```typescript
const getRequestContext = (key: string) => requestStore.get(key);
```

```typescript
type RequestState<Entity extends GenericEntity = GenericEntity> = {
    requestId: string;
    requestContext: RequestContext<Entity>;
    queryRunner: QueryRunner;
};
type ContextWithState = Context<any, EntityRouteState>;
const requestStore = new Map<string, ContextWithState>();
```

## Subresources

## Filters

## Hooks
