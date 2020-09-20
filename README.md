# entity-routes

:zap: Design your API around your [TypeORM](https://github.com/typeorm/typeorm/) entities in minutes. :stopwatch:

_No boilerplate controllers. No code generation. No bullshit._

**This README is still a WIP.**

[A documentation site is being built right now on the `feat/docs` branch.](https://entity-routes.vercel.app/)

## Table of Contents

-   [Core Features](#core-features)
-   [Installation](#installation)
-   [Quick start](quick-start)
    -   [Using Koa](#using-koa)
    -   [Using Express/Next/Nuxt](#using-expressnextnuxt)
-   [Benefits](#benefits)
-   [What/why ?](#whatwhy-)
-   [License](#license)

## Core Features

-   Instant CRUD with a simple @EntityRoute decorator
-   Independant service components (Database Reader, Persister, RelationManager etc...)
-   Built-in validation using [class-validator](https://github.com/typestack/class-validator)/[entity-validator](https://github.com/astahmer/entity-validator) decorators on your entities
-   Granular control over which properties are exposed (with @Groups) in which context
-   (nestable) Subresources (Entity properties that have dedicated endpoints)
-   Inferred entity route mappings (with generated endpoints to get the summary of an entity exposed properties for each contexts)
-   (async?) Computed properties (methods exposed as properties)
-   @MaxDepth decorator for entity/properties
-   Optimized SQL queries with only exposed properties selected
-   Soft delete/restoration supported (also for Subresources)
-   Built-in powerful filters for lists (Search/Pagination) that should fit well for 99% use cases
-   Custom filters if you find yourself in the 1%
-   Hooks to alter a request handling at any point in the process
-   Standardized REST responses

## Installation

Since this library depends on TS Decorators just like typeorm, we need to install ReflectMetadata.

```bash
npm i @astahmer/entity-routes reflect-metadata typeorm
```

Don't forget to import ReflectMetadata in your **app entrypoint**.

```typescript
import "reflect-metadata";
```

You also need this in your `tsconfig.json`

```json
{
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
}
```

> Learn about typescript decorators [here](https://www.typescriptlang.org/docs/handbook/decorators.html).

## Quick start

### Make your entities

You're just gonna have to create your TypeORM entities just like you always did.
Then there are 2 @ decorators that are specific to entity-routes :

-   @EntityRoute which is a class decorator, must be placed at the top of it so that your entities can be exposed through an EntityRouter.
-   @Groups which is a property decorator, must be placed at the top of every properties you want to expose through your routes, more details on it later

Here is a simple example.

```typescript
export class AbstractEntity {
    @Groups("all")
    @PrimaryGeneratedColumn()
    id: number;
}

@EntityRoute({ path: "/users", operations: ["create", "update", "details", "list", "delete"] })
@Entity()
export class User extends AbstractEntity {
    @Groups("basic")
    @Column()
    name: string;

    @Subresource(() => Article)
    @OneToMany(() => Article, (article) => article.author)
    articles: Article[];
}

@EntityRoute()
@Entity()
export class Article extends AbstractEntity {
    @Groups("basic")
    @Column()
    title: string;

    @Groups("basic")
    @Column()
    content: string;

    @Groups("basic")
    @ManyToOne(() => User, (user) => user.articles)
    author: User;
}
```

It will automatically generate those routes :

```typescript
[
    "/users : post",
    "/users/mapping : post",
    "/users/:id(\\d+) : put",
    "/users/:id(\\d+)/mapping : put",
    "/users/:id(\\d+) : get",
    "/users/:id(\\d+)/mapping : get",
    "/users : get",
    "/users/mapping : get",
    "/users/:id(\\d+) : delete",
    "/users/:UserId(\\d+)/articles : post",
    "/users/:UserId(\\d+)/articles : get",
    "/users/:UserId(\\d+)/articles/:id(\\d+) : delete",
];
```

### Register your Entity Routes

#### Using Koa

```typescript
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

#### Using Express/Next/Nuxt

```typescript
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

### Final step

That's it. There is no final step. Your routes are ready.

## Benefits

-   0 config required
-   Compatible with Express, Koa, Next, Nuxt and any other middleware-based framework using adapters
-   Out-of-the-box support for Koa/Express integrations
-   Type-safe API
-   Almost complete code coverage (95%+)
-   Everything (types included) is exported so you can use it your own way

## What/why ?

Basically this is a **Node / Typescript** route handler tightly coupled with **[TypeORM](https://github.com/typeorm/typeorm/)** entities.

I wanted to get rid of writing the same boring controllers again & again for each entities and I could not find a NodeJS project that would fit my needs : being simple enough not to require any configuration (or controllers), yet easily customizable when needed.

_Inspired by an internal project made at [ACSEO](https://acseo.fr/) with ApiPlatform (Symfony/PHP)_

## License

MIT © 2020 Alexandre Stahmer
