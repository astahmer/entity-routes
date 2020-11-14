import { useContext } from "react";
import NextLink from "next/link";

import { Box, Flex, Icon, Stack } from "@chakra-ui/react";
import { css } from "@emotion/react";

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
    const arrow = <Box transform={type === "next" ? "none" : "scale(-1, 1)"} width="1.2em" height="1.2em" as={Arrow} />;
    return (
        <NextLink href={href} passHref>
            <Stack
                spacing="2"
                align={type === "next" ? "flex-end" : "flex-start"}
                shadow="sm"
                borderWidth="1px"
                borderRadius="md"
                padding="1rem 1.5rem"
                as="a"
                fontWeight="medium"
                transition="box-shadow 0.3s"
                _hover={{ boxShadow: "0 0 20px rgba(0, 0, 0, 0.1)" }}
                {...rest}
            >
                <Stack direction="row" align="center" spacing="2" opacity={0.4}>
                    {type === "prev" && arrow}
                    <Box fontWeight="600">{type === "next" ? "Next" : "Prev"}</Box>
                    {type === "next" && arrow}
                </Stack>
                <Box isTruncated>{title}</Box>
            </Stack>
        </NextLink>
    );
};
