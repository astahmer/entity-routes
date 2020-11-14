import { Box, Flex, IconButton, useColorMode, Stack } from "@chakra-ui/react";
import { useLayoutConfig } from "@/components/layout/LayoutProvider";
import { DiGithubBadge } from "react-icons/di";
import MobileNav from "./MobileNav";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";

export const GithubLink = ({ url = "", ...rest }: any) => (
    <Box
        as="a"
        href={url}
        rel="noopener noreferrer"
        target="_blank"
        aria-label="Go to Chakra UI's Github Repo"
        outline="0"
        transition="all 0.2s"
        borderRadius="md"
        _focus={{ boxShadow: "outline" }}
        {...rest}
    >
        <Box as={DiGithubBadge} width="8" height="8" color="current" />
    </Box>
);

export const ColorModeSwitch = ({ ...rest }) => {
    const { colorMode, toggleColorMode } = useColorMode();
    return (
        <IconButton
            variant="ghost"
            color="current"
            fontSize="20px"
            aria-label={`Switch to ${colorMode === "light" ? "dark" : "light"} mode`}
            onClick={toggleColorMode}
            icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
            {...rest}
        />
    );
};

const NavBar = ({ logo, tree = null as any, items: navs, ...props }) => {
    const { colorMode } = useColorMode();
    const bg = { light: "white", dark: "gray.800" };
    const { maxPageWidth } = useLayoutConfig();
    return (
        <Flex
            bg={bg[colorMode]}
            zIndex={4}
            borderBottomWidth="1px"
            borderBottomStyle="solid"
            justifyContent="center"
            alignItems="center"
            {...props}
        >
            <Flex direction="column" maxWidth={maxPageWidth} as="header" width="full" justify="center">
                <Flex px="2" size="100%" align="center" justify="space-between">
                    <Flex align="center" mr={5}>
                        {logo}
                    </Flex>
                    <Flex flex={{ sm: "1", md: "none" }} ml={5} align="center" color="gray.500" justify="flex-end">
                        {Array.isArray(navs) ? (
                            <Stack direction="row" spacing="20px">
                                {navs.map((x, i) => (
                                    <Flex
                                        key={i}
                                        fontSize="text"
                                        alignItems="center"
                                        justify="center"
                                        fontWeight="medium"
                                    >
                                        {x}
                                    </Flex>
                                ))}
                            </Stack>
                        ) : (
                            navs
                        )}
                        {tree && <MobileNav tree={tree} />}
                    </Flex>
                </Flex>
            </Flex>
        </Flex>
    );
};

export default NavBar;
