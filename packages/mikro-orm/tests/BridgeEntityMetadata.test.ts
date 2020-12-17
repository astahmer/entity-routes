import { pick } from "@entity-routes/shared";

import { BridgeRelationMetadata, MikroOrmProvider } from "../src";
import { closeTestConnection, createTestConnection } from "./connection";
import { Author, Book } from "./entities";

it("does things", async () => {
    const { orm, em } = await createTestConnection();
    const provider = new MikroOrmProvider(orm);

    const printInverseRelation = (rel: BridgeRelationMetadata) =>
        rel.instance.mappedBy || rel.instance.inversedBy
            ? rel.instance.name + "." + rel.inverseRelation.propertyName
            : "none";

    // const bookRepo = provider.getRepository(Book);
    // const bookMetadata = bookRepo.metadata;
    // console.log(bookMetadata.relations.map(printInverseRelation));
    // return closeTestConnection();

    //
    const all = provider.orm.getMetadata().getAll();
    const repos = Object.entries(all)
        .map(([_name, meta]) => !meta.abstract && !meta.pivotTable && provider.getRepository(meta.class))
        .filter(Boolean);
    const inverseRelations = repos.map((repo) => [
        repo.metadata.name,
        repo.metadata.relations.map(printInverseRelation),
    ]);
    console.log(inverseRelations);
    return closeTestConnection();

    //
    const authorRepo = provider.getRepository(Author);
    const authorMetadata = authorRepo.metadata;
    const bridgeProps = pick(authorMetadata, ["name", "target", "tableName", "columns", "relations"]);
    console.log(bridgeProps);
    console.log(authorMetadata.relations.map(printInverseRelation));
    return closeTestConnection();
    // const qb = em.createQueryBuilder("author");
    // qb.
});
