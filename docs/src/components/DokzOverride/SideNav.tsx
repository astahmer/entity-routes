import React, { useEffect } from "react";
import { useStorageState } from "react-storage-hooks";

import { Box, Collapse, Divider, Stack, useDisclosure } from "@chakra-ui/core";
import { DirectoryTree, formatTitle } from "dokz/dist/components/support";
import { SideNavProps as DokzSideNavProps } from "dokz/dist/components/SideNav";

import { CollapseDown } from "./CollapseDown";
import { CollapseRight } from "./CollapseRight";
import { ComponentLink } from "dokz/dist/components/NavLink";

// Modified version of SideNav taken from source directly at
// https://github.com/remorses/dokz/blob/61f9ddbbc923c2b287de86f8ec6e482b8afd4846/dokz/src/components/SideNav.tsx
type SideNavProps = DokzSideNavProps & { orderingFn?: Function };
export const SideNav = ({ tree, orderingFn, ...rest }: SideNavProps) => {
    if (!tree) {
        console.error(new Error(`sidenav tree is null`));
        tree = { name: "", children: [] };
    }

    return (
        <Box overflowY="auto" as="nav" aria-label="Main navigation" py="6" px="4" pr="6" {...rest}>
            <Box>
                {tree.children.map((x) => (
                    <NavTreeComponent hideDivider key={x.path || x.title} {...x} />
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
}: DirectoryTree & { depth?: number; hideDivider?: boolean }) => {
    const isFolder = !url;
    const formattedTitle = meta ? meta.sidebar_label || meta.title : title || formatTitle(name || "");
    const subTree =
        children &&
        children.map((x) => {
            return <NavTreeComponent key={x.path || x.title} {...x} depth={depth + 1} />;
        });
    if (isFolder && depth > 0) {
        return <CollapsableTreeNode path={path} depth={depth} title={formattedTitle} subTree={subTree} />;
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

// TODO Update chakra-ui to hopefully fix collapse initial value
function CollapsableTreeNode({ title, path, depth, subTree }) {
    const key = "sidenav-state-" + path;
    const [active, setActive] = useStorageState(typeof window === "undefined" ? null : localStorage, key, "");
    const { onToggle, isOpen } = useDisclosure(!!active);
    useEffect(() => {
        setActive(isOpen ? "true" : null);
    }, [isOpen]);
    return (
        <Stack spacing="0px">
            <Box display="flex" alignItems="center" cursor="pointer" onClick={onToggle} py="0.2em" my="0.2em">
                <Box
                    mr="0.4em"
                    size="0.6em"
                    opacity={0.6}
                    display="inline-block"
                    as={isOpen ? CollapseDown : CollapseRight}
                />
                {title}
            </Box>
            <Collapse isOpen={isOpen} pl={depth * 20 + "px"}>
                {subTree}
            </Collapse>
        </Stack>
    );
}
