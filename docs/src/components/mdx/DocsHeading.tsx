import { Box, Link as ChakraLink, Heading, useColorMode } from "@chakra-ui/react";

import { useLayoutConfig } from "@/components/layout/LayoutProvider";

export const DocsHeading = (props) => {
    const { headingColor } = useLayoutConfig();
    const { colorMode } = useColorMode();
    return (
        <Heading
            fontWeight="semibold"
            pt="0.6em"
            color={headingColor[colorMode]}
            css={{
                "&[id]": {
                    pointerEvents: "none",
                },
                "&[id]:before": {
                    display: "block",
                    height: " 6rem",
                    marginTop: "-6rem !important",
                    visibility: "hidden",
                    content: `""`,
                },
                "&[id]:hover a": { opacity: 1 },
            }}
            {...props}
        >
            <Box pointerEvents="auto">
                {props.children}
                {props.id && (
                    <ChakraLink
                        aria-label="anchor"
                        as="a"
                        color="gray.500"
                        fontWeight="normal"
                        outline="none"
                        _focus={{ opacity: 1, boxShadow: "outline" }}
                        opacity={0}
                        ml="0.375rem"
                        href={`#${props.id}`}
                    >
                        #
                    </ChakraLink>
                )}
            </Box>
        </Heading>
    );
};
