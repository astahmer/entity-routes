import { AddIcon, MinusIcon } from "@chakra-ui/icons";
import { Box, BoxProps } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { PropsWithChildren, ReactNode } from "react";

import { DirectoryTree, MDX_EXTENSION_REGEX, SidebarMergedMeta, findActiveRouteRecursive } from "@/functions/sidebar";

import { CollapsableTree, RenderTitleProps } from "./CollapsableTree";
import { CollapseDown, CollapseRight } from "./icons";
import { SideNavLink } from "./SideNavLink";

export const SideNav = ({ tree, ...rest }: { tree: DirectoryTree } & BoxProps) => {
    const router = useRouter();

    return (
        <Box as="aside" aria-label="Main navigation" overflowY="auto" py="6" px="4" pr="6" lineHeight="1.4em" {...rest}>
            {tree.children.map(({ children: childTree, ...dirTree }, i) => (
                <NavTreeComponent
                    key={i + "" + (dirTree.path || dirTree.url)}
                    depth={0}
                    activeRoute={router.pathname}
                    childTree={childTree}
                    {...dirTree}
                />
            ))}
        </Box>
    );
};

export const formatTitle = (name: string) =>
    capitalizeFirstLetter(name.replace(/_/g, " ").replace(/-/g, " ").replace(MDX_EXTENSION_REGEX, ""));
export const capitalizeFirstLetter = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export type NavTreeComponentBaseProps = {
    meta?: SidebarMergedMeta;
    depth: number;
    activeRoute: string;
    parentDefaultOpened?: boolean;
};
export type NavTreeComponentProps = Pick<DirectoryTree, "name" | "url"> & {
    childTree: DirectoryTree["children"];
} & NavTreeComponentBaseProps;

const NavTreeComponent = ({
    name = "",
    depth = 0,
    url = "",
    meta = {},
    childTree,
    activeRoute,
    parentDefaultOpened,
}: NavTreeComponentProps) => {
    const title = meta.sidebar_label || meta.title || formatTitle(name);

    // Folder
    if (!url) {
        const props = { childTree, activeRoute, meta, depth, title, parentDefaultOpened };
        return (
            <SideNavFolder {...props}>
                {childTree?.map(({ children: childTree, ...dirTree }, i) => {
                    return (
                        <NavTreeComponent
                            key={i + "" + (dirTree.path || dirTree.url)}
                            childTree={childTree}
                            {...dirTree}
                            depth={depth + 1}
                            activeRoute={activeRoute}
                            parentDefaultOpened={meta.childrenDefaultOpened}
                        />
                    );
                })}
            </SideNavFolder>
        );
    }

    return (
        <SideNavLink opacity={0.8} py="0.2em" my="0.2em" href={url} isTruncated>
            {title}
        </SideNavLink>
    );
};

export type SideNavFolderProps = PropsWithChildren<NavTreeComponentBaseProps> &
    Pick<NavTreeComponentProps, "childTree" | "meta"> &
    PropsWithChildren<{
        title: string;
        depth: NavTreeComponentBaseProps["depth"];
        renderTitle?: (props: RenderTitleProps) => ReactNode;
    }>;

export const SideNavFolder = ({
    children,
    title,
    depth,
    meta,
    childTree,
    activeRoute,
    parentDefaultOpened,
    ...props
}) => {
    const isActive = findActiveRouteRecursive(activeRoute, childTree);
    const isCollapsable = depth === 0 ? meta.collapsable : true;
    // If folder.meta.defaultOpened = false OR if a parent folder.meta.childrenDefaultOpened = false
    // Then collapse (close) children initially
    const defaultClosed = meta.defaultOpened === false || parentDefaultOpened === false;
    const defaultIsOpen = isCollapsable ? isActive || (depth === 0 ? !defaultClosed : false) : true;

    const collapsableTreeProps = { title, depth, defaultIsOpen, ...props };

    return (
        <CollapsableTree
            {...collapsableTreeProps}
            renderTitle={(titleProps) => <FolderTitle {...{ ...titleProps, isActive, isCollapsable }} />}
        >
            {children}
        </CollapsableTree>
    );
};

export const folderIcons = {
    root: { open: MinusIcon, close: AddIcon },
    sub: { open: CollapseDown, close: CollapseRight },
};

export type FolderTitleProps = { isActive: boolean; isCollapsable?: boolean } & RenderTitleProps;
export const FolderTitle = ({ title, isActive, isCollapsable, onToggle, isOpen, depth }: FolderTitleProps) => {
    const isRootFolder = depth === 0;
    const icons = depth === 0 ? folderIcons.root : folderIcons.sub;

    return (
        <Box
            display="flex"
            alignItems="center"
            py="0.2em"
            my={"0.2em"}
            mt={isRootFolder && "0.5em"}
            cursor={isCollapsable && "pointer"}
            onClick={isCollapsable && onToggle}
            textDecoration={!isRootFolder && isActive && "underline"}
            fontSize={isRootFolder && "1.2em"}
            fontWeight={isRootFolder && "semibold"}
        >
            {isCollapsable && (
                <Box
                    mr="0.4em"
                    width="0.5em"
                    height="0.5em"
                    opacity={0.6}
                    display="inline-block"
                    as={isOpen ? icons.open : icons.close}
                />
            )}
            {title}
        </Box>
    );
};
