import { useColorMode, theme, Box, CSSReset, Stack, Flex } from "@chakra-ui/core";
import { css, Global } from "@emotion/core";

import { FloatingTableOfContents, TableOfContentsContext, useDokzConfig } from "dokz";
import { DirectoryTree, globalStyles } from "dokz/dist/components/support";
import { PropagatedThemeProvider } from "dokz/dist/components/Wrapper";

import { SideNav } from "./SideNav";
import { useContext } from "react";
import { WrapperContext } from "../Wrapper";
import { FooterButtons } from "./FooterButtons";
import NavBar from "./NavBar";

const SIDENAV_W = 280;
const TABLE_OF_C_W = 200;

const NAVBAR_H = 62;

// Modified version of Wrapper taken from source directly at
// https://github.com/remorses/dokz/blob/7c642491cf/dokz/src/components/Wrapper.tsx
export function DokzWrapper(props) {
    const { tableOfContents } = props.meta || {};
    const {
        footer,
        headerLogo,
        headerItems,
        maxPageWidth,
        bodyColor,
        fontSize,
        fontWeight,
        fontFamily,
    } = useDokzConfig();
    const { sidebarTree } = useContext(WrapperContext);
    const { colorMode } = useColorMode();
    return (
        <PropagatedThemeProvider theme={theme}>
            <TableOfContentsContext.Provider value={{ tableOfContents }}>
                <CSSReset />
                <Global styles={globalStyles} />
                <Stack
                    className="dokz visibleInPrint noMarginInPrint"
                    align="center"
                    minHeight="100%"
                    color={bodyColor[colorMode]}
                    fontSize={fontSize}
                    fontFamily={fontFamily}
                    fontWeight={fontWeight}
                    // color={colorMode == 'dark' ? 'white' : black}
                >
                    <Box
                        className="dokz visibleInPrint"
                        minHeight="100%"
                        position="relative"
                        w="100%"
                        maxWidth={maxPageWidth}
                    >
                        <NavBar
                            className="dokz hiddenInPrint"
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
                            className="dokz hiddenInPrint"
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
                            className="dokz visibleInPrint noMarginInPrint"
                            align="stretch"
                            ml={["none", null, SIDENAV_W]}
                            // mr={['none', null, TABLE_OF_C_W + 30 + 'px']}
                            mt={[NAVBAR_H + "px"]}
                        >
                            <Stack
                                minHeight="100%"
                                className="dokz visibleInPrint mainContent"
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
                                    {props.children}
                                    <FooterButtons
                                        className="dokz hiddenInPrint"
                                        mt="60px !important"
                                        mb="2em !important"
                                        width="100%"
                                    />
                                    {footer}
                                </Flex>
                            </Stack>
                            <FloatingTableOfContents
                                className="dokz hiddenInPrint"
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
                                table={tableOfContents}
                            />
                        </Stack>
                    </Box>
                </Stack>
            </TableOfContentsContext.Provider>
        </PropagatedThemeProvider>
    );
}
export function getMdxSidebarTree(): DirectoryTree {
    try {
        return require("nextjs_root_folder_/sidebar.json");
    } catch (e) {
        return { name: "pages", children: [] };
    }
}
