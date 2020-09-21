import React, { useEffect, useState } from "react";

import { Box, Collapse, Divider, Stack, useDisclosure } from "@chakra-ui/core";
import { DirectoryTree, formatTitle } from "dokz/dist/components/support";
import { SideNavProps as DokzSideNavProps } from "dokz/dist/components/SideNav";

import { CollapseDown } from "./CollapseDown";
import { CollapseRight } from "./CollapseRight";
import { ComponentLink } from "dokz/dist/components/NavLink";
import { useRouter } from "next/router";

// Modified version of SideNav taken from source directly at
// https://github.com/remorses/dokz/blob/61f9ddbbc923c2b287de86f8ec6e482b8afd4846/dokz/src/components/SideNav.tsx
type SideNavProps = DokzSideNavProps & { orderingFn?: Function };
export const SideNav = ({ tree, orderingFn, ...rest }: SideNavProps) => {
    const router = useRouter();

    if (!tree) {
        console.error(new Error(`sidenav tree is null`));
        tree = { name: "", children: [] };
    }

    return (
        <Box overflowY="auto" as="nav" aria-label="Main navigation" py="6" px="4" pr="6" {...rest}>
            <Box>
                {tree.children.map((x) => (
                    <NavTreeComponent hideDivider key={x.path || x.title} activeRoute={router.pathname} {...x} />
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
    path,
    meta,
    activeRoute,
}: DirectoryTree & { depth?: number; hideDivider?: boolean; activeRoute: string }) => {
    const isFolder = !url;
    const formattedTitle = meta ? meta.sidebar_label || meta.title : title || formatTitle(name || "");
    const subTree =
        children &&
        children.map((x) => {
            return <NavTreeComponent key={x.path || x.title} {...x} depth={depth + 1} activeRoute={activeRoute} />;
        });

    function findActiveRouteRecursive(children: DirectoryTree[]) {
        return !!children.find(
            (tree) => tree.url === activeRoute || (tree.children ? findActiveRouteRecursive(tree.children) : false)
        );
    }

    if (isFolder && depth > 0) {
        const isActive = findActiveRouteRecursive(children);
        return (
            <CollapsableTreeNode
                path={path}
                depth={depth}
                title={formattedTitle}
                subTree={subTree}
                isActive={isActive}
            />
        );
    }
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

function CollapsableTreeNode({ title, path, depth, subTree, isActive }) {
    const { onToggle, isOpen } = useDisclosure(isActive);

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
