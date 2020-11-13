import { useContext } from "react";
import NextLink from "next/link";

import { Box, Flex, Stack } from "@chakra-ui/core";
import { css } from "@emotion/core";

import { WrapperContext } from "../Wrapper";
import { removeMdxExt } from "@/functions/sidebar";
import { Arrow } from "./icons";

export const FooterButtons = ({ ...rest }) => {
    const { next: nextTree, previous: prevTree } = useContext(WrapperContext);

    const [isPrevDir, isNextDir] = [prevTree?.children?.length, nextTree?.children?.length];
    const [prev, next] = [
        isPrevDir ? prevTree.children[prevTree.children.length - 1] : prevTree,
        isNextDir ? nextTree.children[0] : nextTree,
    ];
    const [prevTitle, nextTitle] = [removeMdxExt(prev?.meta?.title || ""), removeMdxExt(next?.meta?.title || "")];
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
