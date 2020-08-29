---
name: Features
---

![Logo](/logo-full.png)

`entity-routes` enables you to design your API around your [TypeORM](https://github.com/typeorm/typeorm/) entities in minutes.
It is compatible with **Express/Koa** or any connect-like framework, _which should mean any middleware-based node layer_ (like Next, Nuxt, etc...).

## Instant CRUD from your TypeORM entities

Using `entity-routes` **you won't have to write any boilerplate controllers** with the same boring logic as usual for every entities you have.

You can just decorate your entity with [`@EntityRoute`](/entity-routes/introduction) and enable the [`operations`](/entity-routes/introduction#operations) you want

## Granular control over which properties are exposed

With the [`@Groups`](/entity-routes/groups) decorator you can configure your properties to be exposed in a specific or all context.
This will lead to optimized SQL queries with only properties exposed through @Groups to be selected.
You can also avoid recursion with @MaxDepth (TODO docref) decorator.

## Subresources

You can have entity properties that have dedicated endpoints using Subresources (TODO docref) and nested Subresources.

## Built-in validation

Use [class-validator](https://github.com/typestack/class-validator)/[entity-validator](https://github.com/astahmer/entity-validator) decorators on your entities to describe how to validate them

## Auto Route Mappings

`entity-routes` generates endpoints (for each contexts) to get the summary of an entity exposed properties, inferred from your @Entity entities (TODO docref) and their @Groups decorated properties(TODO docref).

## Computed properties

You can have methods exposed as properties in your API responses.
Those methods can be asynchrone and can also require other entity properties that are not exposed through @Groups (TODO docref) and still be resolved with @DependsOn (TODO docref) decorator.

## Filters

You can use list filters (TODO docref) to alter items returned with auto SQL generated conditions.
We have two built-in powerful filters for lists (Search/Pagination) that should fit well for 99% use cases.
But you can also make your own custom filters if you find yourself in the 1%

## Hooks

There are hooks (TODO docref) available to intervene at any point in the process of a request handling.

## Re-usable service components

Everything is exported so you have access to every components that are used internally and you can use them your own way.
