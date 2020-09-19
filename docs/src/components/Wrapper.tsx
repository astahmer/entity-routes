import { Stack } from "@chakra-ui/core";
import { MDXComponents } from "dokz";
import React, { createContext, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { reset } from "@/functions/codeBlocks";

// Dokz override
import { DirectoryTree } from "dokz/dist/components/support";
// import { Wrapper as DokzWrapper } from "dokz/dist/components/Wrapper";
import { DokzWrapper, getMdxSidebarTree } from "./DokzOverride";

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

    const router = useRouter();

    // TODO Gtag manager ?
    // On route change, reset code block count
    useEffect(() => {
        const handleRouteChange = (url) => {
            reset();
            console.log("App is changing to: ", url);
        };
        const handleRouteChangeComplete = () => {
            document.body.style.scrollBehavior = "auto";
            document.body.scrollTo({ top: 0, left: 0, behavior: "auto" });
            document.body.style.scrollBehavior = undefined;
        };

        router.events.on("routeChangeStart", handleRouteChange);
        router.events.on("routeChangeComplete", handleRouteChangeComplete);

        // If the component is unmounted, unsubscribe
        // from the event with the `off` method:
        return () => {
            router.events.off("routeChangeStart", handleRouteChange);
            router.events.off("routeChangeComplete", handleRouteChangeComplete);
        };
    }, []);

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

const defaultSidebarTree = { name: "pages", children: [] };
export const WrapperContext = createContext({ sidebarTree: defaultSidebarTree });

type SidebarOrder = {
    /** Sidebar label */
    title?: string;
    /** File basename */
    name?: string;
    /** Children routes */
    routes?: SidebarOrder[];
    /** If adding a link to sidebar even though there is no corresponding page, use this */
    url?: string;
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

/** Re-order sidebar from sidebar-order.json */
function orderTree({ tree, order }: { tree: DirectoryTree; order: SidebarOrder }) {
    const { children, ...rest } = tree || defaultSidebarTree;
    const orderedTree: DirectoryTree = { ...rest, children: [] };

    // Re-order & add each children from sidebar-order.json
    order.routes.forEach((route) => {
        const item = children.find((child) => equalWithoutExtension(child.name, route.name));
        const orderedItem = route.routes?.length ? orderTree({ tree: item, order: route }) : item;
        if (orderedItem) {
            orderedTree.children.push(orderedItem);
        } else if (route.url) {
            const { routes, ...rest } = route;
            orderedTree.children.push({ ...rest, children: route.routes, hasNoPage: true } as DirectoryTree);
        }
    });

    // If there are tree.children omitted in sidebar-order.json, append them
    if (children.length !== orderedTree.children.filter((child) => !(child as any).hasNoPage).length) {
        orderedTree.children.push(
            ...children.filter((child) => !orderedTree.children.find((addedChild) => addedChild.name === child.name))
        );
    }

    return orderedTree;
}
