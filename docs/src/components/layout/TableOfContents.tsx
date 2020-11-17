import { Box, Flex, FlexProps, Link } from "@chakra-ui/react";

import { DirectoryTree } from "@/functions/sidebar";

import { LAYOUT_SIZES } from "./Wrapper";

// TODO TableOfContents Quick links (View source / See test file/folder), both from page meta

export type TableOfContentsProps = { items: TableOfContentItem[]; currentItem: DirectoryTree } & FlexProps;
export function TableOfContents({ items = [], currentItem, ...rest }: TableOfContentsProps) {
    const tocTitle =
        currentItem && !currentItem.meta.withoutH1
            ? { lvl: 1, slug: currentItem.meta.slug, title: currentItem.meta.title }
            : null;
    return (
        <Flex
            direction="column"
            pl="20px"
            width="200px"
            maxHeight={`calc(100vh - ${LAYOUT_SIZES.NAVBAR_H}px)`}
            overflowY="auto"
            lineHeight="2.2em"
            whiteSpace="nowrap"
            {...rest}
        >
            {tocTitle && <TocItem key={"toc-title"} {...tocTitle} />}
            {items.map((item) => (
                <TocItem key={item.slug} {...item} />
            ))}
        </Flex>
    );
}

export type TableOfContentItem = {
    lvl: number;
    slug: string;
    title: string;
};

const baseW = 20;
function TocItem({ lvl, title, slug }: TableOfContentItem) {
    return (
        <Box ml={baseW * (lvl - 2) + "px"}>
            <Link href={"#" + slug}>{title}</Link>
        </Box>
    );
}
