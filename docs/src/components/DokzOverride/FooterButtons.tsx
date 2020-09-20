import { useContext } from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";

import { Box, Flex, Stack } from "@chakra-ui/core";
import { css } from "@emotion/core";

import { DirectoryTree, formatTitle } from "dokz/dist/components/support";
import { Arrow } from "dokz/dist/components/icons";
import { WrapperContext } from "../Wrapper";

// https://github.com/remorses/dokz/blob/7c642491cfce83b5d9a17f486c7b954dae640299/dokz/src/components/FooterButtons.tsx
export const FooterButtons = ({ ...rest }) => {
    const router = useRouter();
    const pathname = router?.pathname || "";
    const { sidebarTree } = useContext(WrapperContext);
    const { next: nextTree, previous: prevTree } = findSubtreeInPathByUrl(sidebarTree, pathname) || {};

    const [isPrevDir, isNextDir] = [prevTree?.children?.length, nextTree?.children?.length];
    const [prev, next] = [isPrevDir ? prevTree.children[0] : prevTree, isNextDir ? nextTree.children[0] : nextTree];
    const [prevTitle, nextTitle] = [
        isPrevDir ? `${formatTitle(prevTree.name)}: ${prev.title}` : formatTitle(prev?.name || prev?.title),
        isNextDir ? `${formatTitle(nextTree.name)}: ${next.title}` : formatTitle(next?.name || next?.title),
    ];

    // TODO Update chakra-ui to 1.0
    // https://github.com/chakra-ui/chakra-ui/issues/798
    return (
        <Flex direction={["column", null, "row"]} justifyContent="space-between" {...rest}>
            {prev?.url ? (
                <Button title={prevTitle} type="prev" href={prev.url} w="100%" mr="1.5em" />
            ) : (
                <Box w="100%" />
            )}
            {next?.url ? <Button title={nextTitle} type="next" href={next.url} w="100%" /> : <Box w="100%" />}
        </Flex>
    );
};

const Button = ({ href = "", title, type, ...rest }) => {
    const arrow = <Box transform={type === "next" ? "none" : "scale(-1, 1)"} size="1.2em" as={Arrow} />;
    return (
        <NextLink href={href} passHref>
            <Stack
                align={type === "next" ? "flex-end" : "flex-start"}
                spacing="2"
                shadow="sm"
                borderWidth="1px"
                borderRadius="md"
                px="6"
                py="4"
                as="a"
                fontWeight="medium"
                transition="box-shadow 0.3s"
                css={css`
                    :hover {
                        box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
                    }
                `}
                {...rest}
            >
                <Stack direction="row" align="center" spacing="2" opacity={0.4}>
                    {type == "prev" && arrow}
                    <Box fontWeight="600">{type === "next" ? "Next" : "Prev"}</Box>
                    {type == "next" && arrow}
                </Stack>
                <Box isTruncated>{title}</Box>
            </Stack>
        </NextLink>
    );
};

export function findSubtreeInPathByUrl(
    tree: DirectoryTree,
    url: string,
    parent?: DirectoryTree,
    parentIndex?: number
): { current?: DirectoryTree; previous?: DirectoryTree; next?: DirectoryTree } {
    if (!tree?.children?.length) {
        return null;
    }
    for (let i = 0; i < tree.children.length; i++) {
        let child = tree.children[i];
        if (child.url === url) {
            // console.log({ child, tree, parent });
            return {
                previous: tree.children[i - 1] || parent?.children[parentIndex - 1],
                current: tree,
                next: tree.children[i + 1] || parent?.children[parentIndex + 1],
            };
        }
        let found = findSubtreeInPathByUrl(child, url, tree, i);
        if (found) {
            return found;
        }
    }
}
