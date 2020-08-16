import { useDokzConfig } from "dokz";
import { ReactNode, useState } from "react";
import { Box, Collapse, Switch, Flex, Text, useColorMode, useClipboard, BoxProps } from "@chakra-ui/core";
import { CopyButton } from "dokz/dist/components/Code";
import Highlight, { defaultProps } from "prism-react-renderer";

export type CodeProps = {
    className: string;
    children: ReactNode;
    title?: string;
    collapsable?: boolean;
    preProps?: BoxProps;
};
export function Code({ title, collapsable, ...props }: CodeProps) {
    const [isOpen, setIsOpened] = useState(true);
    const toggle = () => setIsOpened(!isOpen);

    return (
        <Box position="relative">
            <DokzCode
                {...props}
                isOpen={isOpen}
                preProps={{ paddingTop: collapsable && "30px", paddingBottom: title && "25px" }}
            />
            {title && (
                <Box
                    className="dokz hiddenInPrint"
                    opacity={0.6}
                    fontSize="0.7em"
                    position="absolute"
                    right="10px"
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
export const DokzCode = ({ children, className, isOpen, preProps, ...rest }) => {
    // console.log({rest, live})
    const { colorMode } = useColorMode();
    let { prismTheme } = useDokzConfig();

    const code = typeof children === "string" ? children.trim() : "";
    const language = className && className.replace(/language-/, "");
    const { onCopy, hasCopied } = useClipboard(code);

    return (
        <Box position="relative">
            <Highlight {...defaultProps} theme={prismTheme[colorMode]} code={code} language={language}>
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                    <Collapse
                        p="20px"
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
                        <Box
                            className="dokz hiddenInPrint"
                            opacity={0.6}
                            fontSize="0.9em"
                            position="absolute"
                            right="40px"
                            top="8px"
                        >
                            {language}
                        </Box>
                        <CopyButton
                            className="dokz hiddenInPrint"
                            onClick={onCopy}
                            hasCopied={hasCopied}
                            position="absolute"
                            top="10px"
                            right="10px"
                        />
                        {tokens.map((line, i) => (
                            <div key={i} {...getLineProps({ line, key: i })}>
                                <Box
                                    display="inline-block"
                                    // position='absolute'
                                    textAlign="right"
                                    minW="40px"
                                    opacity={0.4}
                                    pr="30px"
                                >
                                    {i + 1}
                                </Box>
                                {line.map((token, key) => (
                                    <span key={key} {...getTokenProps({ token, key })} />
                                ))}
                            </div>
                        ))}
                    </Collapse>
                )}
            </Highlight>
        </Box>
    );
};
