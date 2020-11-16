import { Box, BoxProps, Collapse, Flex, Link, Stack, Switch, Text, useClipboard, useColorMode } from "@chakra-ui/react";
import rangeParser from "parse-numeric-range";
import Highlight, { Language, defaultProps } from "prism-react-renderer";
import { ReactNode, useEffect, useRef, useState } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";

import { useLayoutConfig } from "@/components/layout/LayoutProvider";

const langRegex = /language-/;
export const Code = ({ children, className, metastring, preProps }: CodeProps) => {
    const metas = extractMeta<CodePropsMetaString>(metastring || "");
    const { topLeft, bottomLeft, bottomRight, collapsable, hidden, slug, withoutLang } = metas;

    const hasBottomTxt = bottomLeft || bottomRight;
    const language = className?.replace(langRegex, "") as Language;

    const [isOpen, setIsOpened] = useState(!hidden);
    const toggle = () => setIsOpened(!isOpen);

    const index = useRef(getIndex());
    const identifier = `code-${slug || index.current}` + (withoutLang ? "" : `-${language}`);

    useEffect(() => {
        // Only increment code count on first render & if no custom slug used
        if (!slug && getIndex() === index.current) {
            increment();
        }
    }, []);

    // console.log({rest, live})
    const { colorMode } = useColorMode();
    let { prismTheme } = useLayoutConfig();

    const code = typeof children === "string" ? children.trim() : "";
    const { onCopy, hasCopied } = useClipboard(code);

    const shouldHighlightLine = calculateLinesToHighlight(metastring);
    const lineCount = code.split("\n").length;
    const isShort = lineCount <= 5 && !metas.notMinimal;
    const isMinimal = language === "json" || metas.minimal;

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
            <Box position="relative" mb={isShort && "10px"}>
                <Highlight {...defaultProps} theme={prismTheme[colorMode]} code={code} language={language}>
                    {({ className, style, tokens, getLineProps, getTokenProps }) => (
                        <Box
                            p={!isShort && !isMinimal ? "20px" : "10px"}
                            paddingTop={collapsable ? "30px" : topLeft && "25px"}
                            paddingBottom={hasBottomTxt && "30px"}
                            borderRadius="8px"
                            as="pre"
                            fontSize="0.85em"
                            className={"codeContainer " + className}
                            style={{ ...style }}
                            shadow="sm"
                            overflowX="auto"
                            {...preProps}
                        >
                            <Collapse in={isOpen} startingHeight={100} style={{ overflow: "auto" }}>
                                <Stack
                                    spacing={2}
                                    direction="row"
                                    alignItems="center"
                                    position="absolute"
                                    top={!isShort ? "8px" : "-20px"}
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
                                        id={`${identifier}-line-${i + 1}`}
                                    >
                                        <Link
                                            display="inline-block"
                                            textAlign="right"
                                            w={!isShort ? "40px" : "20px"}
                                            opacity={0.4}
                                            pr={!isShort ? "30px" : "15px"}
                                            aria-label="anchor"
                                            as="a"
                                            href={`#${identifier}-line-${i + 1}`}
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
                        </Box>
                    )}
                </Highlight>
            </Box>
            {topLeft && (
                <Box opacity={0.7} fontSize="0.8em" position="absolute" left="10px" top="5px">
                    {topLeft}
                </Box>
            )}
            {bottomLeft && (
                <Box opacity={0.8} fontSize="0.9em" position="absolute" left="10px" bottom="5px">
                    {bottomLeft}
                </Box>
            )}
            {bottomRight && (
                <Box opacity={0.6} fontSize="0.7em" position="absolute" right="10px" bottom="8px">
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
};

export type CodeProps = {
    className: string;
    children: ReactNode;
    metastring?: string;
    preProps?: BoxProps;
};

export type CodePropsMetaString = {
    topLeft?: string;
    bottomLeft?: string;
    bottomRight?: string;
    collapsable?: boolean;
    hidden?: boolean;
    left?: boolean;
    slug?: string;
    withoutLang?: boolean;
    minimal?: boolean;
    notMinimal?: boolean;
};

export function extractMeta<T = Record<string, string>>(string: string): Partial<T> {
    const metas = {} as Partial<T>;
    const current = { key: "", value: "" };
    let isProcessingKey = true;
    let isProcessingValue = false;

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

export const CopyButton = ({ hasCopied }: { hasCopied: boolean } & BoxProps) => {
    return (
        <Box
            cursor="pointer"
            m="0"
            style={{
                strokeWidth: "2px",
            }}
            opacity={0.7}
            size="1em"
            as={hasCopied ? FiCheck : FiCopy}
        />
    );
};

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

let current = 0;
const getIndex = () => current;
const increment = () => current++;
export const resetCodeBlockCount = () => (current = 0);
