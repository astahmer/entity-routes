import { Box, BoxProps, useColorMode } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { forwardRef } from "react";

export const SideNavLink = forwardRef<any, SideNavLinkProps>(({ children, href, ...props }, ref) => {
    const { colorMode } = useColorMode();

    const router = useRouter();
    const isActive = router?.pathname?.replace(/\/$/, "").replace(/\bindex$/, "") === href.replace(/\/$/, "");

    return (
        <NextLink href={href} passHref>
            <Box
                ref={ref}
                href={href}
                as="a"
                cursor="pointer"
                display="block"
                mx={-2}
                px="2"
                py="1"
                transition="all 0.2s"
                outline="none"
                _focus={{ shadow: "outline" }}
                _notFirst={{ mt: 1 }}
                aria-current={isActive ? "page" : undefined}
                _hover={{ color: hoverColor[colorMode], transform: "translateX(4px)" }}
                {...(isActive && {
                    bg: activeBg[colorMode],
                    rounded: "sm",
                    color: activeColor[colorMode],
                    _hover: {},
                })}
                {...props}
            >
                {children}
            </Box>
        </NextLink>
    );
});

export type SideNavLinkProps = { href: string } & BoxProps;

const hoverColor = { light: "gray.900", dark: "whiteAlpha.900" };
const activeColor = { light: "gray.800", dark: "gray.200" };
const activeBg = { light: "gray.100", dark: "gray.700" };
