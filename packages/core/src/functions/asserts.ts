import { WhereType } from "../filters";
import { GenericEntity } from "../types";

export const isEntity = (value: any): value is GenericEntity => value instanceof Object && "id" in value;
export const isWhereType = (property: string): property is WhereType => ["and", "or"].includes(property);
