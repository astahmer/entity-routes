---
title: Installation
description: A step-by-step tutorial on how-to install entity-routes.
---

```bash
npm i @astahmer/entity-routes typeorm reflect-metadata
```

Since this library depends on Typescript [Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html),
just like [Typeorm](https://typeorm.io/), we need to enable Typescript decorators

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
