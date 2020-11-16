import { Box, Flex, Stack, useColorMode } from "@chakra-ui/react";
import { PropsWithChildren } from "react";

import { useLayoutConfig } from "@/components/layout/LayoutProvider";
import { DirectoryTree } from "@/functions/sidebar";

import { FooterButtons } from "./FooterButtons";
import NavBar from "./NavBar";
import { usePageContext } from "./PageProvider";
import { SideNav } from "./SideNav";
import { TableOfContents } from "./TableOfContents";

const SIDENAV_W = 280;
const TABLE_OF_C_W = 200;
const NAVBAR_H = 62;
export const LAYOUT_SIZES = { SIDENAV_W, TABLE_OF_C_W, NAVBAR_H };

export function Wrapper({ children, currentItem }: PropsWithChildren<{ currentItem: DirectoryTree }>) {
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
    const { sidebarTree, tableOfContentsItems } = usePageContext();
    const { colorMode } = useColorMode();
    return (
        <Stack
            align="center"
            minHeight="100%"
            color={bodyColor[colorMode]}
            fontSize={fontSize}
            fontFamily={fontFamily}
            fontWeight={fontWeight}
        >
            <Box minHeight="100%" position="relative" w="100%" maxWidth={maxPageWidth}>
                <NavBar
                    logo={headerLogo}
                    items={headerItems}
                    tree={sidebarTree}
                    height={NAVBAR_H + "px"}
                    position="fixed"
                    width="100%"
                    top={0}
                    left={0}
                    right={0}
                />
                <SideNav
                    className="overflowScrollingTouch"
                    alignSelf="flex-start"
                    position="fixed"
                    top={NAVBAR_H}
                    bottom={0}
                    tree={sidebarTree}
                    width={SIDENAV_W}
                    display={["none", null, "block"]}
                    overflowY="auto"
                    overflowX="hidden"
                    fontSize="0.9em"
                />
                <Stack
                    direction="row"
                    minHeight="100%"
                    align="stretch"
                    ml={["", null, SIDENAV_W]}
                    mt={[NAVBAR_H + "px"]}
                >
                    <Stack
                        minHeight="100%"
                        className="mainContent overflowScrollingTouch"
                        direction="column"
                        align="stretch"
                        overflow="auto"
                        px={["10px", null, "20px", "30px"]}
                        flex="1"
                        minW="0"
                        borderRightWidth="1px"
                        borderLeftWidth="1px"
                    >
                        <Flex direction="column" align="stretch">
                            {children}
                            <FooterButtons mt="60px !important" mb="2em !important" width="100%" />
                            {footer}
                        </Flex>
                    </Stack>
                    <TableOfContents
                        fontSize="0.9em"
                        position="sticky"
                        alignSelf="flex-start"
                        top={NAVBAR_H}
                        width={TABLE_OF_C_W + "px"}
                        right={0}
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
    );
}
