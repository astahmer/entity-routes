/** @jsx jsx */
import { useColorMode, theme, Box, CSSReset, Stack, Flex, useTheme, ThemeProvider } from "@chakra-ui/core";
import { css, Global, jsx } from "@emotion/core";

import { useLayoutConfig } from "@/components/LayoutProvider";
import { SideNav } from "./SideNav";
import { PropsWithChildren, useContext } from "react";
import { WrapperContext } from "../Wrapper";
import { FooterButtons } from "./FooterButtons";
import NavBar from "./NavBar";
import { TableOfContents } from "./TableOfContents";
import { DirectoryTree } from "@/functions/sidebar";
import { useMemo } from "react";

const SIDENAV_W = 280;
const TABLE_OF_C_W = 200;
const NAVBAR_H = 62;

export function DokzWrapper({ children, currentItem }: PropsWithChildren<{ currentItem: DirectoryTree }>) {
    const {
        footer,
        headerLogo,
        headerItems,
        maxPageWidth,
        bodyColor,
        fontSize,
        fontWeight,
        fontFamily,
    } = useLayoutConfig();
    const { sidebarTree, tableOfContentsItems } = useContext(WrapperContext);
    const { colorMode } = useColorMode();
    return (
        <PropagatedThemeProvider theme={theme}>
            <CSSReset />
            <Global styles={globalStyles} />
            <Stack
                className="dokz noMarginInPrint"
                align="center"
                minHeight="100%"
                color={bodyColor[colorMode]}
                fontSize={fontSize}
                fontFamily={fontFamily}
                fontWeight={fontWeight}
            >
                <Box className="dokz" minHeight="100%" position="relative" w="100%" maxWidth={maxPageWidth}>
                    <NavBar
                        className="dokz"
                        logo={headerLogo}
                        items={headerItems}
                        tree={sidebarTree}
                        height={NAVBAR_H + "px"}
                        // maxW={PAGE_MAX_W}
                        position="fixed"
                        width="100%"
                        // mr='auto'
                        // top={0}
                        left={0}
                        right={0}
                    />
                    <SideNav
                        css={css`
                            -webkit-overflow-scrolling: touch;
                        `}
                        className="dokz"
                        alignSelf="flex-start"
                        position="fixed"
                        top={NAVBAR_H}
                        bottom={0}
                        fontSize="0.9em"
                        // fontWeight='500'
                        // left={0}
                        tree={sidebarTree}
                        // height='100%'
                        width={SIDENAV_W}
                        display={["none", null, "block"]}
                        overflowY="auto"
                        overflowX="hidden"
                    />
                    <Stack
                        direction="row"
                        minHeight="100%"
                        className="dokz noMarginInPrint"
                        align="stretch"
                        ml={["none", null, SIDENAV_W]}
                        // mr={['none', null, TABLE_OF_C_W + 30 + 'px']}
                        mt={[NAVBAR_H + "px"]}
                    >
                        <Stack
                            minHeight="100%"
                            className="dokz mainContent"
                            direction="column"
                            align="stretch"
                            overflow="auto"
                            px={["10px", null, "20px", "30px"]}
                            // spacing='10px'
                            flex="1"
                            minW="0"
                            borderRightWidth="1px"
                            borderLeftWidth="1px"
                        >
                            <Flex direction="column" align="stretch">
                                {children}
                                <FooterButtons className="dokz" mt="60px !important" mb="2em !important" width="100%" />
                                {footer}
                            </Flex>
                        </Stack>
                        <TableOfContents
                            className="dokz"
                            fontSize="0.9em"
                            // fontWeight='400'
                            position="sticky"
                            alignSelf="flex-start"
                            top={NAVBAR_H}
                            width={TABLE_OF_C_W + "px"}
                            // right={0}
                            ml="auto"
                            height="auto"
                            display={["none", null, null, null, "block"]}
                            pt="20px"
                            opacity={0.8}
                            currentItem={currentItem}
                            items={tableOfContentsItems}
                        />
                    </Stack>
                </Box>
            </Stack>
        </PropagatedThemeProvider>
    );
}

export function PropagatedThemeProvider({ theme, children }) {
    const existingTheme = useTheme();
    // console.log({ existingTheme: existingTheme.sizes })
    const merged = useMemo(() => ({ ...existingTheme, ...theme }), [theme, existingTheme]);
    return <ThemeProvider theme={merged}>{children}</ThemeProvider>;
}

export const globalStyles = css`
    * {
        box-sizing: border-box;
    }
    html {
        height: 100%;
    }
    #__next {
        min-height: 100%;
        overflow-x: hidden;
    }
    body {
        height: 100%;
        overflow: auto;
        scroll-behavior: smooth;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
    }
    ul.dokz {
        list-style-type: none;
    }
    .dokz.mainContent {
        -webkit-overflow-scrolling: touch;
    }
`;
