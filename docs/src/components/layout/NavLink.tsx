import { Box, BoxProps, useColorMode } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { ReactElement, cloneElement, forwardRef } from "react";

const NavLink = ({ children, ...props }: any) => {
    const router = useRouter();
    const pathname = router?.pathname || "";
    let isActive = false;

    if (pathname?.replace(/\/$/, "").replace(/\bindex$/, "") === props.href.replace(/\/$/, "")) {
        isActive = true;
    }

    return (
        <NextLink passHref {...props}>
            {typeof children === "function" ? children(isActive) : children}
        </NextLink>
    );
};

export type SideNavLinkProps = { icon?: ReactElement; href: string } & BoxProps;
export const SideNavLink = forwardRef<any, SideNavLinkProps>(({ children, icon, ...props }, ref) => {
    return (
        <Box
            ref={ref}
            as="a"
            mx={-2}
            display="flex"
            cursor="pointer"
            alignItems="center"
            px="2"
            py="1"
            transition="all 0.2s"
            outline="none"
            _focus={{ shadow: "outline" }}
            _notFirst={{ mt: 1 }}
            {...props}
        >
            {icon && cloneElement(icon, { mr: 3 })}
            <Box>{children}</Box>
        </Box>
    );
});

const hoverColor = { light: "gray.900", dark: "whiteAlpha.900" };
const activeColor = { light: "gray.800", dark: "gray.200" };
const activeBg = { light: "gray.100", dark: "gray.700" };
export const ComponentLink = forwardRef(({ href, ...props }: any, ref) => {
    const { colorMode } = useColorMode();

    return (
        <NavLink href={href}>
            {(isActive) => (
                <SideNavLink
                    ref={ref}
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    _hover={{ color: hoverColor[colorMode], transform: "translateX(4px)" }}
                    {...(isActive && {
                        bg: activeBg[colorMode],
                        rounded: "sm",
                        color: activeColor[colorMode],
                        _hover: {},
                    })}
                    {...props}
                />
            )}
        </NavLink>
    );
});
