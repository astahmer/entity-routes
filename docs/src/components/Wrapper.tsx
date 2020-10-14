import { createContext, useMemo } from "react";
import { Stack } from "@chakra-ui/core";
import { MDXComponents } from "dokz";
import { reset } from "@/functions/codeBlocks";

// Dokz override
import { DirectoryTree } from "dokz/dist/components/support";
import { DokzWrapper, getMdxSidebarTree } from "./DokzOverride";
import { useRouteChanged } from "@/functions/useRouteChanged";

export const Wrapper = ({ children, ...props }) => {
    const meta = props.meta;
    const title = meta?.title || meta?.name;
    const withTitle = !meta?.withoutTitle;

    if (title && meta?.tableOfContents?.children?.length) {
        if (meta.tableOfContents.children[0].title !== title) {
            meta.tableOfContents.children.unshift({ title, slug: "#" + title.toLowerCase(), depth: 1 });
        }
    }

    const tree = getMdxSidebarTree();
    const order = getSidebarOrder();
    const sidebarTree = useMemo(() => orderTree({ tree, order }), [tree, order]);

    // TODO Gtag manager ?
    // On route change, reset code block count
    useRouteChanged({
        onStart: reset,
        onComplete: () => {
            if (window.location.hash) return;
            document.body.style.scrollBehavior = "auto";
            document.body.scrollTo({ top: 0, left: 0, behavior: "auto" });
            document.body.style.scrollBehavior = undefined;
        },
    });

    return (
        <WrapperContext.Provider value={{ sidebarTree }}>
            <DokzWrapper {...props} {...{ meta }}>
                <Stack spacing={6} fontSize={[16, 16, 16, 16, 17]} shouldWrapChildren>
                    {/* Add h1 to every page based on name(dokz)/title(typedoc) */}
                    {title && withTitle && <MDXComponents.h1 id={title.toLowerCase()}>{title}</MDXComponents.h1>}
                    {children}
                </Stack>
                {/* Make table of contents (on the right) scrollable, max height to 100 minus header */}
                <style jsx global>{`
                    .mainContent + div {
                        overflow: auto;
                        max-height: calc(100vh - 62px);
                    }
                `}</style>
            </DokzWrapper>
        </WrapperContext.Provider>
    );
};

const defaultSidebarTree: DirectoryTree = { name: "pages", children: [] };
export const WrapperContext = createContext({ sidebarTree: defaultSidebarTree });

// TODO FloatingTableOfContents Quick links (View source / See test file/folder), both from page meta

type SidebarOrder = {
    /** Sidebar label */
    title?: string;
    /** File basename */
    name?: string;
    /** Children routes */
    routes?: SidebarOrder[];
    /** If adding a link to sidebar even though there is no corresponding page, use this */
    url?: string;
    /** If you want to override some meta, this key will be merged with sidebar:child.meta */
    meta?: Record<string, any>;
    /** Will hide that item from sidebar */
    hidden?: boolean;
};
function getSidebarOrder(): SidebarOrder {
    try {
        return require("nextjs_root_folder_/sidebar-order.json");
    } catch {
        return { routes: [] };
    }
}

const MDX_EXTENSION_REGEX = /\.mdx?/;
const equalWithoutExtension = (a: string, b: string) =>
    a.replace(MDX_EXTENSION_REGEX, "") === b.replace(MDX_EXTENSION_REGEX, "");

/** Recursively re-order sidebar from sidebar-order.json */
function orderTree({ tree, order }: { tree: DirectoryTree; order: SidebarOrder }) {
    const { children = [], ...rest } = tree || defaultSidebarTree;
    const orderedTree: DirectoryTree = { ...rest, children: [] };

    // Re-order & add each children from sidebar-order.json
    order.routes.forEach((route) => {
        if (route.hidden) return;
        // Find sidebar.json item from sidebar-order.json route.name
        const item = children.find((child) => equalWithoutExtension(child.name, route.name || ""));

        const { routes, ...rest } = route;
        // Shallow merge item/route except for meta that is also shallow merged
        const itemMeta = (item || {}).meta;
        const meta = itemMeta && route.meta && { ...itemMeta, ...route.meta };
        const merged = { ...item, ...rest, meta } as DirectoryTree;

        // If route has child, re-order them
        const orderedItem = route.routes?.length ? orderTree({ tree: merged, order: route }) : merged;

        // If a page exists for that sidebar-order route
        if (item) {
            orderedTree.children.push(orderedItem);
        } else if (route.url) {
            // New sidebar item with no corresponding page & therefore has a url manually defined
            orderedTree.children.push({
                name: route.title?.toLowerCase(),
                ...rest,
                children: route.routes,
                hasNoPage: true,
            } as DirectoryTree);
        }
    });

    // If there are tree.children omitted in sidebar-order.json, append them (unless hidden)
    if (children.length !== orderedTree.children.filter((child) => !(child as any).hasNoPage).length) {
        orderedTree.children.push(
            ...children.filter(
                (child) =>
                    !order.routes.find((route) => route.name === child.name)?.hidden &&
                    !orderedTree.children.find((addedChild) => equalWithoutExtension(addedChild.name, child.name))
            )
        );
    }

    return orderedTree;
}
