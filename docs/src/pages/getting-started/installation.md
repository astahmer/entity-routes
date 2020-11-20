---
title: Installation
description: A step-by-step tutorial on how-to install entity-routes.
---

With `entity-routes` (and therefore `TypeORM`), you will find yourself using a lot of
[Typescript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html).

> A Decorator is a special kind of declaration that can be attached to a class declaration, method, accessor, property,
> or parameter.

By "decorating" a `class declaration, method, accessor, property, or parameter`, you can associate additional
information (`metadata`) and use it to make things like `@EntityRoute`/`@Groups`.

## Prerequisites

```bash
npm i @astahmer/entity-routes typeorm reflect-metadata
```

Since this library depends on it, we need to enable them

```json title=./tsconfig.json
{
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
}
```

Import [reflect-metadata](https://github.com/rbuckton/reflect-metadata) in your **app entrypoint**.

```typescript title=./src/main.ts
import "reflect-metadata";
```
