/** @jsx jsx */
import { jsx } from "@emotion/core";
import { useDokzConfig } from "dokz";
import { ReactNode, useState, useRef } from "react";
import { Box, Collapse, Switch, Flex, Text, useColorMode, useClipboard, BoxProps, Stack, Link } from "@chakra-ui/core";
import { CopyButton } from "dokz/dist/components/Code";
import Highlight, { defaultProps } from "prism-react-renderer";
import rangeParser from "parse-numeric-range";
import { getIndex, increment } from "@/functions/codeBlocks";

export type CodeProps = {
    className: string;
    children: ReactNode;
    metastring?: string;
    preProps?: BoxProps;
};

export type CodePropsMetaString = {
    title?: string;
    bottomLeft?: string;
    bottomRight?: string;
    collapsable?: boolean;
    hidden?: boolean;
    left?: boolean;
    slug?: string;
    withoutLang?: boolean;
};

export function Code(props: CodeProps) {
    const metas = extractMeta<CodePropsMetaString>(props.metastring || "");
    const { title, bottomLeft, bottomRight, collapsable, hidden, slug, withoutLang } = metas;
    const hasBottomTxt = bottomLeft || bottomRight;
    const language = props.className?.replace(langRegex, "");

    const [isOpen, setIsOpened] = useState(!hidden);
    const toggle = () => setIsOpened(!isOpen);

    const index = useRef(getIndex());
    const identifier = `code-${slug || index.current}` + (withoutLang ? "" : `-${language}`);

    // Only increment code count on first render (not in useEffect so that it works in SSR) and if no custom slug used
    if (!slug && getIndex() === index.current) {
        increment();
    }

    return (
        <Box position="relative" id={identifier} css={{ "&:hover a": { opacity: 1 } }}>
            <Link
                position="absolute"
                left="-20px"
                aria-label="anchor"
                as="a"
                color="gray.500"
                fontWeight="normal"
                outline="none"
                _focus={{ opacity: 1, boxShadow: "outline" }}
                opacity={0}
                ml="0.375rem"
                href={`#${identifier}`}
            >
                #
            </Link>
            <DokzCode
                {...metas}
                {...props}
                isOpen={isOpen}
                preProps={{ paddingTop: collapsable ? "30px" : title && "25px", paddingBottom: hasBottomTxt && "30px" }}
                codeBlockIdentifier={identifier}
            />
            {title && (
                <Box
                    className="dokz hiddenInPrint"
                    opacity={0.7}
                    fontSize="0.8em"
                    position="absolute"
                    left="10px"
                    top="5px"
                >
                    {title}
                </Box>
            )}
            {bottomLeft && (
                <Box
                    className="dokz hiddenInPrint"
                    opacity={0.8}
                    fontSize="0.9em"
                    position="absolute"
                    left="10px"
                    bottom="5px"
                >
                    {bottomLeft}
                </Box>
            )}
            {bottomRight && (
                <Box
                    className="dokz hiddenInPrint"
                    opacity={0.6}
                    fontSize="0.7em"
                    position="absolute"
                    right="10px"
                    bottom="8px"
                >
                    {bottomRight}
                </Box>
            )}
            {collapsable && (
                <Flex position="absolute" left="8px" top="4px" alignItems="center" opacity={0.6}>
                    <Switch size="sm" mr="1em" onChange={toggle} />
                    <Text fontSize="sm">{isOpen ? "Minimize" : "Show more"}</Text>
                </Flex>
            )}
        </Box>
    );
}

// Directly taken from https://github.com/remorses/dokz/blob/375f3ab217/dokz/src/components/Code.tsx
// Replaced codeblock Box with Collapse & pass isOpen/startingHeight
const langRegex = /language-/;
export const DokzCode = ({ children, className, isOpen, preProps, ...rest }) => {
    // console.log({rest, live})
    const { colorMode } = useColorMode();
    let { prismTheme } = useDokzConfig();

    const code = typeof children === "string" ? children.trim() : "";
    const language = className && className.replace(langRegex, "");
    const { onCopy, hasCopied } = useClipboard(code);

    const shouldHighlightLine = calculateLinesToHighlight(rest.metastring);
    const lineCount = code.split("\n").length;
    const isShort = lineCount <= 5;
    const isMinimal = language === "json" || rest.minimal;

    return (
        <Box position="relative" mb={isShort && "10px"}>
            <Highlight {...defaultProps} theme={prismTheme[colorMode]} code={code} language={language}>
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                    <Collapse
                        p={!isShort && !isMinimal ? "25px" : "10px"}
                        // pt='30px'
                        borderRadius="8px"
                        as="pre"
                        fontSize="0.9em"
                        className={"dokz codeContainer " + className}
                        style={{ ...style }}
                        // boxShadow='0 0 10px 20px rgba(0,0,0,0.01)'
                        shadow="sm"
                        overflowX="auto"
                        {...preProps}
                        isOpen={isOpen}
                        startingHeight={100}
                    >
                        <Stack
                            spacing={2}
                            direction="row"
                            alignItems="center"
                            className="dokz hiddenInPrint"
                            position="absolute"
                            top={!isShort && "8px"}
                            bottom={isShort && "-20px"}
                            right="10px"
                        >
                            <Box opacity={0.6} fontSize="0.9em">
                                {language}
                            </Box>
                            <CopyButton onClick={onCopy} hasCopied={hasCopied} />
                        </Stack>
                        {tokens.map((line, i) => (
                            <Box
                                key={i}
                                {...getLineProps({ line, key: i })}
                                bg={shouldHighlightLine(i) && "gray.600"}
                                width="fit-content"
                                id={`${rest.codeBlockIdentifier}-line-${i + 1}`}
                            >
                                <Link
                                    display="inline-block"
                                    // position='absolute'
                                    textAlign="right"
                                    minW={!isShort ? "40px" : "20px"}
                                    opacity={0.4}
                                    pr={!isShort ? "30px" : "15px"}
                                    aria-label="anchor"
                                    as="a"
                                    href={`#${rest.codeBlockIdentifier}-line-${i + 1}`}
                                    userSelect="none"
                                >
                                    {i + 1}
                                </Link>
                                {line.map((token, key) => (
                                    <span key={key} {...getTokenProps({ token, key })} />
                                ))}
                            </Box>
                        ))}
                    </Collapse>
                )}
            </Highlight>
        </Box>
    );
};

export function extractMeta<T = Record<string, string>>(string: string): Partial<T> {
    const metas = {} as Partial<T>;
    const current = { key: "", value: "" };
    let isProcessingKey = true;
    let isProcessingValue = false;

    // ="Every entity should extend this interface" chiasse="abc" pisse oui="abc"
    const setNewMetaKey = () => {
        metas[current.key] = "";
        isProcessingKey = false;
    };

    const startValue = () => (isProcessingValue = true);

    const endValue = () => {
        metas[current.key] = current.value;
        isProcessingValue = false;
    };

    const setMetaValue = () => {
        metas[current.key] = current.value || true; // Key without value will be interpreted as true
        current.key = "";
        current.value = "";
    };

    const addCharacter = (char, objKey) => (current[objKey] += char);

    for (let i = 0; i < string.length; i++) {
        switch (string[i]) {
            case "=":
                setNewMetaKey();
                break;

            case '"':
                isProcessingValue ? endValue() : startValue();
                break;

            case " ":
                if (isProcessingValue) addCharacter(string[i], "value");
                else setMetaValue();
                break;

            default:
                // If not processing key or value (last value was a quote or equal character)
                if (!isProcessingKey && !isProcessingValue) {
                    isProcessingKey = true;
                    current.key = "";
                }

                if (isProcessingKey) addCharacter(string[i], "key");
                else if (isProcessingValue) {
                    addCharacter(string[i], "value");
                }
                break;
        }
    }

    // If ending on a key char (key without value) or a quoteChar (value with multiple words)
    ((current.key && isProcessingKey) || isProcessingValue) && setMetaValue();

    return metas;
}

// Taken from https://prince.dev/highlight-with-react
const RE = /{([\d,-]+)}/;
export const calculateLinesToHighlight = (meta) => {
    if (RE.test(meta)) {
        const strlineNumbers = RE.exec(meta)[1];
        const lineNumbers = rangeParser(strlineNumbers);
        return (index) => lineNumbers.includes(index + 1);
    } else {
        return () => false;
    }
};
