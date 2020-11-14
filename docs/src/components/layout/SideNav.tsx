import { Box, BoxProps, Collapse, Divider, Flex, useDisclosure } from "@chakra-ui/react";

import { useRouter } from "next/router";
import { DirectoryTree, MDX_EXTENSION_REGEX } from "@/functions/sidebar";
import { ComponentLink } from "./NavLink";
import { CollapseDown, CollapseRight } from "./icons";

export const SideNav = ({ tree, ...rest }: { tree: DirectoryTree } & BoxProps) => {
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
                        key={i + "" + (x.path || x.url)}
                        activeRoute={router.pathname}
                        {...x}
                    />
                ))}
            </Box>
        </Box>
    );
};

const formatTitle = (name: string) =>
    capitalizeFirstLetter(name.replace(/_/g, " ").replace(/-/g, " ").replace(MDX_EXTENSION_REGEX, ""));
const capitalizeFirstLetter = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const NavTreeComponent = ({
    name = "",
    children,
    depth = 0,
    hideDivider = false,
    url = "",
    meta = {},
    activeRoute,
    parentDefaultOpened,
}: DirectoryTree & { depth?: number; hideDivider?: boolean; activeRoute: string; parentDefaultOpened?: boolean }) => {
    const isFolder = !url;
    const formattedTitle = meta.sidebar_label || meta.title || formatTitle(name);
    const subTree = children?.map((x, i) => {
        return (
            <NavTreeComponent
                key={i + "" + (x.path || x.url)}
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
        // Then collapse (close) children initially
        const defaultClosed = meta.defaultOpened === false || parentDefaultOpened === false;
        // TODO localStorage
        const defaultOpened = defaultClosed ? false : isRouteActive;
        return (
            <CollapsableTreeNode
                depth={depth}
                title={formattedTitle}
                subTree={subTree}
                isActive={isRouteActive}
                defaultIsOpen={defaultOpened}
            />
        );
    }

    // Root folders
    if (isFolder) {
        return (
            <Flex direction="column">
                <Box my="0.2em">
                    {!hideDivider && <Divider />}
                    <Box py="0.2em" pt="1.4em" my="0.2em" fontSize="1.1em" fontWeight="semibold">
                        {formattedTitle}
                    </Box>
                </Box>
                {subTree}
            </Flex>
        );
    }
    return (
        <Flex direction="column">
            <ComponentLink opacity={0.8} py="0.2em" my="0.2em" href={url} isTruncated>
                {formattedTitle}
            </ComponentLink>
            {subTree}
        </Flex>
    );
};

function CollapsableTreeNode({ title, depth, subTree, isActive, defaultIsOpen }) {
    const { onToggle, isOpen } = useDisclosure({ defaultIsOpen });

    return (
        <Flex direction="column">
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
                    width="0.6em"
                    height="0.6em"
                    opacity={0.6}
                    display="inline-block"
                    as={isOpen ? CollapseDown : CollapseRight}
                />
                {title}
            </Box>
            <Box>
                <Collapse in={isOpen} startingHeight={1}>
                    <Box pl={depth * 20 + "px"} position="relative">
                        <Box
                            position="absolute"
                            left="5px"
                            height="100%"
                            border="1px solid"
                            borderColor="gray.400"
                            opacity={0.1}
                        />
                        {subTree}
                    </Box>
                </Collapse>
            </Box>
        </Flex>
    );
}
