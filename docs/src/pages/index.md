---
name: Features
withoutTitle: true
---

import { Logo } from '@/components/Logo.tsx'

<Logo />

`entity-routes` enables you to design your API around your [TypeORM](https://github.com/typeorm/typeorm/) `entities` in
minutes. It is compatible with [**Express**](https://expressjs.com/)/[**Koa**](https://koajs.com/) or any connect-like
framework, _which should mean any middleware-based node layer_ (like [Next](http://nextjs.org/),
[Nuxt](http://nuxtjs.org/), etc...).

## [Instant CRUD from your TypeORM entities](/entity-route/introduction)

Using `entity-routes` **you won't have to write any boilerplate controllers** with the same boring logic as usual for
every `entities` you have.

You can just decorate your `entity` with [`@EntityRoute`](/entity-routes/introduction) and enable the
[**operations**](/entity-routes/introduction#operations) you want.

## [Granular control over which properties are exposed](/entity-route/groups)

With the [`@Groups`](/entity-routes/groups) decorator you can configure your properties to be exposed in a specific or
all [`route scopes`](/entity-routes/route-scope/). This will lead to optimized SQL queries with only properties exposed
through [`@Groups`](/definitions/definitions#groups) to be selected. You can control recursion depth with
[`@MaxDepth`](/definitions/definitions#maxdepth) decorator.

## [Subresources](/entity-route/subresource)

You can have entity properties that have dedicated endpoints using **Subresources** and
[nested Subresources](/entity-route/subresource#nesting).

## Built-in validation

Use
[class-validator](https://github.com/typestack/class-validator)/[entity-validator](https://github.com/astahmer/entity-validator)
decorators on your `entities` to describe how to validate them

## [Auto Route Mappings](/entity-route/route-scope#inferred-mapping)

`entity-routes` generates endpoints (for each [`route scope`](/entity-routes/route-scope/)) to get the summary of an
entity exposed properties, inferred from your `@Entity` `entities` and their
[`@Groups`](/definitions/definitions#groups) decorated properties.

## [Filters](/entity-route/filters)

You can use list [**filters**](/entity-routes/filters/) to alter items returned with auto SQL generated conditions. We
have two built-in powerful [**filters**](/entity-routes/filters/) for lists (Search/Pagination) (TODO docref) that
should fit well for 99% use cases. But you can also make your own custom [**filters**](/entity-routes/filters/) if you
find yourself in the 1%

## [Hooks](/entity-route/hooks)

There are [**hooks**](/entity-routes/hooks/) available to intervene at any point in the process of a request handling.

## Computed properties

You can have methods exposed as properties in your API responses. Those methods can be asynchronous and can also require
other entity properties that are not exposed through [`@Groups`](/definitions/definitions#groups) and still be resolved
with [`@DependsOn`](/definitions/definitions#dependson) decorator. (title TODO docref)

## Re-usable service components

Everything is exported so you have access to every components that are used internally and you can use them your own
way.
