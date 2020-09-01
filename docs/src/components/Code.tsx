import { useDokzConfig } from "dokz";
import { ReactNode, useState } from "react";
import { Box, Collapse, Switch, Flex, Text, useColorMode, useClipboard, BoxProps, Stack } from "@chakra-ui/core";
import { CopyButton } from "dokz/dist/components/Code";
import Highlight, { defaultProps } from "prism-react-renderer";
import rangeParser from "parse-numeric-range";

export type CodeProps = {
    className: string;
    children: ReactNode;
    metastring?: string;
    preProps?: BoxProps;
};

export type CodePropsMetaString = {
    title?: string;
    collapsable?: boolean;
    hidden?: boolean;
    left?: boolean;
};

export function Code(props: CodeProps) {
    const metas = extractMeta<CodePropsMetaString>(props.metastring || "");
    const { title, left, collapsable, hidden } = metas;

    const [isOpen, setIsOpened] = useState(!hidden);
    const toggle = () => setIsOpened(!isOpen);

    return (
        <Box position="relative">
            <DokzCode
                {...metas}
                {...props}
                isOpen={isOpen}
                preProps={{ paddingTop: collapsable && "30px", paddingBottom: title && "30px" }}
            />
            {title && (
                <Box
                    className="dokz hiddenInPrint"
                    opacity={0.6}
                    fontSize="0.7em"
                    position="absolute"
                    {...{ [isOpen && left ? "left" : "right"]: "10px" }}
                    bottom="8px"
                >
                    {title}
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
    const isMinimal = lineCount <= 5;

    return (
        <Box position="relative" mb={isMinimal && "10px"}>
            <Highlight {...defaultProps} theme={prismTheme[colorMode]} code={code} language={language}>
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                    <Collapse
                        p={!isMinimal ? "25px" : "10px"}
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
                            top={!isMinimal && "8px"}
                            bottom={isMinimal && "-20px"}
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
                            >
                                <Box
                                    display="inline-block"
                                    // position='absolute'
                                    textAlign="right"
                                    minW={!isMinimal ? "40px" : "20px"}
                                    opacity={0.4}
                                    pr={!isMinimal ? "30px" : "15px"}
                                >
                                    {i + 1}
                                </Box>
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
