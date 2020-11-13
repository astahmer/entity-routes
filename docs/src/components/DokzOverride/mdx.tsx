/** @jsx jsx */
import { Box, Callout, Divider, Heading, Kbd, Link as ChakraLink, useColorMode } from "@chakra-ui/core";
import { jsx } from "@emotion/core";
import { Children, cloneElement, isValidElement } from "react";
import { useLayoutConfig } from "../LayoutProvider";
import { Code } from "./Code";
import { Link } from "./Link";
import { DokzWrapper } from "./Wrapper";

const Pre = (props) => <Box as="pre" rounded="sm" {...props} />;

const Table = (props) => (
    <Box overflowX="auto">
        <Box as="table" textAlign="left" my="2em" width="full" {...props} />
    </Box>
);

const THead = (props) => {
    const { colorMode } = useColorMode();
    const bg = { light: "gray.50", dark: "whiteAlpha.100" };
    return <Box as="th" bg={bg[colorMode]} fontWeight="semibold" p={2} fontSize="sm" {...props} />;
};

const TData = (props) => (
    <Box as="td" p={2} borderTopWidth="1px" borderColor="inherit" fontSize="sm" whiteSpace="normal" {...props} />
);

export const DocsHeading = (props) => {
    const { headingColor } = useLayoutConfig();
    const { colorMode } = useColorMode();
    return (
        <Heading
            fontWeight="semibold"
            pt="0.6em"
            // color='black'
            color={headingColor[colorMode]}
            // mt='2.2em !important'
            // mb='10px !important'
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

const MdxText = (props) => <Box as="p" lineHeight="1.8em" {...props} />;

const CODE_FONT = `'Fira Code',SFMono-Regular,Menlo,Monaco,"Liberation Mono","Courier New",monospace,mono`;
const MDXComponents = {
    wrapper: DokzWrapper,
    h1: (props) => <DocsHeading as="h1" fontSize="2em" {...props} />,
    h2: (props) => <DocsHeading as="h2" fontSize="1.4em" {...props} />,
    h3: (props) => <DocsHeading as="h3" fontSize="1.2em" {...props} />,
    inlineCode: (props) => {
        const { colorMode } = useColorMode();
        return (
            <Box
                as="code"
                display="inline-block"
                fontFamily={CODE_FONT}
                fontSize="0.9em"
                px="0.2em !important"
                rounded="sm"
                bg={
                    {
                        light: "rgba(228, 235, 242, 0.6)",
                        dark: "rgba(106, 111, 117, 0.6)",
                    }[colorMode]
                }
                // color={{ light: '#264459', dark: 'white' }[colorMode]}
                lineHeight="normal"
                {...props}
            />
        );
    },
    code: (props) => <Code {...props} />,
    pre: Pre,
    kbd: Kbd,
    hr: (props) => <Divider my="3em !important" {...props} />,
    table: Table,
    th: THead,
    td: TData,
    a: Link,
    p: (props) => <MdxText as="p" {...props} />,
    ul: ({ children, isOdd, ...props }) => {
        return (
            <Box mt="0 !important" className="dokz" as="ul" pl="1em" {...props}>
                {Children.map(children, (child) => {
                    return cloneElement(child, { isOdd: !isOdd });
                })}
            </Box>
        );
    },
    ol: ({ children, isOdd, ...props }) => {
        return (
            <Box mt="0 !important" className="dokz" as="ol" pl="2em" {...props}>
                {Children.map(children, (child, number) => {
                    return cloneElement(child, {
                        isOdd: !isOdd,
                        isOrdered: true,
                    });
                })}
            </Box>
        );
    },
    li: ({ isOdd, isOrdered, children, ...props }) => {
        const { listItemIcon, listItemIconEmpty } = useLayoutConfig();
        const listIcon = isOrdered ? (
            <Box display="inline-block" />
        ) : (
            <Box
                mr="0.6em"
                ml="-1.6em"
                display="inline-block"
                size="1.1em"
                as={isOdd ? listItemIcon : listItemIconEmpty}
            />
        );
        return (
            <Box ml={(!isOrdered ? "1em" : "0") + " !important"} as="li" my="0.8em">
                {/* TODO use primary color to add some more style */}
                {listIcon}
                <Box as="p" display="inline" {...props}>
                    {Children.map(children, (child) => {
                        if (isValidElement(child)) {
                            return cloneElement<any>(child, {
                                isOdd,
                            });
                        }
                        return child;
                    })}
                </Box>
            </Box>
        );
    },
    blockquote: (props) => (
        <Callout
            shadow="sm"
            // mt='20px !important'
            variant="left-accent"
            status="warning"
            css={{ "> *:first-of-type": { marginTop: 0 } }}
            {...props}
        />
    ),
};

export default MDXComponents;
