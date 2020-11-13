import { DirectoryTree } from "@/functions/sidebar";
import { Flex, Box, Link, FlexProps } from "@chakra-ui/core";

// TODO TableOfContents Quick links (View source / See test file/folder), both from page meta
const NAVBAR_H = 62;

export type TableOfContentsProps = { items: TableOfContentItem[]; currentItem: DirectoryTree } & FlexProps;
export function TableOfContents({ items = [], currentItem, ...rest }: TableOfContentsProps) {
    const tocTitle = { lvl: 1, slug: currentItem.meta.slug, content: currentItem.meta.title };
    return (
        <Flex
            direction="column"
            pl="20px"
            width="200px"
            maxHeight={`calc(100vh - ${NAVBAR_H}px)`}
            overflowY="auto"
            lineHeight="2.2em"
            whiteSpace="nowrap"
            {...rest}
        >
            <TocItem key={"toc-title"} {...tocTitle} />
            {items.map((item) => (
                <TocItem key={item.slug} {...item} />
            ))}
        </Flex>
    );
}

export type TableOfContentItem = {
    lvl: number;
    slug: string;
    content: string;
};

const baseW = 20;
function TocItem({ lvl, content, slug }: TableOfContentItem) {
    return (
        <Box ml={baseW * (lvl - 2) + "px"}>
            <Link href={"#" + slug}>{content}</Link>
        </Box>
    );
}
