import { Flex, useColorMode } from "@chakra-ui/react";
import { PropsWithChildren } from "react";

import { useLayoutConfig } from "@/components/layout/LayoutProvider";
import { DirectoryTree } from "@/functions/sidebar";

import { FooterButtons } from "./FooterButtons";
import NavBar from "./NavBar";
import { usePageContext } from "./PageProvider";
import { SideNav } from "./SideNav";
import { TableOfContents } from "./TableOfContents";

const SIDENAV_W = 280;
const SIDENAV_W_TABLET = 240;
const TABLE_OF_C_W = 300;
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
        <Flex
            direction="column"
            align="center"
            position="relative"
            w="100%"
            minHeight="100%"
            color={bodyColor[colorMode]}
            fontSize={fontSize}
            fontFamily={fontFamily}
            fontWeight={fontWeight}
        >
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
            <Flex justifyContent="center" width="100%" height="100%">
                <Flex maxWidth={maxPageWidth} width="100%" height="100%">
                    <SideNav
                        className="overflowScrollingTouch"
                        alignSelf="flex-start"
                        position="fixed"
                        top={NAVBAR_H}
                        bottom={0}
                        tree={sidebarTree}
                        width={[null, null, SIDENAV_W_TABLET, SIDENAV_W]}
                        display={["none", null, "block"]}
                        overflowY="auto"
                        overflowX="hidden"
                        fontSize="0.9em"
                    />
                    <Flex
                        as="main"
                        direction="column"
                        align="stretch"
                        width="100%"
                        maxWidth={[
                            null,
                            null,
                            `calc(100% - ${SIDENAV_W_TABLET}px)`,
                            null,
                            `calc(100% - ${SIDENAV_W}px - ${TABLE_OF_C_W}px)`,
                        ]}
                        minHeight="100%"
                        ml={["", null, SIDENAV_W_TABLET, SIDENAV_W]}
                        mt={[NAVBAR_H + "px"]}
                        className="mainContent overflowScrollingTouch"
                        px={["10px", null, "20px", "30px"]}
                        borderRightWidth="1px"
                        borderLeftWidth="1px"
                    >
                        {children}
                        <FooterButtons mt="60px !important" mb="2em !important" width="100%" />
                        {footer}
                    </Flex>
                    <TableOfContents
                        currentItem={currentItem}
                        items={tableOfContentsItems}
                        display={["none", null, null, null, "flex"]}
                        position="sticky"
                        px="20px"
                        top={NAVBAR_H}
                        alignSelf="flex-start"
                        ml="auto"
                        pt="20px"
                        opacity={0.8}
                        flexShrink={0}
                    />
                </Flex>
            </Flex>
        </Flex>
    );
}
