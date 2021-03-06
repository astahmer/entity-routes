import { Stack } from "@chakra-ui/react";
import GithubSlugger from "github-slugger";
import { NextSeo } from "next-seo";
import { useRouter } from "next/router";
import { createContext, useContext, useMemo } from "react";

import MDXComponents from "@/components/mdx";
import {
    DirectoryTree,
    SubTree,
    defaultSidebarTree,
    findSubtreeByUrl,
    getSidebarOrder,
    getSidebarTree,
    orderTree,
} from "@/functions/sidebar";

import { TableOfContentItem, Wrapper } from "./index";

export const PageProvider = ({ children, meta: { tableOfContents } }) => {
    const router = useRouter();

    const tree = getSidebarTree();
    const order = getSidebarOrder();
    const sidebarTree = useMemo(() => orderTree({ tree, order, root: tree }), [tree, order]);

    const sidebarItemData = (findSubtreeByUrl(sidebarTree, router.pathname) || {}) as SubTree;
    const currentItem = sidebarItemData.current;

    // If current page is found in sidebar.json
    if (currentItem) {
        // Generates & re-use title slug for h1#id & TOC anchor link
        currentItem.meta.slug = GithubSlugger.slug(currentItem.meta.title);
    }

    const meta = { tableOfContents, ...currentItem?.meta };
    const hasTitle = meta.title && !meta.withoutH1;

    return (
        <PageContext.Provider value={{ sidebarTree, tableOfContentsItems: tableOfContents, ...sidebarItemData }}>
            <NextSeo title={meta.title} description={meta.description} />
            <Wrapper currentItem={currentItem}>
                <Stack spacing={6} fontSize={[16, 16, 16, 16, 17]} shouldWrapChildren>
                    {hasTitle && <MDXComponents.h1 id={currentItem.meta.slug}>{meta.title}</MDXComponents.h1>}
                    {children}
                </Stack>
            </Wrapper>
        </PageContext.Provider>
    );
};

const defaultPageContext: PageContext = {
    sidebarTree: defaultSidebarTree,
    tableOfContentsItems: [],
    current: null,
    previous: null,
    next: null,
    tree: null,
    parent: null,
};

export type PageContext = {
    sidebarTree: DirectoryTree;
    tableOfContentsItems: TableOfContentItem[];
} & SubTree;

export const PageContext = createContext(defaultPageContext);
export const usePageContext = () => useContext(PageContext);
