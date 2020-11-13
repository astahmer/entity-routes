import { createContext, useMemo } from "react";
import { Stack } from "@chakra-ui/core";
import { MDXComponents } from "dokz";
import { reset } from "@/functions/codeBlocks";
import GithubSlugger from "github-slugger";

// Dokz override
import { DokzWrapper, TableOfContentItem } from "./DokzOverride";
import { useRouteChanged } from "@/functions/useRouteChanged";
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
    // On route change, reset code block count & scroll to top if no anchor used
    useRouteChanged({
        onStart: reset,
        onComplete: () => {
            if (window.location.hash) return;
            document.body.style.scrollBehavior = "auto";
            document.body.scrollTo({ top: 0, left: 0, behavior: "auto" });
            document.body.style.scrollBehavior = "smooth";
        },
    });

    return (
        <WrapperContext.Provider value={{ sidebarTree, tableOfContentsItems: tableOfContents, ...sidebarItemData }}>
            <DokzWrapper currentItem={currentItem}>
                <Stack spacing={6} fontSize={[16, 16, 16, 16, 17]} shouldWrapChildren>
                    {/* Add h1 to every page based on name(dokz)/title(typedoc) */}
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
