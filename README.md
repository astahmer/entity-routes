# entity-routes

⚡Design your API around your [TypeORM](https://github.com/typeorm/typeorm/) entities in minutes. ⏱️

*No boilerplate controllers. No code generation. No bullshit.*

## Table of Contents

* [✨ Core Features](#✨-core-features)
* [🔧 Installation](#🔧-installation)
* [🚄 Quick start](#🚄-quick-start)
    + [Using Koa](#using-koa)
    + [Using Express/Next/Nuxt](#using-expressnextnuxt)
* [🎈 Bonus points](#🎈-bonus-points)
* [😲 What/why ?](#😲-whatwhy)
* [🔨 Making a custom context adapter](#🔨-making-a-custom-context-adapter)
* [License](#license)

## ✨ Core Features

- Instant CRUD with a simple @EntityRoute decorator
- Independant service components (Database Reader, Persister, RelationManager etc...)
- Built-in validation using [class-validator](https://github.com/typestack/class-validator)/[entity-validator](https://github.com/astahmer/entity-validator) decorators on your entities
- Granular control over which properties are exposed (with @Groups) in which context
- (nestable) Subresources (Entity properties that have dedicated endpoints)
- Inferred entity route mappings (with generated endpoints to get the summary of an entity exposed properties for each contexts)
- (async?) Computed properties (methods exposed as properties)
- @MaxDepth decorator for entity/properties
- Optimized SQL queries with only exposed properties selected
- Soft delete/restoration supported (also for Subresources)
- Built-in powerful filters for lists (Search/Pagination) that should fit well for 99% use cases
- Custom filters if you find yourself in the 1%
- Standardized REST responses

## 🔧 Installation

Since this library depends on TS Decorators just like typeorm, we need to install ReflectMetadata.

```bash
npm i @astahmer/entity-routes reflect-metadata typeorm
```

Don't forget to import ReflectMetadata in your **app entrypoint**.
``` typescript
import "reflect-metadata";
```

You also need this in your `tsconfig.json`

``` json
{
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
}
```

> Learn about typescript decorators [here](https://www.typescriptlang.org/docs/handbook/decorators.html).

## 🚄 Quick start

### Using Koa

``` typescript
import { AddressInfo } from "net";
import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import { Connection } from "typeorm";
import { makeKoaEntityRouters } from "@astahmer/entity-routes";

export async function setupKoaApp(connection: Connection) {
    const entities = connection.entityMetadatas.map((meta) => meta.target) as Function[];

    const bridgeRouters = await makeKoaEntityRouters({ connection, entities, options });
    const app = new Koa();
    app.use(bodyParser());

    // Register all routes on koa server
    bridgeRouters.forEach((router) => app.use(router.instance.routes()));

    // Always validate when no groups are passed on validators
    setEntityValidatorsDefaultOption(entities);

    const server = app.listen(); // random port
    const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const client = axios.create({ baseURL });
    return { baseURL, server, client };
}
```

### Using Express/Next/Nuxt

``` typescript
import { AddressInfo } from "net";
import * as express from "express";
import * as bodyParser from "body-parser";
import { Connection } from "typeorm";
import { makeExpressEntityRouters } from "@astahmer/entity-routes";

export async function setupExpressApp(connection: Connection) {
    const entities = connection.entityMetadatas.map((meta) => meta.target) as Function[];

    const bridgeRouters = await makeExpressEntityRouters({ connection, entities, options });
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Register all routes on Express server
    bridgeRouters.forEach((router) => app.use(router.instance));

    const server = app.listen(); // random port
    const baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const client = axios.create({ baseURL });
    return { baseURL, server, client };
}
```

## 🎈 Bonus points

- 0 config required
- Compatible with Express, Koa, Next, Nuxt and any other middleware-based framework
- Out-of-the-box support for Koa/Express integrations
- Type-safe API
- Almost complete code coverage (95%+)
- Everything is exported so you can use it your own way

## 😲 What/why ?

Basically this is a **Node / Typescript** route handler tightly coupled with **[TypeORM](https://github.com/typeorm/typeorm/)** entities.

I wanted to get rid of writing the same boring controllers again & again for each entities and I could not find a NodeJS project that would fit my needs : being simple enough not to require any configuration (or controllers), yet easily customizable when needed.

*Inspired by an internal project made at [ACSEO](https://acseo.fr/) with ApiPlatform (Symfony/PHP)*

## 🔨 Making a custom context adapter

So, you got a middleware-based Node layer that is neither Koa/Express and you want to be able to use entity-routes ?

That can be easily done in 4 steps.

1. You need to make a MiddlewareAdapter and pass everything you want/need in your "context"

Here is how Koa/Express middleware adapters are implemented

``` typescript
type AnyMiddlewareAdapter = (mw: Function) => (...args: any) => any;

const expressMiddlewareAdapter = (mw: Function) => (req, res, next) => mw(makeExpressContextAdapter(req, res), next);

const koaMiddleareAdapter = (mw: Function) => (ctx: Context, next: Next) => mw(makeKoaContextAdapter(ctx), next);
```

2. Then you need to make the context adapter factory using the parameters you passed previously

Here is how Koa context adapter factory is implemented.

``` typescript
export type KoaContextAdapter = ContextAdapter & { ctx: Context };

export const makeKoaContextAdapter = (ctx: Context) => ({
    ctx,
    req: ctx.req,
    res: ctx.res,
    get method() {
        return this.ctx.method;
    },
    get requestBody() {
        return this.ctx.request.body;
    },
    get params() {
        return this.ctx.params;
    },
    get query() {
        return this.ctx.query;
    },
    get state() {
        return this.ctx.state;
    },
    get responseBody() {
        return this.ctx.body;
    },
    set responseBody(value) {
        this.ctx.body = value;
    },
    get status() {
        return this.ctx.status;
    },
    set status(value) {
        this.ctx.status = value;
    },
} as KoaContextAdapter);
```

And here is how Express context adapter factory is implemented.

``` typescript

export type ExpressContextAdapter = ContextAdapter & { req: Request; res: Response };

export const makeExpressContextAdapter = (req: Request, res: Response) => ({
    req,
    res,
    get method() {
        return this.req.method;
    },
    get requestBody() {
        return this.req.body;
    },
    get params() {
        return this.req.params;
    },
    get query() {
        return this.req.query;
    },
    get state() {
        return this.res.locals;
    },
    get responseBody() {
        return this.res.locals.responseBody;
    },
    set responseBody(value: any) {
        this.res.locals.responseBody = value;
        this.res.send(value).end();
    },
    get status() {
        return this.res.statusCode;
    },
    set status(value) {
        this.res.status(value);
    },
} as ExpressContextAdapter);

```

3. You must define a routerRegisterFn, which register a BridgeRoute to a XXX route in XXX router, where XXX can be Koa/Express, etc

This is how it is implemented for :

- Koa
``` typescript
import { Middleware } from "koa";
import * as Router from "koa-router";

export function registerKoaRouteFromBridgeRoute(instance: Router, route: BridgeRouterRoute<Middleware>) {
    instance.register(route.path, route.methods, route.middlewares, { name: route.name });
}
```

- Express
``` typescript
import { Router RequestHandler } from "express";
export function registerExpressRouteFromBridgeRoute(instance: Router, route: BridgeRouterRoute<RequestHandler>) {
    route.methods.forEach((verb) => instance[verb](route.path, route.middlewares));
}
```

4. Finally, you can put these together and make your own makeXXXEntityRouters

As usual, here is an example with Express :
``` typescript
export async function makeExpressEntityRouters(
    args: Omit<MakeEntityRouters, "options"> & { options?: EntityRouteOptions }
) {
    return makeEntityRouters({
        ...args,
        options: {
            ...args.options,
            routerFactoryFn: Router,
            routerRegisterFn: registerExpressRouteFromBridgeRoute,
            middlewareAdapter: (mw: Function) => (req, res, next) => mw(makeExpressContextAdapter(req, res), next),
        },
    });
}
```


## License

MIT © 2020 Alexandre Stahmer
