import { idToIRI } from "../../functions";
import { getRouteSubresourcesMetadata } from "../../router";
import { GenericEntity } from "../../types";
import { DecorateFnArgs } from "../Decorator";
import { WriterOptions } from "../Writer";

/** For each item's subresources, add their corresponding IRIs to this item */
export function setSubresourcesIriOnItem<Entity extends GenericEntity>({
    item,
    itemMetadata,
    data,
    clone,
}: DecorateFnArgs<Entity, Pick<WriterOptions, "useIris">>) {
    const subresourceProps = getRouteSubresourcesMetadata(itemMetadata.target as Function).properties;

    let key;
    for (key in subresourceProps) {
        if (!clone[key as keyof Entity]) {
            clone[key as keyof Entity] = data?.useIris ? idToIRI(itemMetadata, item.id) + "/" + key : item.id;
        }
    }
}
