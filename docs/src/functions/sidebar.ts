export const defaultSidebarTree: DirectoryTree = { name: "pages", children: [] };

export function getSidebarTree(): DirectoryTree {
    try {
        return require("__NEXT_ROOT__/sidebar.json");
    } catch (e) {
        return { name: "pages", children: [] };
    }
}

export function getSidebarOrder(): SidebarOrder {
    try {
        return require("__NEXT_ROOT__/sidebar-order.json");
    } catch {
        return { routes: [] };
    }
}

export const MDX_EXTENSION_REGEX = /\.mdx?/;

export const removeMdxExt = (str) => str.replace(MDX_EXTENSION_REGEX, "");
export const equalWithoutExtension = (a: string, b: string) => removeMdxExt(a) === removeMdxExt(b);

/** Recursively re-order sidebar from sidebar-order.json */
export function orderTree({ tree, order, root }: { tree: DirectoryTree; order: SidebarOrder; root: DirectoryTree }) {
    const { children = [], ...rest } = tree || defaultSidebarTree;
    const orderedTree: DirectoryTree = { ...rest, children: [] };

    // Re-order & add each children from sidebar-order.json
    order.routes.forEach((route) => {
        if (route.meta?.hidden) return;
        // Find sidebar.json item from sidebar-order.json route.name
        const item = children.find((child) => equalWithoutExtension(child.name, route.name || ""));

        const { routes, meta: routeMeta, ...rest } = route;
        // Shallow merge item/route except for meta that is also shallow merged
        const itemMeta = (item || {}).meta;
        const meta = itemMeta && routeMeta ? { ...itemMeta, ...routeMeta } : itemMeta || routeMeta;
        const merged = { ...item, ...rest, meta };

        // If route has child, re-order them
        const orderedItem = route.routes?.length ? orderTree({ tree: merged, order: route, root }) : merged;

        // If a page exists for that sidebar-order route
        if (item) {
            orderedTree.children.push(orderedItem);
        } else if (route.url) {
            let customMeta = routeMeta;
            // If url is an internal page, retrieve associated meta from sidebar.json
            if (route.url.startsWith("/")) {
                const subTree = findSubtreeByUrl(root, route.url);
                customMeta = { ...subTree?.current?.meta, ...routeMeta };
            }

            // New sidebar item with no corresponding page & therefore has a url manually defined
            orderedTree.children.push({
                ...rest,
                meta: customMeta,
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
                    !order.routes.find((route) => route.name === child.name)?.meta?.hidden &&
                    !orderedTree.children.find((addedChild) => equalWithoutExtension(addedChild.name, child.name))
            )
        );
    }

    return orderedTree;
}

export function findSubtreeByUrl(
    tree: DirectoryTree,
    url: string,
    parent?: DirectoryTree,
    parentIndex?: number
): SubTree {
    if (!tree?.children?.length) return null;

    for (let i = 0; i < tree.children.length; i++) {
        let child = tree.children[i];
        if (child.url === url) {
            // console.log({ child, tree, parent });
            return {
                tree,
                parent,
                previous: tree.children[i - 1] || parent?.children[parentIndex - 1],
                current: child,
                next: tree.children[i + 1] || parent?.children[parentIndex + 1],
            };
        }

        const found = findSubtreeByUrl(child, url, tree, i);
        if (found) return found;
    }
}

export type SubTree = {
    current: DirectoryTree;
    previous: DirectoryTree;
    next: DirectoryTree;
    tree: DirectoryTree;
    parent: DirectoryTree;
};

/** sidebar.json item */
export type DirectoryTree = {
    path?: string;
    name: string;
    children?: DirectoryTree[];
    url?: string;
    meta?: Record<string, any> & SidebarItemMeta;
};

/** sidebar.json item.meta coming from frontmatter */
export type SidebarItemMeta = Partial<{
    /** Page title used for SEO, will produce an h1 at the top, will be used as sidebar label as well unless overidden */
    title: string;
    /** Page description used for SEO */
    description: string;
    /** Allow NOT producing an h1 at the top of the page */
    withoutH1: boolean;
    /** Overrides title as sidebar label, used by TypeDoc generated pages */
    sidebar_label: string;
}>;

/** sidebar-order.json item */
export type SidebarOrder = {
    /** Sidebar label */
    title?: string;
    /** File basename */
    name?: string;
    /** Children routes */
    routes?: SidebarOrder[];
    /** If adding a link to sidebar even though there is no corresponding page, use this */
    url?: string;
    /** If you want to override some meta, this key will be merged with sidebar:child.meta */
    meta?: Record<string, any> & SidebarOrderItemMeta;
};

/** sidebar-order.json item.meta */
export type SidebarOrderItemMeta = Partial<{
    /** Allow hidding item in sidebar */
    hidden?: boolean;
    /** Default collapse state for directories */
    defaultOpened?: boolean;
    /** Default collapse state for sub-directories */
    childrenDefaultOpened?: boolean;
}>;
