import { Box, Collapse, Divider, Stack, useDisclosure } from "@chakra-ui/core";
import { DirectoryTree, formatTitle } from "dokz/dist/components/support";
import { SideNavProps as DokzSideNavProps } from "dokz/dist/components/SideNav";

import { CollapseDown } from "./CollapseDown";
import { CollapseRight } from "./CollapseRight";
import { ComponentLink } from "dokz/dist/components/NavLink";
import { useRouter } from "next/router";

// Modified version of SideNav taken from source directly at
// https://github.com/remorses/dokz/blob/61f9ddbbc923c2b287de86f8ec6e482b8afd4846/dokz/src/components/SideNav.tsx
export const SideNav = ({ tree, ...rest }: DokzSideNavProps) => {
    const router = useRouter();

    if (!tree) {
        console.error(new Error(`sidenav tree is null`));
        tree = { name: "", children: [] };
    }

    return (
        <Box overflowY="auto" as="nav" aria-label="Main navigation" py="6" px="4" pr="6" {...rest}>
            <Box>
                {tree.children.map((x, i) => (
                    <NavTreeComponent
                        hideDivider
                        key={i + "" + (x.path || x.title)}
                        activeRoute={router.pathname}
                        {...x}
                    />
                ))}
            </Box>
        </Box>
    );
};

const NavTreeComponent = ({
    name = "",
    children,
    depth = 0,
    hideDivider = false,
    url = "",
    title = "",
    meta = {},
    activeRoute,
    parentDefaultOpened,
}: DirectoryTree & { depth?: number; hideDivider?: boolean; activeRoute: string; parentDefaultOpened?: boolean }) => {
    const isFolder = !url;
    const formattedTitle = meta.sidebar_label || meta.title || title || formatTitle(name || "");
    const subTree = children?.map((x, i) => {
        return (
            <NavTreeComponent
                key={i + "" + (x.path || x.title)}
                {...x}
                depth={depth + 1}
                activeRoute={activeRoute}
                parentDefaultOpened={meta.childrenDefaultOpened}
            />
        );
    });

    function findActiveRouteRecursive(children: DirectoryTree[]) {
        return !!children.find(
            (tree) => tree.url === activeRoute || (tree.children ? findActiveRouteRecursive(tree.children) : false)
        );
    }

    // Sub folders
    if (isFolder && depth > 0) {
        const isRouteActive = findActiveRouteRecursive(children);
        // If folder.meta.defaultOpened = false OR if a parent folder.meta.childrenDefaultOpened = false
        // Then collapse children initially
        const defaultOpened =
            meta.defaultOpened === false || parentDefaultOpened === false ? false : isRouteActive || depth < 2;
        return (
            <CollapsableTreeNode
                depth={depth}
                title={formattedTitle}
                subTree={subTree}
                isActive={isRouteActive}
                defaultOpened={defaultOpened || isRouteActive}
            />
        );
    }

    // Root folders
    if (isFolder) {
        return (
            <Stack spacing="0px">
                <Box my="0.2em">
                    {!hideDivider && <Divider />}
                    <Box py="0.2em" pt="1.4em" my="0.2em" fontSize="1.1em" fontWeight="semibold">
                        {formattedTitle}
                    </Box>
                </Box>
                {subTree}
            </Stack>
        );
    }
    return (
        <Stack spacing="0px">
            <ComponentLink opacity={0.8} py="0.2em" my="0.2em" href={url} isTruncated>
                {formattedTitle}
            </ComponentLink>
            {subTree}
        </Stack>
    );
};

function CollapsableTreeNode({ title, depth, subTree, isActive, defaultOpened }) {
    const { onToggle, isOpen } = useDisclosure(defaultOpened);

    return (
        <Stack spacing="0px">
            <Box
                display="flex"
                alignItems="center"
                cursor="pointer"
                onClick={onToggle}
                py="0.2em"
                my="0.2em"
                textDecoration={isActive && "underline"}
            >
                <Box
                    mr="0.4em"
                    size="0.6em"
                    opacity={0.6}
                    display="inline-block"
                    as={isOpen ? CollapseDown : CollapseRight}
                />
                {title}
            </Box>
            <Collapse isOpen={isOpen} pl={depth * 20 + "px"} position="relative">
                <Box
                    position="absolute"
                    left="5px"
                    height="100%"
                    border="1px solid"
                    borderColor="gray.400"
                    opacity={0.1}
                />
                {subTree}
            </Collapse>
        </Stack>
    );
}
