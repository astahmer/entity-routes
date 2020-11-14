import { createContext, useMemo } from "react";
import { Stack } from "@chakra-ui/react";
import MDXComponents from "@/components/DokzOverride/mdx";
import GithubSlugger from "github-slugger";

// Dokz override
import { DokzWrapper, TableOfContentItem } from "./DokzOverride";
import { useRouter } from "next/router";
import {
    defaultSidebarTree,
    DirectoryTree,
    findSubtreeByUrl,
    getSidebarTree,
    getSidebarOrder,
    orderTree,
    SubTree,
} from "@/functions/sidebar";

export const Wrapper = ({ children, meta: { tableOfContents } }) => {
    const router = useRouter();

    const tree = getSidebarTree();
    const order = getSidebarOrder();
    const sidebarTree = useMemo(() => orderTree({ tree, order, root: tree }), [tree, order]);

    const sidebarItemData = (findSubtreeByUrl(sidebarTree, router.pathname) || {}) as SubTree;
    const currentItem = sidebarItemData.current;
    // Generates & re-use title slug for h1#id & TOC anchor link
    currentItem.meta.slug = GithubSlugger.slug(currentItem.meta.title);

    const meta = { tableOfContents, ...currentItem.meta };
    const hasTitle = meta.title && !meta.withoutH1;

    // TODO Gtag manager ?

    return (
        <WrapperContext.Provider value={{ sidebarTree, tableOfContentsItems: tableOfContents, ...sidebarItemData }}>
            <DokzWrapper currentItem={currentItem}>
                <Stack spacing={6} fontSize={[16, 16, 16, 16, 17]} shouldWrapChildren>
                    {hasTitle && <MDXComponents.h1 id={currentItem.meta.slug}>{meta.title}</MDXComponents.h1>}
                    {children}
                </Stack>
            </DokzWrapper>
        </WrapperContext.Provider>
    );
};

const defaultWrapperContext: WrapperContext = {
    sidebarTree: defaultSidebarTree,
    tableOfContentsItems: [],
    current: null,
    previous: null,
    next: null,
    tree: null,
    parent: null,
};

export type WrapperContext = {
    sidebarTree: DirectoryTree;
    tableOfContentsItems: TableOfContentItem[];
} & SubTree;

export const WrapperContext = createContext(defaultWrapperContext);
