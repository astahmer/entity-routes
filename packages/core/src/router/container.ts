import { Container } from "typedi";

import { EntityRouter } from "@entity-routes/core";

const entityRouters: Record<string, EntityRouter<any>> = {};
Container.set("entityRouters", entityRouters);

export const getEntityRouters = () => Container.get("entityRouters") as typeof entityRouters;
export const setEntityRouter = (name: string, entityRouter: EntityRouter<any>) => (entityRouters[name] = entityRouter);
