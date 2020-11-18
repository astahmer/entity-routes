import { Flex, FlexProps, Link } from "@chakra-ui/react";

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
            as="nav"
            aria-label="Table of Contents"
            direction="column"
            width={LAYOUT_SIZES.TABLE_OF_C_W}
            maxHeight={`calc(100vh - ${LAYOUT_SIZES.NAVBAR_H}px)`}
            overflowY="auto"
            whiteSpace="nowrap"
            lineHeight="2.2em"
            fontSize="0.9em"
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
        <Link
            ml={(lvl > 1 ? baseW * (lvl - 2) : 0) + "px"}
            href={"#" + slug}
            textOverflow="ellipsis"
            overflowX="hidden"
        >
            {title}
        </Link>
    );
}
